import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import * as egm96 from 'egm96-universal'

type tPoint = { x: number, y: number, z: number }
type Point3D = { x: number, y: number, z: number }

const getUTMZone = (lat: number, lon: number) => {

    if (lat < -80 || lat > 84) return { zoneNumber: 0, zoneLetter: '*' } // Outside UTM limits

    // Calculate zone number
    const zoneNumber = Math.floor((lon + 180) / 6) + 1

    // Latitude bands excluding I and O
    const bands = "CDEFGHJKLMNPQRSTUVWXX" // X repeated for lat > 72

    // Calculate band index
    const bandIndex = Math.floor((lat + 80) / 8)

    const zoneLetter = bands.charAt(bandIndex)

    return { zoneNumber, zoneLetter }

}

export const generateGeometry = (
    G1: Point3D,
    G2: Point3D,
    R: number,
    F: number,
    D: number
) => {

    const distance3D = (a: Point3D, b: Point3D) =>
        Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2)

    const vector = (a: Point3D, b: Point3D): Point3D => ({
        x: b.x - a.x,
        y: b.y - a.y,
        z: b.z - a.z
    })

    const add = (a: Point3D, b: Point3D): Point3D => ({
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    })

    const scale = (v: Point3D, s: number): Point3D => ({
        x: v.x * s,
        y: v.y * s,
        z: v.z * s
    })

    const length = (v: Point3D) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)

    const dot = (a: Point3D, b: Point3D) => a.x * b.x + a.y * b.y + a.z * b.z

    const angleBetween = (a: Point3D, b: Point3D) => {
        const cosTheta = dot(a, b) / (length(a) * length(b))
        return Math.acos(Math.min(Math.max(cosTheta, -1), 1))
    }

    // === STEP 1: Derived point VG2 ===
    const VG2: Point3D = { x: G2.x, y: G2.y, z: G1.z }

    // === STEP 2: Distance L ===
    const L = distance3D(G1, VG2)

    // === STEP 3: Unit vectors u and e (in XY plane)
    const u: Point3D = {
        x: -(VG2.y - G1.y) / L,
        y: (VG2.x - G1.x) / L,
        z: 0
    }

    const e: Point3D = {
        x: (VG2.x - G1.x) / L,
        y: (VG2.y - G1.y) / L,
        z: 0
    }

    // === STEP 4: Parameters α (alpha) and β (beta)
    const alpha = (R ** 2) / L
    const beta = Math.sqrt(alpha * (L - alpha))

    // === STEP 5: Points G4 and G3
    const G4 = add(G1, add(scale(e, alpha), scale(u, -beta)))
    const G3 = add(VG2, add(scale(e, -alpha), scale(u, beta)))

    // === STEP 6: Center point on G4→VG2
    const G4VG2 = vector(G4, VG2)
    const Center = add(G4, scale(G4VG2, F / length(G4VG2)))

    // === STEP 7: G2Bit & G2VG2 vectors
    const G2Bit = vector(G2, Center)
    const G2VG2 = vector(G2, VG2)

    // === STEP 8: Angle between G2Bit and G2VG2
    const angle = angleBetween(G2Bit, G2VG2)

    // === STEP 9: Bit point
    const Bit = add(Center, scale(G2Bit, D / length(G2Bit)))

    return { G1, G2, VG2, G3, G4, Center, G2Bit, G2VG2, angle, Bit }
}

export class BoomDrill {

    callback = (...n: any) => true
    config: any = { R: 1, F: 1, D: 1 }

    constructor(cfg: any) {

        const { type, offset } = cfg
        this.config.R = Number(offset[0])
        this.config.F = Number(offset[1])
        this.config.D = Number(offset[2])
        this.config = { ...this.config, type }
        console.log(`BoomDrill CFG`, this.config)

    }

    on = (cb: any) => { this.callback = cb }

    mid = (A: tPoint, B: tPoint) => ({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 })

    distance3D = (a: Point3D, b: Point3D) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2)

    calculate = ({ gps1, gps2 }: any) => {

        try {

            const altitude = this.config.type[1] ?? 'ele'
            const { zoneNumber, zoneLetter } = getUTMZone(gps1.lat, gps1.lon)
            gps1.egm = egm96.ellipsoidToEgm96(gps1.lat, gps1.lon, gps1.ele)
            gps2.egm = egm96.ellipsoidToEgm96(gps2.lat, gps2.lon, gps2.ele)

            /* GPS1 - Located on the Cabin */
            const A = { x: gps1.est, y: gps1.nrt, z: gps1[altitude] }
            /* GPS2 - Located on top of the Boom */
            const B = { x: gps2.est, y: gps2.nrt, z: gps2[altitude] }

            const { G1, G2, VG2, G3, G4, Center, Bit, angle } = generateGeometry(A, B, this.config.R, this.config.F, this.config.D)

            const heading = (Math.atan2(G4.y - Center.y, G4.x - Center.x) * 180 / Math.PI) * (Math.PI / 180) + (Math.PI / 2)
            const gps = Utm.convertUtmToLatLng(G4.x, G4.y, `${zoneNumber}`, zoneLetter)

            const C = G3
            const D = G4
            const MP = Bit

            const TL = G3
            const TR = VG2
            const TM = this.mid(TL, TR)
            const BL = G1
            const BR = G4
            const BM = this.mid(BL, BR)

            const res = {
                map: [gps.lat, gps.lng, G1.z],
                center: [G1.x, G1.y, G1.z],
                rotate: [0, 0, heading],
                status: { distFix: 0, dist3D: 0, dist2D: 0 },
                coords: { front: [0, 0, 0], back: [0, 0, 0] },
                extra: { angle: angle * 180 / Math.PI, gps_dist: this.distance3D(A, B) },
                A, B, C, D,
                TL, TM, TR,
                MP,
                BL, BM, BR,
                /* left, right, width, height, hightDiff,
                toFront, toRight, toTop, */

            }

            return res

        } catch (err: any) {

            log.error(`While parsing GPS: ${err.message}`)
            return null

        }

    }

}