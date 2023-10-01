import { Host, Connection, ReplicaSlave } from 'unet'
import { Safe, log } from 'utils'

/** 
 * The Process is used for generating required information based on raw data
 * **/

export const run_process = () => Safe(() => {

    // const remote = 'https://u002-gantulgak.as1.pitunnel.com/'
    const UBX = new Connection({ name: 'ubx' })

    const action: any = {
        state: 'unknown',
        temp: 'started',
        size: 12,
        span: 6,
        speed: { low: 0.25, high: 0.5 },
        avg1: { s: 0, h: -1, z: 0, d: 0 },
        avg2: { s: 0, h: -1, z: 0, d: 0 },
        points: [],
    }

    UBX.on('live-raw', ({ gps1, gps2 }: any) => {

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

        const angleOpposite = (n: number) => Math.abs(n - 180)
        const angleDistance = (a: number, b: number) => Math.min(Math.abs(b - a), Math.abs((b + 360) - a))
        const angleAverage = (a: any, b: any) => ((a + b) / 2 + (Math.abs(b - a) > 180 ? 180 : 0)) % 360

        action.points.push({
            x: gps1.est,
            y: gps1.nrt,
            z: gps1.ele,
            h: gps1.deg,
            s: gps1.spd,
        })

        const len = action.points.length

        if (action.points[len - 2] && action.points[len - 1]) { action.points[len - 1].d = getDistance(action.points[len - 2], action.points[len - 1]) }

        if (action.points.length > action.size) {

            action.points.shift()

            const { avg1, avg2, points, size, span, speed } = action

            avg1.s = 0, avg1.h = -1, avg1.z = 0, avg1.d = 0
            avg2.s = 0, avg2.h = -1, avg2.z = 0, avg2.d = 0

            for (let i = 0; i < action.span; i++) {
                avg1.s += points[i].s
                avg1.h = avg1.h >= 0 ? angleAverage(avg1.h, points[i].h) : points[i].h
                avg1.z += points[i].z
                avg1.d += points[i].d
            }

            avg1.s = avg1.s / span
            avg1.z = avg1.z / span
            avg1.d = avg1.d / span

            for (let i = action.span; i < action.size; i++) {
                avg2.s += points[i].s
                avg2.h = avg2.h >= 0 ? angleAverage(avg2.h, points[i].h) : points[i].h
                avg2.z += points[i].z
                avg2.d += points[i].d
            }

            avg2.s = avg2.s / (size - span)
            avg2.z = avg2.z / (size - span)
            avg2.d = avg2.d / (size - span)

            const sym = getCardinalDirection(avg1.h) + getCardinalDirection(avg2.h)

            if (avg1.s < speed.low && avg2.s > speed.high) { action.state = `speed_increasing [${sym}]` }
            if (avg1.s > speed.high && avg2.s < speed.low) { action.state = `speed_decreasing [${sym}]` }
            if (avg1.s < speed.low && avg2.s < speed.low) { action.state = `stopped [${sym}]` }
            if (avg1.s > speed.high && avg2.s > speed.high) { action.state = `moving [${sym}]` }

            if (action.state.indexOf(action.temp) === -1) {

                const x = gps1.est, y = gps1.nrt, z = gps1.ele, h = gps1.deg, s = gps1.spd
                /** State, East, North, Elevation, Heading, Speed **/
                log.info(`[process] -> ${action.state},${x},${y},${z},${h},${s}`)
                action.temp = action.state.split(' ')[0]

            }

        }

    })

})