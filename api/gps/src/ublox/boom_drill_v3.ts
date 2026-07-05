import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import { Connection } from 'unet'

import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]

export class Calculus {

    cfg: any = {}
    callback = (...n: any) => true

    constructor(config: any) {

        this.cfg.type = config.type
        this.cfg.dst = Number(config.dst)
        this.cfg.top = config.top.map((n: string) => Number(n))
        this.cfg.head = Number(config.head)
        this.cfg.bit = Number(config.bit)

        const IOT = new Connection({ name: 'iot', timeout: 1000 })
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

            // this.cfg.heading = heading
            // this.cfg.mid = mid

            console.log(this.cfg)

            return {}

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