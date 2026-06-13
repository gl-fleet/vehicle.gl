import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

type Params = {
    Ri:  number  // G1 → Joint1: right offset (in heading frame)
    Fr:  number  // G1 → Joint1: forward offset (in heading frame)
    Do:  number  // G1 → Joint1: downward offset
    C1:  number  // Joint1 → BoomTip: boom arm length
    C2:  number  // BoomTip → MastPivot: horizontal offset (perpendicular to mast)
    C3:  number  // MastPivot → GPS2: distance along mast axis (GPS2 is at top)
    C4:  number  // MastPivot → Bit: distance along mast axis downward
    BRi: number  // Bit → Target: lateral right offset (final result nudge)
    Mi:  number  // unused, kept for config compat
}

type Result = {
    params: Params
    G1: Vec3           // Cabin GPS (UTM)
    G2: Vec3           // Mast top GPS (UTM)
    Joint1: Vec3       // Boom base pivot (G1 + rigid offsets)
    BoomTip: Vec3      // End of boom arm (Joint1 + C1 along boom)
    MastPivot: Vec3    // Where boom arm meets mast
    MastAxis: Vec3     // Unit vector pointing UP along mast (MastPivot → G2)
    Bit: Vec3          // Drill bit (MastPivot - MastAxis * C4)
    Target: Vec3       // Bit + lateral BRi offset
    AzimuthDeg: number
    InclinationDeg: number
}

type ComputeArgs = Partial<Params> & { G1: Vec3; G2: Vec3 }

// ---- Vec3 helpers ----
const add  = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
const sub  = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
const mul  = (a: Vec3, k: number): Vec3 => [a[0]*k, a[1]*k, a[2]*k]
const dot  = (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
const len  = (a: Vec3): number => Math.sqrt(dot(a, a))
const dist = (a: Vec3, b: Vec3): number => len(sub(a, b))
const unit = (a: Vec3, eps = 1e-12): Vec3 => {
    const l = len(a)
    return l < eps ? [0, 0, 0] : mul(a, 1/l)
}
// Cross product
const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
]
// Project point X onto line (P + t*D)
const projectPointOntoLine = (X: Vec3, P: Vec3, D: Vec3): Vec3 => {
    const u = unit(D)
    const t = dot(sub(X, P), u)
    return add(P, mul(u, t))
}

