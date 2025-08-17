import { Shell, Safe, Delay, Loop } from 'utils'

import { start_ublox } from './ublox'
import { start_unicore } from './unicore'

const ublox = ['Prolific Technology, Inc. PL2303 Serial Port / Mobile Phone Data Cable', 'U-Blox AG u-blox GNSS receiver']
const unicore = ['QinHeng Electronics CH340 serial converter']

Loop(() => { }, 1000)

Safe(() => {

    type Point3 = { east: number, north: number, up: number }

    const generate3DRectangle = (
        centerEast: number,
        centerNorth: number,
        centerUp: number = 0,
        length: number,     // forward direction size (m)
        width: number,      // right direction size (m)
        headingDeg: number, // 0 = North, clockwise
        pitchDeg: number,   // positive = nose up
        rollDeg: number     // positive = right wing down
    ): Point3[] => {
        const halfLen = length / 2
        const halfWid = width / 2

        const h = (headingDeg * Math.PI) / 180
        const p = (pitchDeg * Math.PI) / 180
        const r = (rollDeg * Math.PI) / 180

        // Local coords: x = forward, y = right, z = up
        const localCorners: [number, number, number][] = [
            [-halfLen, -halfWid, 0], // back-left
            [halfLen, -halfWid, 0], // front-left
            [halfLen, halfWid, 0], // front-right
            [-halfLen, halfWid, 0]  // back-right
        ]

        const rotateX = (x: number, y: number, z: number, a: number) =>
            [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)] as [number, number, number]

        const rotateY = (x: number, y: number, z: number, a: number) =>
            [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)] as [number, number, number]

        const rotateZ = (x: number, y: number, z: number, a: number) =>
            [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z] as [number, number, number]

        const points = localCorners.map(([lx, ly, lz]) => {
            let [x1, y1, z1] = rotateX(lx, ly, lz, r)
                ;[x1, y1, z1] = rotateY(x1, y1, z1, p)
                ;[x1, y1, z1] = rotateZ(x1, y1, z1, -h + Math.PI / 2)

            return {
                east: centerEast + x1,
                north: centerNorth + y1,
                up: centerUp + z1
            }
        })

        points.push(points[0]) // close polygon

        return points
    }

    // Example: 20m long (forward), 10m wide (right)
    const rect = generate3DRectangle(
        500000,   // centerEast (m)
        4750000,  // centerNorth (m)
        1338.5,   // centerUp (m)
        20,       // length (m)
        10,       // width (m)
        45,       // heading (deg) - UM982
        5,        // pitch (deg)
        10        // roll (deg)
    )

    console.log(rect)

}, 'Calculation')

Delay(() => Safe(() => {

    //

    return null

    const usb = (Shell.exec(`lsusb`, { silent: true }).stdout ?? '').split('\n')

    let module = ''

    for (const x of usb) {

        if (x.indexOf(ublox[0]) >= 0 || x.indexOf(ublox[1]) >= 0) module = 'ublox'
        if (x.indexOf(unicore[0]) >= 0) module = 'unicore'

    }

    module === 'ublox' && start_ublox()
    module === 'unicore' && start_unicore()

}, 'GPS_Detection'), 2500)