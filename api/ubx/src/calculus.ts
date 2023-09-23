import { Safe, log } from 'utils'
import { Connection } from 'unet'
import { UTM as Utm } from 'ucan'

type tPoint = { x: number, y: number, z: number }

export class Calculus {

    callback = (...n: any) => true
    config: any = {}
    settings: any = {}

    constructor(config: any) {

        const { gps1, gps2, offset } = config

        this.settings = {
            rightFar: 50,
        }
        this.config = {
            left: Number(gps1[2]),
            right: Number(gps2[2]),
            distance: Number(offset[0]),
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
            const height = Math.min(left, right)
            const toFront = Number(this.config.offset?.x ?? '0') / 100
            const toRight = Number(this.config.offset?.y ?? '0') / 100
            const toTop = Number(this.config.offset?.z ?? '0') / 100
            const hightDiff = Math.abs(left - right)
            const far = Number(this.settings.rightFar ?? '50')

            /* LEFT */ const A = { x: gps1.est, y: gps1.nrt, z: gps1.ele - (left > right ? hightDiff : 0) }
            /* RIGH */ const B = { x: gps2.est, y: gps2.nrt, z: gps2.ele - (right > left ? hightDiff : 0) }
            /* MIDD */ const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 }
            /* FRON */ const C = { x: (A.x + B.x + A.y - B.y) / 2, y: (A.y + B.y + B.x - A.x) / 2, z: M.z }
            /* BACK */ const D = { x: (A.x + B.x + B.y - A.y) / 2, y: (A.y + B.y + A.x - B.x) / 2, z: M.z }

            const K0 = this.find4thPoint(M, A, C)
            const K1 = this.find4thPoint(M, B, C)
            const { _L: _TL, _M: _TM, _R: _TR } = this.ms4findingGP(K0, K1, width, height) /** BM */
            const { _L: BL, _M: BM, _R: BR } = this.ms4findingGP(A, B, width, height) /** TM */

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
                camera: {
                    back: this.findPointInVector(TM, BM, far),
                    right: this.findPointInVector(TM, TR, far),
                    top: { ...this.findPointInVector(MP, BP, 0.001), z: this.findPointInVector(MP, BP, 0.001).z + far },
                },
                A, B, M, C, D,
                BL, BM, BR,
                TL, TM, TR,
                MP,
                left, right, width, height, hightDiff,
                toFront, toRight, toTop,
            }

        } catch (err: any) {
            log.error(`While parsing GPS: ${err.message}`)
            return null
        }

    }

    /** Wrote this Dump_Ugly Theorom to find right angles / Tested with Y-Dimension **/
    uglyAngleCalculus = (_A: tPoint, _B: tPoint) => {
        try {

            const { x: ax, y: ay, z: az } = _A
            const { x: bx, y: by, z: bz } = _B
            if (az === bz) { return 0 }
            else if (az > bz) {
                const a = { x: bx - ax, y: by - ay, z: bz - az }
                const b = { x: bx - ax, y: by - ay, z: 0 }
                const angle = Math.acos((a.x * b.x + a.y * b.y + a.z * b.z) / (Math.sqrt((a.x * a.x) + (a.y * a.y) + (a.z * a.z)) * Math.sqrt((b.x * b.x) + (b.y * b.y) + (b.z * b.z))))
                return ay > by ? angle * (-1) : angle
            } else {
                const a = { x: ax - bx, y: ay - by, z: az - bz }
                const b = { x: ax - bx, y: ay - by, z: 0 }
                const angle = Math.acos((a.x * b.x + a.y * b.y + a.z * b.z) / (Math.sqrt((a.x * a.x) + (a.y * a.y) + (a.z * a.z)) * Math.sqrt((b.x * b.x) + (b.y * b.y) + (b.z * b.z))))
                return ay > by ? angle : angle * (-1)
            }

        } catch (err) { return 0 }
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