export const computeTarget = (args: ComputeArgs): Result => {

    const { G1, G2, ...rest } = args

    const p: Params = {
        Mi:  8,
        Ri:  0.6,
        Fr:  0.25,
        Do:  1.6,
        BRi: 0.0,
        C1:  2.75,
        C2:  0.70,
        C3:  8.75,
        C4:  3.0,
        ...rest
    }

    // ------------------------------------------------------------------
    // Step 1: Cabin GPS → Joint1 (boom base pivot)
    //   Apply rigid offsets Ri (right), Fr (forward), Do (down)
    //   in the horizontal heading frame G1 → G2
    // ------------------------------------------------------------------
    const dxH = G2[0] - G1[0]
    const dyH = G2[1] - G1[1]
    const headingAngle = Math.atan2(dyH, dxH)

    const fwdX = Math.cos(headingAngle)
    const fwdY = Math.sin(headingAngle)
    // right = 90° clockwise from forward
    const rgtX =  fwdY
    const rgtY = -fwdX

    const Joint1: Vec3 = [
        G1[0] + p.Ri * rgtX - p.Fr * fwdX,
        G1[1] + p.Ri * rgtY - p.Fr * fwdY,
        G1[2] - p.Do
    ]

    // ------------------------------------------------------------------
    // Step 2: Find MastPivot
    //
    //   We know:
    //     - MastPivot is on the mast line through G2 (unknown axis yet)
    //     - dist(Joint1, MastPivot) = C1  (boom arm length)
    //     - dist(BoomTip, MastPivot) = C2  (horizontal offset boom tip → mast)
    //
    //   Since the mast is a straight rigid beam, and G2 is C3 above MastPivot
    //   along the mast axis, we need to find where the boom arm reaches.
    //
    //   Approach:
    //     a) The mast passes through G2 in some direction MastAxis
    //     b) MastPivot = G2 - MastAxis * C3
    //     c) dist(Joint1, MastPivot) = C1
    //
    //   We don't know MastAxis yet. But we can find MastPivot by:
    //     - Project Joint1 onto the vertical line through G2 (assuming
    //       mast is near-vertical, which is the dominant drilling case)
    //     - Then solve for the exact point using the C1 sphere constraint
    //
    //   Full solution: MastPivot lies on sphere(Joint1, C1).
    //   The mast line passes through G2. We parameterize:
    //     MastPivot = G2 + t * MastDir
    //   where MastDir is unknown. But we know the mast is a straight beam,
    //   so MastAxis = unit(G2 - MastPivot).
    //
    //   Since we have only 2 GPS points and the mast CAN tilt, we use
    //   the sphere-line intersection:
    //     The mast line passes through G2.
    //     We find the point on that line closest to Joint1 at distance C1.
    //
    //   The mast direction in 3D is constrained by G2 position and the
    //   fact that BoomTip (= Joint1 + boom vector to mast) is C2 from mast.
    //   
    //   Practical simplification that matches actual machine geometry:
    //     The boom arm (C1) connects Joint1 to BoomTip.
    //     BoomTip is C2 horizontally away from the mast centerline.
    //     MastPivot is the foot of the perpendicular from BoomTip onto mast.
    //
    //   So: find the point on the mast line (through G2, direction = mast axis)
    //   that is exactly C2 away from BoomTip, where BoomTip is on sphere(Joint1,C1).
    //
    //   Since the mast axis is what we are solving for, we use the known
    //   physical constraint: the mast is always in the vertical plane
    //   defined by Joint1 and G2 (the drill faces one direction).
    //   In that plane we solve the 2D geometry.
    // ------------------------------------------------------------------

    // Vertical plane through Joint1 and G2:
    // Horizontal direction (in XY) from Joint1 to G2 horizontal projection
    const g2h: Vec3 = [G2[0], G2[1], Joint1[2]]  // G2 projected to Joint1 height
    const horizVec = sub(g2h, Joint1)
    const horizDist = len(horizVec)
    const horizUnit: Vec3 = horizDist > 1e-9
        ? unit(horizVec)
        : [fwdX, fwdY, 0]

    // Work in 2D within the vertical plane:
    // axis s = along horizUnit (horizontal distance)
    // axis z = vertical
    // Joint1 is at (0, 0) in this 2D frame
    // G2 is at (horizDist, G2[2] - Joint1[2])

    const G2s = horizDist
    const G2z = G2[2] - Joint1[2]

    // MastPivot is at (Ps, Pz) in this plane, with:
    //   dist(Joint1, MastPivot) = C1   →  Ps² + Pz² = C1²
    //   MastPivot is on mast line through G2, direction (ms, mz) unit vector
    //   dist(MastPivot, G2) = C3       →  (Ps-G2s)² + (Pz-G2z)² = C3²
    //
    // Two circles intersection in 2D:
    //   Circle A: center (0,0),    radius C1
    //   Circle B: center (G2s,G2z), radius C3
    //
    const Ax = 0, Az = 0, Ra = p.C1
    const Bx = G2s, Bz = G2z, Rb = p.C3

    const dAB = Math.sqrt((Bx-Ax)**2 + (Bz-Az)**2)

    if (dAB > Ra + Rb + 1e-6 || dAB < Math.abs(Ra - Rb) - 1e-6) {
        throw new Error(
            `C1(${p.C1}) + C3(${p.C3}) = ${p.C1+p.C3} but Joint1→G2 dist in plane = ${dAB.toFixed(3)}m. ` +
            `Check C1/C3 offsets.`
        )
    }

    // Intersection point(s) of the two circles
    const a2d = (Ra*Ra - Rb*Rb + dAB*dAB) / (2*dAB)
    const h2d = Math.sqrt(Math.max(0, Ra*Ra - a2d*a2d))

    // Midpoint along line A→B
    const mx2d = Ax + a2d*(Bx-Ax)/dAB
    const mz2d = Az + a2d*(Bz-Az)/dAB

    // Perpendicular direction in 2D plane (s,z)
    const px2d = -(Bz-Az)/dAB
    const pz2d =  (Bx-Ax)/dAB

    // Two candidate MastPivots in 2D — pick the one on the correct side
    // (the mast pivot should be below G2, i.e. lower z)
    const cand1s = mx2d + h2d*px2d,  cand1z = mz2d + h2d*pz2d
    const cand2s = mx2d - h2d*px2d,  cand2z = mz2d - h2d*pz2d

    // Pick candidate with lower z (pivot is below GPS2 top)
    const [Ps, Pz] = cand1z < cand2z
        ? [cand1s, cand1z]
        : [cand2s, cand2z]

    // Back to 3D
    const MastPivot: Vec3 = [
        Joint1[0] + Ps * horizUnit[0],
        Joint1[1] + Ps * horizUnit[1],
        Joint1[2] + Pz
    ]

    // BoomTip: Joint1 toward MastPivot, length C1
    const BoomTip: Vec3 = add(Joint1, mul(unit(sub(MastPivot, Joint1)), p.C1))

    // ------------------------------------------------------------------
    // Step 3: Mast axis = unit vector from MastPivot → G2
    // ------------------------------------------------------------------
    const MastAxis = unit(sub(G2, MastPivot))

    // ------------------------------------------------------------------
    // Step 4: Bit = MastPivot - MastAxis * C4  (go DOWN from pivot)
    // ------------------------------------------------------------------
    const Bit: Vec3 = sub(MastPivot, mul(MastAxis, p.C4))

    // ------------------------------------------------------------------
    // Step 5: Target = Bit + lateral BRi offset (right in heading frame)
    // ------------------------------------------------------------------
    const rightVec3D: Vec3 = [rgtX, rgtY, 0]
    const Target: Vec3 = add(Bit, mul(rightVec3D, p.BRi))

    // ------------------------------------------------------------------
    // Step 6: Orientation angles
    // ------------------------------------------------------------------
    // Azimuth of the drill (horizontal heading G1→G2), 0=North, CW
    const AzimuthRad   = Math.atan2(dxH, dyH)
    const AzimuthDeg   = ((AzimuthRad * 180 / Math.PI) + 360) % 360

    // Inclination of mast from vertical (0 = straight down drill)
    // MastAxis points UP, so -MastAxis points down (drill direction)
    const drillDir: Vec3 = mul(MastAxis, -1)
    const InclinationDeg = (Math.acos(Math.max(-1, Math.min(1, -drillDir[2]))) * 180 / Math.PI)

    return {
        params: p,
        G1, G2,
        Joint1,
        BoomTip,
        MastPivot,
        MastAxis,
        Bit,
        Target,
        AzimuthDeg,
        InclinationDeg,
    }
}

