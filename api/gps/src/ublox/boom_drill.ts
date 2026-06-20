import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

type Params = {
    G1: Vec3
    G2: Vec3
    Mi: number
    Ri: number
    Fr: number
    Do: number
    BRi: number
    C1: number
    C2: number
    C3: number
    C4: number
}

type SphereCircle = {
    center: Vec3
    radius: number
    normal: Vec3
}

type Result = {
    params: Params
    G1: Vec3
    G2: Vec3
    D0: number
    P0: Vec3
    P1: Vec3
    D1: number
    U: Vec3
    E: Vec3
    Alp: number
    Bet: number
    P2: Vec3
    P3: Vec3
    G3: Vec3
    G4: Vec3
    I0: SphereCircle
    IS: Vec3
    P4: Vec3
    P5: Vec3
    I1: SphereCircle
    IS0: Vec3
    P6: Vec3
    Bit: Vec3
    UB: Vec3
    Target: Vec3
}

type ComputeArgs = Partial<Params> & {
    G1: Vec3
    G2: Vec3
}

export const computeTarget = (args: ComputeArgs): Result => {

    const p: Params = {
        Mi: 8,
        Ri: 1,
        Fr: 2,
        Do: 1.8,
        BRi: 0.5,
        C1: 2,
        C2: 0.6,
        C3: 10,
        C4: 1.4,
        ...args
    }

    // ---- Vec helpers (arrays) ----
    const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
    const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
    const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const len = (a: Vec3): number => Math.sqrt(dot(a, a))
    const dist = (a: Vec3, b: Vec3): number => len(sub(a, b))

    const unit = (a: Vec3, eps = 1e-12): Vec3 => {
        const l = len(a)
        if (l < eps) return [0, 0, 0]
        return mul(a, 1 / l)
    }

    // Plane: dot(Q - P0, nHat) = 0  -> projection of X onto plane
    const projectPointToPlane = (X: Vec3, P0: Vec3, nHat: Vec3): Vec3 => {
        const v = sub(X, P0)
        const d = dot(v, nHat)
        return sub(X, mul(nHat, d))
    }

    // Intersection circle of two spheres (analytic)
    const sphereSphereIntersectionCircle = (
        c0: Vec3,
        r0: number,
        c1: Vec3,
        r1: number,
        eps = 1e-12
    ): SphereCircle | null => {
        const dVec = sub(c1, c0)
        const d = len(dVec)

        if (d < eps) return null
        if (d > r0 + r1 + eps) return null
        if (d < Math.abs(r0 - r1) - eps) return null

        const nHat = mul(dVec, 1 / d)

        const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
        const center = add(c0, mul(nHat, a))

        const h2 = r0 * r0 - a * a
        const radius = Math.sqrt(Math.max(0, h2))

        return { center, radius, normal: nHat }
    }

    // ---- Inputs ----
    const G1 = p.G1
    const G2 = p.G2

    // ---- Generatable ----
    const D0 = dist(G1, G2)

    const P0: Vec3 = [G1[0], G1[1], G1[2] - p.Do]
    const P1: Vec3 = [G2[0], G2[1], P0[2]]

    const D1 = dist(P0, P1)

    const dx = P1[0] - P0[0]
    const dy = P1[1] - P0[1]

    const U: Vec3 = D1 === 0 ? [0, 0, 0] : [-dy / D1, dx / D1, 0]
    const E: Vec3 = D1 === 0 ? [0, 0, 0] : [dx / D1, dy / D1, 0]

    const Alp = D1 === 0 ? 0 : (p.Ri * p.Ri) / D1

    // Bet = sqrt(Alp * (D1 - Alp))  (assumed missing '*')
    const Bet = Math.sqrt(Math.max(0, Alp * (D1 - Alp)))

    const P2 = sub(add(P0, mul(E, Alp)), mul(U, Bet))
    const P3 = add(sub(P1, mul(E, Alp)), mul(U, Bet))

    const P2P1u = unit(sub(P1, P2))

    const G3 = add(P2, mul(P2P1u, p.Fr))
    const G4 = add(P2, mul(P2P1u, 10))

    // ---- Sphere intersections ----
    const I0raw = sphereSphereIntersectionCircle(G3, p.C1, G2, p.C3)
    if (!I0raw) throw new Error("Spheres S0 and S1 do not intersect (I0 is null). Check inputs.")

    const I0: SphereCircle = I0raw
    const R0 = I0.radius
    const P4 = I0.center
    const N = I0.normal

    const IS = projectPointToPlane(G4, P4, N)

    const V0 = sub(IS, P4)
    let V0u = unit(V0)

    if (len(V0u) === 0) {
        V0u = unit([N[1], -N[0], 0])
        if (len(V0u) === 0) V0u = unit([0, N[2], -N[1]])
    }

    const P5 = add(P4, mul(V0u, R0))

    const I1raw = sphereSphereIntersectionCircle(G2, p.C3, P5, p.C2)

    if (!I1raw) throw new Error("Spheres S1 and S2 do not intersect (I1 is null). Check inputs.")

    const I1: SphereCircle = I1raw
    const PL0_center = I1.center
    const N0 = I1.normal

    const IS0 = projectPointToPlane(G4, PL0_center, N0)

    const V1u = unit(sub(IS0, P5))

    if (len(V1u) === 0) throw new Error("Projection produced zero vector for V1; cannot normalize.")

    const P6 = add(P5, mul(V1u, p.C2))

    const Bit = add(P6, mul(unit(sub(P6, G2)), p.C4))

    const UB = unit(sub(P1, P3))

    const Target = add(Bit, mul(UB, p.BRi))

    return {
        params: p,
        G1, G2,
        D0,
        P0, P1, D1,
        U, E, Alp, Bet,
        P2, P3, P4,
        G3, G4,
        I0: { center: P4, radius: R0, normal: N },
        IS, P5,
        I1: { center: I1.center, radius: I1.radius, normal: N0 },
        IS0, P6,
        Bit,
        UB,
        Target
    }
}

