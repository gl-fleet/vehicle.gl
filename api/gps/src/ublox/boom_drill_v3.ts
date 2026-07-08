import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import { Connection } from 'unet'

import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

// Build an N-sized 3D square from an HWT905 (tilt) + two RTK GPS antennas
// (heading), copy it distance M to top and bottom along the plane normal,
// and derive the drilling angles (azimuth / inclination / dip) of the hole.
//
//   x, y, z : HWT905 roll, pitch, yaw in DEGREES  (z is ignored - see note)
//   gps1    : [east, north, elevation]  antenna 1
//   gps2    : [east, north, elevation]  antenna 2
//   size    : side length of the square (same units as GPS, e.g. metres)
//   m       : offset distance to top and bottom, along the plane normal
//
// Frame: ENU (x=East, y=North, z=Up). Heading/azimuth are cw from North.

type ENU = [number, number, number] // [east, north, elevation]
type Corners = [ENU, ENU, ENU, ENU]

interface Drill {
    vector: ENU // unit vector pointing DOWN the hole (sensor +Z)
    azimuth: number | null // deg cw from North; null when the hole is vertical
    inclination: number // deg from vertical (0 = vertical, 90 = horizontal)
    dip: number // deg below horizontal (90 = vertical, 0 = horizontal)
    isVertical: boolean
}

interface Prism {
    heading: number // rig heading, deg cw from North (from GPS baseline)
    origin: ENU // antenna midpoint (centre of the middle square)
    normal: ENU // unit normal, points along the sensor's up-face
    middle: Corners
    top: Corners
    bottom: Corners
    drill: Drill
}

const rad = (d: number): number => (d * Math.PI) / 180
const deg = (r: number): number => (r * 180) / Math.PI
const clamp = (v: number): number => Math.max(-1, Math.min(1, v))

const generateSquare = (
    x: number,
    y: number,
    z: number,
    gps1: ENU,
    gps2: ENU,
    size = 1,
    m = 0.5
): Prism => {
    // --- heading from the two antennas (cw from North) ---
    const dE = gps2[0] - gps1[0]
    const dN = gps2[1] - gps1[1]
    const heading = Math.atan2(dE, dN)

    // --- roll & pitch from HWT905, yaw from GPS heading ---
    const roll = rad(x)
    const pitch = rad(-y)
    const yaw = heading

    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const cr = Math.cos(roll), sr = Math.sin(roll)

    const R = [
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
        [-sp, cp * sr, cp * cr]
    ]

    const origin: ENU = [
        (gps1[0] + gps2[0]) / 2,
        (gps1[1] + gps2[1]) / 2,
        (gps1[2] + gps2[2]) / 2
    ]

    const rotate = ([bx, by, bz]: ENU): ENU => {
        const north = R[0][0] * bx + R[0][1] * by + R[0][2] * bz
        const east = R[1][0] * bx + R[1][1] * by + R[1][2] * bz
        const down = R[2][0] * bx + R[2][1] * by + R[2][2] * bz
        return [east, north, -down]
    }

    const normal = rotate([0, 0, -1]) // sensor up-face

    const h = size / 2
    const cornersBody: ENU[] = [
        [h, h, 0],
        [h, -h, 0],
        [-h, -h, 0],
        [-h, h, 0]
    ]

    const middle = cornersBody.map((c): ENU => {
        const [e, n, u] = rotate(c)
        return [e + origin[0], n + origin[1], u + origin[2]]
    }) as Corners

    const shift = (sq: Corners, s: number): Corners =>
        sq.map(([e, n, u]): ENU => [
            e + s * normal[0],
            n + s * normal[1],
            u + s * normal[2]
        ]) as Corners

    // --- drilling angles from the down-the-hole axis (sensor +Z) ---
    const vector = rotate([0, 0, 1]) // down the hole
    const [vE, vN, vU] = vector
    const horiz = Math.hypot(vE, vN)
    const isVertical = horiz < 1e-9
    const azimuth = isVertical ? null : (deg(Math.atan2(vE, vN)) + 360) % 360
    const inclination = deg(Math.acos(clamp(-vU))) // from vertical
    const dip = 90 - inclination // below horizontal

    return {
        heading: (deg(heading) + 360) % 360,
        origin,
        normal,
        middle,
        top: shift(middle, m),
        bottom: shift(middle, -m),
        drill: { vector, azimuth, inclination, dip, isVertical }
    }
}

