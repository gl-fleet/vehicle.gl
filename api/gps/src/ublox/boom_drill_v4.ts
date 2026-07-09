import { Safe, log } from 'utils'
import { UTM as Utm } from 'ucan'
import { Connection } from 'unet'

import * as egm96 from 'egm96-universal'

type Vec3 = [number, number, number]
type ENU = [number, number, number] // [east, north, elevation]
type Corners = [ENU, ENU, ENU, ENU]

interface Drill {
    vector: ENU // unit vector pointing DOWN the hole (sensor +Z)
    azimuth: number | null // deg cw from North; null when the hole is vertical
    inclination: number // deg from vertical (0 = vertical, 90 = horizontal)
    dip: number // deg below horizontal (90 = vertical, 0 = horizontal)
    isVertical: boolean
    // --- New Boom Position Fields ---
    boomTipLocation: ENU // Absolute [East, North, Elevation] coordinate of the drill bit
    horizontalDriftCm: number // How many centimeters the bit has moved away from the vertical line
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
    x: number, // Roll from HWT905 (degrees)
    y: number, // Pitch from HWT905 (degrees)
    gps1: ENU,
    gps2: ENU,
    size = 1,
    m = 0.5,
    boomLength = 10 // Added: Length of the drill boom in meters
): Prism => {
    // --- Heading calculated directly from GPS Baseline (0 = North, 90 = East) ---
    const dE = gps2[0] - gps1[0]
    const dN = gps2[1] - gps1[1]
    const heading = Math.atan2(dE, dN)

    const roll = rad(x)
    const pitch = rad(y)
    const yaw = heading

    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const cr = Math.cos(roll), sr = Math.sin(roll)

    // --- ENU Tait-Bryan Rotation Matrix (Z-Y'-X'' sequence) ---
    const R = [
        [cy * cr + sy * sp * sr, cy * sp * cr - sy * sr, cy * cp], // East output
        [sy * cr - cy * sp * sr, cy * sr + sy * sp * cr, sy * cp], // North output
        [-cp * sr, -cp * cr, sp]     // Up output
    ]

    const origin: ENU = [
        (gps1[0] + gps2[0]) / 2,
        (gps1[1] + gps2[1]) / 2,
        (gps1[2] + gps2[2]) / 2
    ]

    const rotate = ([bx, by, bz]: ENU): ENU => {
        const east = R[0][0] * bx + R[0][1] * by + R[0][2] * bz
        const north = R[1][0] * bx + R[1][1] * by + R[1][2] * bz
        const up = R[2][0] * bx + R[2][1] * by + R[2][2] * bz
        return [east, north, up]
    }

    const normal = rotate([0, 0, 1])

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

    // --- Vector pointing down the drill hole (-Z local relative to normal) ---
    const vector = rotate([0, 0, -1])
    const [vE, vN, vU] = vector
    const horiz = Math.hypot(vE, vN)
    const isVertical = horiz < 1e-9

    const azimuth = isVertical ? null : (deg(Math.atan2(vE, vN)) + 360) % 360
    const inclination = deg(Math.acos(clamp(-vU))) // Angle away from straight down
    const dip = 90 - inclination

    // --- Calculate Exact 3D Position of the Drill Bit ---
    // Multiply the normalized direction vector by your boom length
    const boomTipLocation: ENU = [
        origin[0] + vector[0] * boomLength,
        origin[1] + vector[1] * boomLength,
        origin[2] + vector[2] * boomLength
    ]

    // Calculate total displacement away from the vertical line in centimeters
    const horizontalDriftCm = horiz * boomLength * 100

    return {
        heading: (deg(heading) + 360) % 360,
        origin,
        normal,
        middle,
        top: shift(middle, m),
        bottom: shift(middle, -m),
        drill: {
            vector,
            azimuth,
            inclination,
            dip,
            isVertical,
            boomTipLocation,
            horizontalDriftCm
        }
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

        console.log(config.virtually)

        const IOT = new Connection({ name: 'iot', proxy: isDev ? config.virtually : undefined, rejectUnauthorized: false })

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

            // console.log(this.cfg.sensors.axis)
            // this.cfg.sqr = generateSquare((x + _x), (y + _y), (z + _z), G1, G2, this.cfg.dst / 100, this.cfg.bit / 100)
            this.cfg.sqr = generateSquare((x + 0), (y - 0), G1, G2, this.cfg.dst / 100, this.cfg.bit / 100)
            // const [to_right, to_front] = this.cfg.ofs
            const to_right = 0, to_front = 0

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

            console.log(res.A)

            return res

        } catch (err: any) {
            log.error(`[Calculus] While parsing GPS: ${err.message}`)
            return null
        }
    }
}