export class Calculus {

    callback = (...n: any) => true
    cfg: any = {}
    settings: any = {}

    constructor(config: any) {

        const { gps1, gps2, type, offset, host } = config

        for (let i = 0; i < offset.length; i++) offset[i] = Number(offset[i])
        const [Ri, Fr, Do, BRi, C1, C2, C3, C4] = offset
        this.cfg = {
            Ri, Fr, Do, BRi, C1, C2, C3, C4, i: 0,
            type: type ?? [],
            left: Number(gps1[2]),
            right: Number(gps2[2]),
            host: host[0],
            port: Number(host[1]),
        }
        console.log(this.cfg)

    }

    on = (cb: any) => { this.callback = cb }

    getUTMZone = (lat: number, lon: number) => {

        // Calculate UTM Zone Number
        const zoneNumber = Math.floor((lon + 180) / 6) + 1
        // Calculate UTM Zone Letter
        const letters = "CDEFGHJKLMNPQRSTUVWX" // UTM zone letters (I and O are skipped)
        let zoneLetter = ''
        if (lat >= -80 && lat <= 84) zoneLetter = letters[Math.floor((lat + 80) / 8)]
        else zoneLetter = 'Z' // Outside UTM limits
        return { zoneNumber, zoneLetter }

    }

    cn = (X: Vec3) => ({ x: X[0], y: X[1], z: X[2] })
    mid = (A: Vec3, B: Vec3) => ({ x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, z: (A[2] + B[2]) / 2 })
    distance3D = (a: Vec3, b: Vec3) => Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2)

    /** Final calculation **/
    calculate = ({ gps1, gps2 }: any) => {

        try {

            const altitude = this.cfg.type[1] ?? 'ele'
            const { zoneNumber, zoneLetter } = this.getUTMZone(gps1.lat, gps1.lon)
            gps1.egm = egm96.ellipsoidToEgm96(gps1.lat, gps1.lon, gps1.ele)
            gps2.egm = egm96.ellipsoidToEgm96(gps2.lat, gps2.lon, gps2.ele)

            const G1: Vec3 = [gps1.est, gps1.nrt, gps1[altitude]]
            const G2: Vec3 = [gps2.est, gps2.nrt, gps2[altitude]]
            const distance = this.distance3D(G1, G2)
            const out = computeTarget({ G1, G2, ...this.cfg })
            const { P1, P2 } = out

            // P2 to P1
            const heading = (Math.atan2(P1[1] - P2[1], P1[0] - P2[0]) * 180 / Math.PI) * (Math.PI / 180) - (Math.PI / 2)
            const { lat, lng } = Utm.convertUtmToLatLng(out.Target[0], out.Target[1], `${zoneNumber}`, zoneLetter)

            return {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng, out.Target[2]],
                A: [out.Target[0], out.Target[1], out.Target[2]],
                B: [out.G2[0], out.G2[1], out.G2[2]],
                C: [out.Bit[0], out.Bit[1], out.Bit[2]],
                status: {
                    dist_tar: Number((distance * 100).toFixed(2)),
                    dist_act: Number((distance * 100).toFixed(2)),
                    zoneNumber,
                    zoneLetter,
                    rtcm: `${this.cfg.host}:${this.cfg.port}`,
                },
                shapes: {
                    points: [
                        out.G1, out.G2, out.G3,
                        out.P0, out.P1, out.P2, out.P3, out.P4, out.P5, out.P6,
                        out.Bit, out.Target
                    ],
                    colored: {
                        'green': [out.G1, out.G2, out.G3],
                        'red': [out.P0, out.P1, out.P2, out.P3, out.P4, out.P5, out.P6],
                        'blue': [out.Bit, out.Target],
                    },
                    lines: [
                        [out.P0, out.P2],
                        [out.G3, out.P5],
                        [out.P5, out.P6],
                        [out.G2, out.P6],
                        [out.P6, out.Bit],
                        [out.Bit, out.Target],
                    ]
                },
                camera: {
                    TL: this.cn(out.P3), TM: this.mid(out.P3, out.P1), TR: this.cn(out.P1),
                    BL: this.cn(out.P0), BM: this.mid(out.P0, out.P2), BR: this.cn(out.P2),
                }
            }

        } catch (err: any) {

            log.error(`While parsing GPS: ${err.message}`)
            return null

        }

    }

}