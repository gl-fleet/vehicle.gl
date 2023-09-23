import { Safe, log } from 'utils'

type tPoint = { x: number, y: number, z: number }

/** GPS Movement detector **/

export class MoveDetect {

    prev = { x: 0, y: 0, z: 0 }
    threshold = 2

    constructor(meters: number) {
        this.threshold = meters
    }

    dist = (A: tPoint, B: tPoint) => {

        try {
            return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2))
        } catch (error) {
            return 0
        }

    }

    check = ({ center }: { center: number[] }) => {
        try {

            const c = center
            const next = { x: c[0], y: c[1], z: c[2] }
            const dist = this.dist(this.prev, next)

            if (dist > this.threshold) {
                this.prev = next
                return true
            }

            return false

        } catch (err: any) {
            log.error(`Couldn't detect move / ${err.message}`)
            return false
        }
    }

}