// ----------------------------------------------------------------

export class Calculus {

    callback = (...n: any) => true
    cfg: any = {}

    constructor(config: any) {
        const { gps1, gps2, type, offset, host } = config
        for (let i = 0; i < offset.length; i++) offset[i] = Number(offset[i])
        // offset order: Ri, Fr, Do, BRi, C1, C2, C3, C4
        const [Ri, Fr, Do, BRi, C1, C2, C3, C4] = offset
        this.cfg = {
            Ri, Fr, Do, BRi, C1, C2, C3, C4,
            type: type ?? [],
            left:  Number(gps1[2]),
            right: Number(gps2[2]),
            host:  host[0],
            port:  Number(host[1]),
        }
        console.log('[Calculus] config:', this.cfg)
    }

    on = (cb: any) => { this.callback = cb }

    getUTMZone = (lat: number, lon: number) => {
        const zoneNumber = Math.floor((lon + 180) / 6) + 1
        const letters    = "CDEFGHJKLMNPQRSTUVWX"
        const zoneLetter = (lat >= -80 && lat <= 84)
            ? letters[Math.floor((lat + 80) / 8)]
            : 'Z'
        return { zoneNumber, zoneLetter }
    }

    cn  = (X: Vec3) => ({ x: X[0], y: X[1], z: X[2] })
    mid = (A: Vec3, B: Vec3) => ({
        x: (A[0]+B[0])/2, y: (A[1]+B[1])/2, z: (A[2]+B[2])/2
    })
    distance3D = (a: Vec3, b: Vec3) =>
        Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2 + (b[2]-a[2])**2)

    calculate = ({ gps1, gps2 }: any) => {
        try {
            const altitude = this.cfg.type[1] ?? 'ele'
            const { zoneNumber, zoneLetter } = this.getUTMZone(gps1.lat, gps1.lon)

            gps1.egm = egm96.ellipsoidToEgm96(gps1.lat, gps1.lon, gps1.ele)
            gps2.egm = egm96.ellipsoidToEgm96(gps2.lat, gps2.lon, gps2.ele)

            const G1: Vec3 = [gps1.est, gps1.nrt, gps1[altitude]]
            const G2: Vec3 = [gps2.est, gps2.nrt, gps2[altitude]]

            const out = computeTarget({ G1, G2, ...this.cfg })

            const heading = Math.atan2(G2[1]-G1[1], G2[0]-G1[0]) - Math.PI/2

            const { lat, lng } = Utm.convertUtmToLatLng(
                out.Target[0], out.Target[1], `${zoneNumber}`, zoneLetter
            )

            const dist_act = Number((this.distance3D(G1, G2) * 100).toFixed(2))

            return {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng, out.Target[2]],
                A: [out.Target[0],   out.Target[1],   out.Target[2]],
                B: [out.G2[0],       out.G2[1],       out.G2[2]],
                C: [out.Bit[0],      out.Bit[1],      out.Bit[2]],
                status: {
                    dist_tar:    dist_act,
                    dist_act:    dist_act,
                    azimuth:     Number(out.AzimuthDeg.toFixed(2)),
                    inclination: Number(out.InclinationDeg.toFixed(2)),
                    zoneNumber,
                    zoneLetter,
                    rtcm: `${this.cfg.host}:${this.cfg.port}`,
                },
                shapes: {
                    points: [
                        out.G1, out.G2,
                        out.Joint1, out.BoomTip, out.MastPivot,
                        out.Bit, out.Target
                    ],
                    colored: {
                        'green': [out.G1, out.G2],
                        'red':   [out.Joint1, out.BoomTip, out.MastPivot],
                        'blue':  [out.Bit, out.Target],
                    },
                    lines: [
                        [out.G1,       out.Joint1],    // cabin GPS → boom base
                        [out.Joint1,   out.BoomTip],   // boom base → boom tip
                        [out.BoomTip,  out.MastPivot], // boom tip → mast pivot
                        [out.MastPivot, out.G2],       // mast pivot → GPS2 (up)
                        [out.MastPivot, out.Bit],      // mast pivot → bit (down)
                        [out.Bit,      out.Target],    // bit → target (BRi)
                    ]
                },
                camera: (() => {
                    // Exact same P0/P1/P2/P3 as original code
                    const P0: Vec3 = [G1[0], G1[1], G1[2] - out.params.Do]
                    const P1: Vec3 = [G2[0], G2[1], P0[2]]
                    const dx = P1[0] - P0[0]
                    const dy = P1[1] - P0[1]
                    const D1 = Math.sqrt(dx*dx + dy*dy)
                    const U: Vec3 = D1 === 0 ? [0,1,0] : [-dy/D1, dx/D1, 0]
                    const E: Vec3 = D1 === 0 ? [1,0,0] : [ dx/D1, dy/D1, 0]
                    const Alp = D1 === 0 ? 0 : (out.params.Ri * out.params.Ri) / D1
                    const Bet = Math.sqrt(Math.max(0, Alp * (D1 - Alp)))
                    const P2: Vec3 = [P0[0]+E[0]*Alp-U[0]*Bet, P0[1]+E[1]*Alp-U[1]*Bet, P0[2]]
                    const P3: Vec3 = [P1[0]-E[0]*Alp+U[0]*Bet, P1[1]-E[1]*Alp+U[1]*Bet, P1[2]]
                    return {
                        TL: this.cn(P3), TM: this.mid(P3, P1), TR: this.cn(P1),
                        BL: this.cn(P0), BM: this.mid(P0, P2), BR: this.cn(P2),
                    }
                })()
            }

        } catch (err: any) {
            log.error(`[Calculus] While parsing GPS: ${err.message}`)
            return null
        }
    }
}