export { generateSquare }
export type { ENU, Corners, Drill, Prism }

export class Calculus {

    cfg: any = {}
    callback = (...n: any) => true

    constructor(config: any) {

        this.cfg.type = config.type
        this.cfg.dst = Number(config.dst)
        this.cfg.ofs = config.ofs.map((n: string) => n === '-' ? '-' : Number(n))
        this.cfg.head = Number(config.head)
        this.cfg.bit = Number(config.bit)
        this.cfg.tilt = config.tilt.map((n: string) => Number(n))

        console.log(this.cfg)

        const isDev = config.mode === 'development'

        const IOT = new Connection({ name: 'iot', proxy: isDev ? 'https://dl429-gantulgak.as2.pitunnel.com' : undefined, rejectUnauthorized: false })

        IOT.on('sensors', (sensors: any) => { this.cfg.sensors = sensors })

    }

    on = (cb: any) => { this.callback = cb }
    cn = (X: Vec3) => ({ x: X[0], y: X[1], z: X[2] })
    mid = (A: Vec3, B: Vec3) => ({ x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, z: (A[2] + B[2]) / 2 })
    distance3D = (a: Vec3, b: Vec3) => Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2)
    getUTMZone = (lat: number, lon: number) => {
        const zoneNumber = Math.floor((lon + 180) / 6) + 1
        const letters = "CDEFGHJKLMNPQRSTUVWX"
        const zoneLetter = (lat >= -80 && lat <= 84) ? letters[Math.floor((lat + 80) / 8)] : 'Z'
        return { zoneNumber, zoneLetter }
    }
    findPointInVector = (A: Vec3, B: Vec3, r: number) => {
        const d = this.distance3D(A, B)
        return {
            x: (A[0] + ((B[0] - A[0]) / d) * r),
            y: (A[1] + ((B[1] - A[1]) / d) * r),
            z: (A[2] + ((B[2] - A[2]) / d) * r)
        }
    }

    calculate = ({ gps1, gps2 }: any) => {

        try {

            const altitude = this.cfg.type[1] ?? 'ele'
            const { zoneNumber, zoneLetter } = this.getUTMZone(gps1.lat, gps1.lon)

            gps1.egm = egm96.ellipsoidToEgm96(gps1.lat, gps1.lon, gps1.ele)
            gps2.egm = egm96.ellipsoidToEgm96(gps2.lat, gps2.lon, gps2.ele)

            const G1: Vec3 = [gps1.est, gps1.nrt, gps1[altitude]]
            const G2: Vec3 = [gps2.est, gps2.nrt, gps2[altitude]]

            const heading = Math.atan2(G2[1] - G1[1], G2[0] - G1[0])
            const mid = this.mid(G1, G2)

            this.cfg.mid = mid
            this.cfg.heading = heading
            this.cfg.g1 = `${gps1.fix},${gps1.hac}`
            this.cfg.g2 = `${gps2.fix},${gps2.hac}`

            const { x, y, z } = this.cfg.sensors.axis
            const [_x, _y, _z] = this.cfg.tilt

            this.cfg.sqr = generateSquare((x + _x), (y + _y), (z + _z), G1, G2, this.cfg.dst / 100, this.cfg.bit / 100)

            const [to_right, to_front] = this.cfg.ofs
            // const to_right = 13.5, to_front = 45.5

            const b = this.cfg.sqr.bottom

            const p0 = this.findPointInVector(this.cfg.sqr.middle[2], this.cfg.sqr.middle[1], to_right / 100)
            const p1 = this.findPointInVector(this.cfg.sqr.middle[3], this.cfg.sqr.middle[0], to_right / 100)
            const g0 = this.findPointInVector([p1.x, p1.y, p1.z], [p0.x, p0.y, p0.z], to_front / 100)

            const k0 = this.findPointInVector(this.cfg.sqr.bottom[2], this.cfg.sqr.bottom[1], to_right / 100)
            const k1 = this.findPointInVector(this.cfg.sqr.bottom[3], this.cfg.sqr.bottom[0], to_right / 100)
            const g1 = this.findPointInVector([k1.x, k1.y, k1.z], [k0.x, k0.y, k0.z], to_front / 100)

            const { lat, lng } = Utm.convertUtmToLatLng(g1.x, g1.y, `${zoneNumber}`, zoneLetter)

            const res = {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng,],
                A: [g1.x, g1.y, g1.z],
                B: G1,
                C: G2,
                status: {
                    dist_tar: this.cfg.dst,
                    dist_act: this.distance3D(G1, G2) * 100,
                    dist_dif: Number((this.cfg.dst - (this.distance3D(G1, G2) * 100)).toFixed(1)),
                    azimuth: 0,
                    inclination: 0,
                    zoneNumber,
                    zoneLetter,
                    rtcm: `${this.cfg.host}:${this.cfg.port}`,
                },
                shapes: {
                    colored: {
                        'red': [G1],
                        'green': [G2],
                        'orange': [[mid.x, mid.y, mid.z]],
                        'grey': this.cfg.sqr.top,
                        'blue': this.cfg.sqr.middle,

                        'white': [b[0]],
                        'black': [b[1]],
                        'brown': [b[2]],
                        'yellow': [b[3]],

                        'purple': [[g0.x, g0.y, g0.z], [g1.x, g1.y, g1.z]],
                    },
                    lines: [
                        [[g0.x, g0.y, g0.z], [g1.x, g1.y, g1.z]]
                    ]
                },
                camera: {
                    TL: this.cn(b[2]), TM: this.mid(b[2], b[1]), TR: this.cn(b[1]),
                    BL: this.cn(b[3]), BM: this.mid(b[3], b[0]), BR: this.cn(b[0]),
                }
            }

            return res

            /* const heading = Math.atan2(G2[1] - G1[1], G2[0] - G1[0]) - Math.PI / 2

            const { lat, lng } = Utm.convertUtmToLatLng(out.Target[0], out.Target[1], `${zoneNumber}`, zoneLetter)

            const dist_act = Number((this.distance3D(G1, G2) * 100).toFixed(2))

            return {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng, out.Target[2]],
                A: [out.Target[0], out.Target[1], out.Target[2]],
                B: [out.G2[0], out.G2[1], out.G2[2]],
                C: [out.Bit[0], out.Bit[1], out.Bit[2]],
                status: {
                    dist_tar: dist_act,
                    dist_act: dist_act,
                    azimuth: Number(out.AzimuthDeg.toFixed(2)),
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
                        'red': [out.Joint1, out.BoomTip, out.MastPivot],
                        'blue': [out.Bit, out.Target],
                    },
                    lines: [
                        [out.G1, out.Joint1],    // cabin GPS → boom base
                        [out.Joint1, out.BoomTip],   // boom base → boom tip
                        [out.BoomTip, out.MastPivot], // boom tip → mast pivot
                        [out.MastPivot, out.G2],       // mast pivot → GPS2 (up)
                        [out.MastPivot, out.Bit],      // mast pivot → bit (down)
                        [out.Bit, out.Target],    // bit → target (BRi)
                    ]
                },
                camera: (() => {
                    // Exact same P0/P1/P2/P3 as original code
                    const P0: Vec3 = [G1[0], G1[1], G1[2] - out.params.Do]
                    const P1: Vec3 = [G2[0], G2[1], P0[2]]
                    const dx = P1[0] - P0[0]
                    const dy = P1[1] - P0[1]
                    const D1 = Math.sqrt(dx * dx + dy * dy)
                    const U: Vec3 = D1 === 0 ? [0, 1, 0] : [-dy / D1, dx / D1, 0]
                    const E: Vec3 = D1 === 0 ? [1, 0, 0] : [dx / D1, dy / D1, 0]
                    const Alp = D1 === 0 ? 0 : (out.params.Ri * out.params.Ri) / D1
                    const Bet = Math.sqrt(Math.max(0, Alp * (D1 - Alp)))
                    const P2: Vec3 = [P0[0] + E[0] * Alp - U[0] * Bet, P0[1] + E[1] * Alp - U[1] * Bet, P0[2]]
                    const P3: Vec3 = [P1[0] - E[0] * Alp + U[0] * Bet, P1[1] - E[1] * Alp + U[1] * Bet, P1[2]]
                    return {
                        TL: this.cn(P3), TM: this.mid(P3, P1), TR: this.cn(P1),
                        BL: this.cn(P0), BM: this.mid(P0, P2), BR: this.cn(P2),
                    }
                })()
            } */

        } catch (err: any) {
            log.error(`[Calculus] While parsing GPS: ${err.message}`)
            return null
        }
    }
}