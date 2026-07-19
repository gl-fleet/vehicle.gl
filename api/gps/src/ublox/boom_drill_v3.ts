import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import { Connection } from 'unet'

import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

const drill2 = (A: Vec3, B: Vec3, X: number, Y: number, S: number, L: number, TR: number, TF: number) => {

    const r = Math.PI / 180, Xr = X * r, Yr = Y * r
    const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]]
    const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const mix = (a: Vec3, b: Vec3, c: number, s: number): Vec3 => [a[0] * c + b[0] * s, a[1] * c + b[1] * s, a[2] * c + b[2] * s]

    const M: Vec3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
    const hl = Math.hypot(B[0] - A[0], B[1] - A[1])
    const u0: Vec3 = [(B[0] - A[0]) / hl, (B[1] - A[1]) / hl, 0]
    const f0: Vec3 = [-u0[1], u0[0], 0]

    const f = mix(f0, [0, 0, 1], Math.cos(Yr), -Math.sin(Yr))     // +Y: front down
    const uT = mix(u0, cross(u0, f), Math.cos(Xr), -Math.sin(Xr)) // +X: B side down
    const nrm = cross(uT, f)

    const h = S / 2, q = [[-1, 1], [1, 1], [-1, -1], [1, -1]]
    const top = q.map(([a, b]) => add(add(M, uT, a * h), f, b * h))    // sq0..sq3
    const bottom = top.map(p => add(p, nrm, -L))                        // r0..r3
    const Pt = add(add(top[2], uT, TR), f, TF)
    const Pb = add(Pt, nrm, -L)
    const camera = q.map(([a, b]) => add(add(Pb, u0, a * S), f0, b * S)) // c0..c3

    return { top, bottom, Pt, Pb, camera }

}

const drill3 = (A: Vec3, B: Vec3, q: number[], S: number, L: number, TR: number, TF: number) => {
    const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]]
    const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

    const M: Vec3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
    const hl = Math.hypot(B[0] - A[0], B[1] - A[1])
    if (hl < 1e-9) return null                               // guard: coincident GPS
    const u0: Vec3 = [(B[0] - A[0]) / hl, (B[1] - A[1]) / hl, 0]     // heading (East/North)
    const f0: Vec3 = [-u0[1], u0[0], 0]

    // --- tilt straight from the quaternion (no X/Y reconstruction) ---
    const [q0, q1, q2, q3] = q
    const n = Math.hypot(q0, q1, q2, q3) || 1
    const w = q0 / n, x = q1 / n, y = q2 / n, z = q3 / n
    // sensor "down the hole" axis in the sensor's own frame; heading comes from GPS
    const heading = Math.atan2(u0[0], u0[1])                 // cw from North
    const qyaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    const d = heading - qyaw, cd = Math.cos(d), sd = Math.sin(d)
    // drill axis = body -Z rotated by q, then yaw-aligned to GPS heading, into ENU
    let dx = 2 * (x * z + w * y), dy = 2 * (y * z - w * x), dz = 1 - 2 * (x * x + y * y)
    dx = -dx; dy = -dy; dz = -dz                             // -Z = down the hole
    const nrm: Vec3 = [dx * cd - dy * sd, dx * sd + dy * cd, dz]     // yaw-align into ENU

    // in-plane axes perpendicular to the drill axis, for the square
    const f: Vec3 = ((): Vec3 => { const c = cross(nrm, [0, 0, 1]); const m = Math.hypot(c[0], c[1], c[2]) || 1; return [c[0] / m, c[1] / m, c[2] / m] })()
    const uT = cross(f, nrm)

    const h = S / 2, quad = [[-1, 1], [1, 1], [-1, -1], [1, -1]]
    const top = quad.map(([a, b]) => add(add(M, uT, a * h), f, b * h))
    const bottom = top.map(p => add(p, nrm, L))             // note: +L, nrm points down
    const Pt = add(add(top[2], uT, TR), f, TF)
    const Pb = add(Pt, nrm, L)
    const camera = quad.map(([a, b]) => add(add(Pb, u0, a * S), f0, b * S))
    return { top, bottom, Pt, Pb, camera }
}

export class Calculus {

    cfg: any = {}
    callback = (...n: any) => true

    constructor(config: any) {

        this.cfg.type = config.type
        this.cfg.dst = Number(config.dst)
        this.cfg.ofs = config.ofs.map((n: string) => n === '-' ? '-' : Number(n))
        this.cfg.head = Number(config.head)
        this.cfg.bit = Number(config.bit)

        const isDev = config.mode === 'development'
        // const IOT = new Connection({ name: 'iot', proxy: isDev ? config.virtually : undefined, rejectUnauthorized: false })
        const IOT = new Connection({ name: 'iot', rejectUnauthorized: false })
        IOT.on('sensors', (sensors: any) => { this.cfg.sensors = sensors })

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

            console.log(this.cfg.sensors)
            const { x, y, cx, cy, q } = this.cfg.sensors.axis
            const { ok, n } = this.cfg.sensors.depth
            const { prox1, prox2, len } = this.cfg.sensors.pipe
            let [to_right, to_front] = this.cfg.ofs
            to_right = 45; to_front = 40;

            const { Pt: Rt, Pb: Rb } = drill2(G1, G2, x, y, this.cfg.dst / 100, this.cfg.bit / 100, to_right / 100, to_front / 100)
            const { top, bottom, Pt, Pb, camera: cm } = drill2(G1, G2, cx, cy, this.cfg.dst / 100, this.cfg.bit / 100, to_right / 100, to_front / 100)
            const { Pt: Qt, Pb: Qb }: any = drill3(G1, G2, q, this.cfg.dst / 100, this.cfg.bit / 100, to_right / 100, to_front / 100)

            const { lat, lng } = Utm.convertUtmToLatLng(Pb[0], Pb[1], `${zoneNumber}`, zoneLetter)

            const bit = this.findPointInVector(Pt, Pb, (this.cfg.bit / 100) + (n / 100))

            return {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng],
                A: Pb,
                B: G1,
                C: G2,
                K: Pt,
                status: {
                    dist_tar: this.cfg.dst,
                    dist_act: this.distance3D(G1, G2) * 100,
                    dist_dif: Number((this.cfg.dst - (this.distance3D(G1, G2) * 100)).toFixed(1)),
                    depth: n,
                    proxim: `${prox1},${prox2}`,
                    pipe: len,
                    azimuth: 0,
                    inclination: 0,
                    zoneNumber,
                    zoneLetter,
                    rtcm: `${this.cfg.host}:${this.cfg.port}`,
                },
                shapes: {
                    colored: {
                        /** 
                         * Rb - Previous
                         * Pb - Custom
                         * Qb - Direct Qtr
                         **/
                        'red': [G1, Rb],
                        'green': [G2, Pb],
                        'orange': [Pt, Pb],
                        'Blue': [Qb]
                    },
                    lines: [
                        [top[0], top[1]],
                        [top[2], top[3]],
                        [top[0], top[2]],
                        [top[1], top[3]],
                        [Pt, Pb],
                        [Qt, Qb],
                        [Rt, Rb],
                        [Pb, [bit.x, bit.y, bit.z]],
                    ]
                },
                camera: {
                    TL: this.cn(cm[0]), TM: this.mid(cm[0], cm[1]), TR: this.cn(cm[1]),
                    BL: this.cn(cm[2]), BM: this.mid(cm[2], cm[3]), BR: this.cn(cm[3]),
                }
            }

        } catch (err: any) {
            log.error(`[Calculus] While parsing GPS: ${err.message}`)
            return null
        }
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

}