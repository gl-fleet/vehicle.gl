import { Safe, log } from 'utils'
import { Connection } from 'unet'
import { UTM as Utm } from 'ucan'

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
    config: any = {
        R: 1,
        F: 1,
        D: 1,
    }

    constructor(cfg: any) {

        const { offset } = cfg
        this.config.R = Number(offset[0])
        this.config.F = Number(offset[1])
        this.config.D = Number(offset[2])
        console.log(`BoomDrill CFG`, this.config)

    }

    on = (cb: any) => { this.callback = cb }

    mid = (A: tPoint, B: tPoint) => ({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 })
    calculate = ({ gps1, gps2 }: any) => {

        try {

            console.log(gps1)

            const { zoneNumber, zoneLetter } = getUTMZone(gps1.lat, gps1.lon)

            /* GPS1 - Located on the Cabin */
            const A = { x: gps1.est, y: gps1.nrt, z: gps1.ele }
            /* GPS2 - Located on top of the Boom */
            const B = { x: gps2.est, y: gps2.nrt, z: gps2.ele }

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
                extra: { angle: angle * 180 / Math.PI },
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

type tPoint = { x: number, y: number, z: number }

export class Calculus {

    callback = (...n: any) => true
    config: any = {}
    settings: any = {}

    constructor(config: any) {

        const { gps1, gps2, offset, expand } = config

        this.config = {
            left: Number(gps1[2]),
            right: Number(gps2[2]),
            distance: Number(offset[0]),
            expand: Number(offset[4]),
            offset: {
                x: Number(offset[1]),
                y: Number(offset[2]),
                z: Number(offset[3]),
            }
        }

    }

    on = (cb: any) => { this.callback = cb }

    /** Final calculation **/
    calculate = ({ gps1, gps2 }: any) => {

        try {

            const left = Number(this.config.left ?? '0') / 100
            const right = Number(this.config.right ?? '0') / 100
            const width = Number(this.config.distance ?? '0') / 100
            const toFront = Number(this.config.offset?.x ?? '0') / 100
            const toRight = Number(this.config.offset?.y ?? '0') / 100
            const toTop = Number(this.config.offset?.z ?? '0') / 100
            const expand = (Number(this.config.expand ?? '0') / 100) * 2
            const height = Math.min(left, right)
            const hightDiff = Math.abs(left - right)

            /* LEFT */ const A = { x: gps1.est, y: gps1.nrt, z: gps1.ele - (left > right ? hightDiff : 0) }
            /* RIGH */ const B = { x: gps2.est, y: gps2.nrt, z: gps2.ele - (right > left ? hightDiff : 0) }
            /* MIDD */ const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 }
            /* FRON */ const C = { x: (A.x + B.x + A.y - B.y) / 2, y: (A.y + B.y + B.x - A.x) / 2, z: M.z }
            /* BACK */ const D = { x: (A.x + B.x + B.y - A.y) / 2, y: (A.y + B.y + A.x - B.x) / 2, z: M.z }

            const K0 = this.find4thPoint(M, A, C)
            const K1 = this.find4thPoint(M, B, C)
            const { _L: _TL, _M: _TM, _R: _TR } = this.ms4findingGP(K0, K1, width + expand, height) /** BM */
            const { _L: BL, _M: BM, _R: BR } = this.ms4findingGP(A, B, width + expand, height) /** TM */

            const TL = this.findPointInVector(BL, { ..._TL }, toFront)
            const TM = this.findPointInVector(BM, { ..._TM }, toFront)
            const TR = this.findPointInVector(BR, { ..._TR }, toFront)

            const MP = this.findPointInVector(TM, { ...TR }, toRight) /** Magical point, which describe actual calculated point **/
            MP.x += toTop

            const BP = this.findPointInVector(BM, { ...BR }, toRight) /** BACK-Magical point, which describe actual calculated point **/
            BP.x += toTop

            /** Rotation calculation */
            const _x = 0 // uglyAngleCalculus(M, E)      /** Will work on it, when the third dimension comes / Seems working fine but Object needs to move forward little bit **/
            const _y = 0 // this.uglyAngleCalculus(B, A) /** Just ignoring it, Since rotations are used by GLTF only **/
            const _z = (Math.atan2(A.y - B.y, A.x - B.x) * 180 / Math.PI) * (Math.PI / 180) + (Math.PI)
            const LL_TM = Utm.convertUtmToLatLng(MP.x, MP.y, "48", "T")
            const LL_BM = Utm.convertUtmToLatLng(BP.x, BP.y, "48", "T")

            return {
                map: [LL_TM.lat, LL_TM.lng, M.z],
                center: [M.x, M.y, M.z],
                rotate: [_x, _y, _z],
                front: [C.x, C.y, C.z],
                back: [D.x, D.y, D.z],
                status: {
                    distFix: width,
                    dist3D: this.distance3D(A, B),
                    dist2D: this.distance3D({ ...A, z: 1 }, { ...B, z: 1 }),
                },
                coords: {
                    front: [LL_TM.lat, LL_TM.lng, TM.z],
                    back: [LL_BM.lat, LL_BM.lng, BM.z],
                },
                A, B, M, C, D,
                TL, TM, TR,
                MP,
                BL, BM, BR,
                left, right, width, height, hightDiff,
                toFront, toRight, toTop,
            }

        } catch (err: any) {
            log.error(`While parsing GPS: ${err.message}`)
            return null
        }

    }

    /** Calculate distance */
    distance3D = (A: tPoint, B: tPoint) => {
        try {
            return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2))
        } catch (error) {
            return 0
        }
    }

    /** Find point at given distance on AB vector */
    findPointInVector = (A: tPoint, B: tPoint, r: number) => {
        const d = this.distance3D(A, B)
        return {
            x: (A.x + ((B.x - A.x) / d) * r),
            y: (A.y + ((B.y - A.y) / d) * r),
            z: (A.z + ((B.z - A.z) / d) * r)
        }
    }

    /** Find middle point */
    midPoint = (A: tPoint, B: tPoint) => ({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 })

    /** Freaking Monkey solution for finding ground point */
    ms4findingGP = (A: tPoint, B: tPoint, w: number, h: number) => {

        const { x: ax, y: ay, z: az } = A
        const { x: bx, y: by, z: bz } = B

        const d = this.distance3D(A, B)

        const A1 = { x: ax, y: ay, z: az - d }
        const B1 = { x: bx, y: by, z: bz - d }
        const M = this.midPoint(A, B)
        const M1 = this.midPoint(A1, B1)

        const dots = (_m0: tPoint, _a0: tPoint, _w: number, _m1: tPoint, _a1: tPoint, _w1: number, _h: number) => { // Image # --> #

            const a0 = this.findPointInVector(_m0, _a0, _w / 2)
            const b0 = this.findPointInVector(a0, _m0, _w)
            const a1 = this.findPointInVector(_m1, _a1, _w1)
            const b1 = this.findPointInVector(a1, _m1, _w)
            const _L = this.findPointInVector(a0, a1, _h)
            const _R = this.findPointInVector(b0, b1, _h)
            return { _L, _R }

        }

        if (az === bz) {

            const LL = this.findPointInVector(M, A, w / 2)
            const RR = this.findPointInVector(M, B, w / 2)
            return {
                _L: { ...LL, z: M.z - h },
                _M: { x: M.x, y: M.y, z: M.z - h },
                _R: { ...RR, z: M.z - h },
            }

        } else if (az > bz) {

            const { _L, _R } = dots(M, A, w, M1, A1, ((w / 2) + (az - bz)), h)
            const I = { ...this.findPointInVector(M1, A1, (az - bz)) }
            const _M = { ...this.findPointInVector(M, I, h) }
            return { _L, _M, _R }

        } else {

            const { _L, _R } = dots(M, B, w, M1, B1, ((w / 2) + (bz - az)), h)
            const I = { ...this.findPointInVector(M1, B1, (bz - az)) } // BOTTOM MID
            const _M = { ...this.findPointInVector(M, I, h) } // TOP MID TO BOTTOM MID => LINE
            return { _L: _R, _M, _R: _L }

        }

    }

    /** Find 4th point */
    find4thPoint = (M: tPoint, B: tPoint, C: tPoint) => {
        try {
            const d = this.distance3D(C, B)
            const m = this.midPoint(C, B)
            return this.findPointInVector(M, m, d)
        } catch (error) {
            return { x: 0, y: 0, z: 0 }
        }
    }

}
