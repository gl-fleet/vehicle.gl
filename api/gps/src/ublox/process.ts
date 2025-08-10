import { log } from 'utils'

type tChannel = 'update'

export class ProcessActivity {

    public cbs: any = {}

    public action: any = {
        state: 'unknown',
        temp: 'started',
        size: 12,
        span: 6,
        speed: { low: 0.25, high: 0.5 },
        avg1: { s: 0, h: -1, z: 0, d: 0 },
        avg2: { s: 0, h: -1, z: 0, d: 0 },
        points: [],
    }

    constructor(conf: any) {
        this.action = {
            ...this.action,
            ...conf,
        }
    }

    on = (key: tChannel, cb: any) => {

        this.cbs[key] = cb

    }

    emit = (key: tChannel, values: any): boolean => {

        try {
            if (typeof this.cbs[key] === 'undefined') return true
            return this.cbs[key](values)
        } catch { return false }

    }

    add = (gps: any) => {

        const getCardinalDirection = (angle: any) => {
            const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
            return directions[Math.round(Number(angle) / 45) % 8]
        }

        const getDistance = (A: any, B: any) => {
            try {
                return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2))
            } catch (error) {
                return null
            }
        }

        const angleAverage = (a: any, b: any) => ((a + b) / 2 + (Math.abs(b - a) > 180 ? 180 : 0)) % 360

        this.action.points.push({
            x: gps.est,
            y: gps.nrt,
            z: gps.ele,
            h: gps.deg,
            s: gps.spd,
        })

        const len = this.action.points.length

        if (this.action.points[len - 2] && this.action.points[len - 1]) {
            this.action.points[len - 1].d = getDistance(this.action.points[len - 2], this.action.points[len - 1])
        }

        if (this.action.points.length > this.action.size) {

            this.action.points.shift()

            const { avg1, avg2, points, size, span, speed } = this.action

            avg1.s = 0, avg1.h = -1, avg1.z = 0, avg1.d = 0
            avg2.s = 0, avg2.h = -1, avg2.z = 0, avg2.d = 0

            for (let i = 0; i < this.action.span; i++) {
                avg1.s += points[i].s
                avg1.h = avg1.h >= 0 ? angleAverage(avg1.h, points[i].h) : points[i].h
                avg1.z += points[i].z
                avg1.d += points[i].d
            }

            avg1.s = avg1.s / span
            avg1.z = avg1.z / span
            avg1.d = avg1.d / span

            for (let i = this.action.span; i < this.action.size; i++) {
                avg2.s += points[i].s
                avg2.h = avg2.h >= 0 ? angleAverage(avg2.h, points[i].h) : points[i].h
                avg2.z += points[i].z
                avg2.d += points[i].d
            }

            avg2.s = avg2.s / (size - span)
            avg2.z = avg2.z / (size - span)
            avg2.d = avg2.d / (size - span)

            const sym = getCardinalDirection(avg2.h) + getCardinalDirection(avg1.h)

            if (avg1.s < speed.low && avg2.s > speed.high) { this.action.state = `speed_increasing [${sym}]` }
            if (avg1.s > speed.high && avg2.s < speed.low) { this.action.state = `speed_decreasing [${sym}]` }
            if (avg1.s < speed.low && avg2.s < speed.low) { this.action.state = `stopped [${sym}]` }
            if (avg1.s > speed.high && avg2.s > speed.high) { this.action.state = `moving [${sym}]` }

            if (this.action.state.indexOf(this.action.temp) === -1) {

                const x = gps.est, y = gps.nrt, z = gps.ele, h = gps.deg, s = gps.spd
                log.warn(`[process] -> ${this.action.state},${x},${y},${z},${h},${s}`)
                this.action.temp = this.action.state
                this.emit('update', this.action)

            }

        }

    }

}