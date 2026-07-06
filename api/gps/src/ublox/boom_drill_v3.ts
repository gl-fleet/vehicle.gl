import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import { Connection } from 'unet'

import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

// Build an N-sized 3D square, positioned & oriented from an HWT905 (tilt)
// and two RTK GPS antennas (heading).
//
//   x, y, z : HWT905 roll, pitch, yaw in DEGREES  (z is ignored - see note)
//   gps1    : [east, north, elevation]  antenna 1
//   gps2    : [east, north, elevation]  antenna 2
//   size    : side length of the square (same units as GPS, e.g. metres)
//
// Frame: ENU (x=East, y=North, z=Up). Heading is clockwise from North.

type ENU = [number, number, number] // [east, north, elevation]

interface Square {
    heading: number // degrees, clockwise from North
    origin: ENU
    corners: [ENU, ENU, ENU, ENU]
}

const rad = (deg: number): number => (deg * Math.PI) / 180

const generateSquare = (
    x: number,
    y: number,
    z: number,
    gps1: ENU,
    gps2: ENU,
    size = 1
): Square => {
    // --- heading from the two antennas (clockwise from North) ---
    const dE = gps2[0] - gps1[0]
    const dN = gps2[1] - gps1[1]
    const heading = Math.atan2(dE, dN)

    // --- orientation: roll & pitch from HWT905, yaw from GPS heading ---
    // (z / HWT yaw is intentionally NOT used - GPS heading is more reliable)
    const roll = rad(x)
    const pitch = rad(y)
    const yaw = heading

    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const cr = Math.cos(roll), sr = Math.sin(roll)

    // body -> NED rotation (ZYX: yaw, pitch, roll)
    const R = [
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
        [-sp, cp * sr, cp * cr]
    ]

    // anchor point = midpoint of the two antennas
    const origin: ENU = [
        (gps1[0] + gps2[0]) / 2,
        (gps1[1] + gps2[1]) / 2,
        (gps1[2] + gps2[2]) / 2
    ]

    // square corners in the sensor plane (body XY), centred on the sensor
    const h = size / 2
    const cornersBody: ENU[] = [
        [h, h, 0],
        [h, -h, 0],
        [-h, -h, 0],
        [-h, h, 0]
    ]

    // body -> NED -> ENU, then translate to the anchor
    const toENU = ([bx, by, bz]: ENU): ENU => {
        const north = R[0][0] * bx + R[0][1] * by + R[0][2] * bz
        const east = R[1][0] * bx + R[1][1] * by + R[1][2] * bz
        const down = R[2][0] * bx + R[2][1] * by + R[2][2] * bz
        return [east + origin[0], north + origin[1], -down + origin[2]]
    }

    return {
        heading: ((heading * 180) / Math.PI + 360) % 360,
        origin,
        corners: cornersBody.map(toENU) as [ENU, ENU, ENU, ENU]
    }
}

export { generateSquare }
export type { ENU, Square }

export class Calculus {

    cfg: any = {}
    callback = (...n: any) => true

    constructor(config: any) {

        this.cfg.type = config.type
        this.cfg.dst = Number(config.dst)
        this.cfg.top = config.top.map((n: string) => Number(n))
        this.cfg.head = Number(config.head)
        this.cfg.bit = Number(config.bit)

        const IOT = new Connection({ name: 'iot', proxy: 'https://dl430-gantulgak.as2.pitunnel.com', rejectUnauthorized: false })
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

    calculate = ({ gps1, gps2 }: any) => {

        try {

            const altitude = this.cfg.type[1] ?? 'ele'
            const { zoneNumber, zoneLetter } = this.getUTMZone(gps1.lat, gps1.lon)

            gps1.egm = egm96.ellipsoidToEgm96(gps1.lat, gps1.lon, gps1.ele)
            gps2.egm = egm96.ellipsoidToEgm96(gps2.lat, gps2.lon, gps2.ele)

            const G1: Vec3 = [gps1.est, gps1.nrt, gps1[altitude]]
            const G2: Vec3 = [gps2.est, gps2.nrt, gps2[altitude]]

            const out = {} // computeTarget({ G1, G2, ...this.cfg })

            const heading = Math.atan2(G2[1] - G1[1], G2[0] - G1[0]) - Math.PI / 2
            const mid = this.mid(G1, G2)

            console.log(mid, heading)

            this.cfg.mid = mid
            this.cfg.heading = heading
            this.cfg.g1 = `${gps1.fix},${gps1.hac}`
            this.cfg.g2 = `${gps2.fix},${gps2.hac}`

            const { x, y, z } = this.cfg.sensors.tilt
            this.cfg.sqr = generateSquare(x, y, z, G1, G2, this.cfg.dst)

            const { lat, lng } = Utm.convertUtmToLatLng(mid.x, mid.y, `${zoneNumber}`, zoneLetter)

            console.log(this.cfg)

            return {
                T: this.cfg.type[0],
                R: heading,
                G: [lat, lng, 0],
            }

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