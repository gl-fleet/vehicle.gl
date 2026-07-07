import { React, Row, Col } from 'uweb'
import { THREE, ThreeView } from 'uweb/three'
import type { MapView } from 'uweb/maptalks'
import { Point, Vehicle } from 'uweb/utils'
import { Loop, Safe, Win } from 'utils/web'

import { camera_angle } from '../helper/camera'
import { useWebcam } from '../helper/capture'
import { useScreenshot } from '../helper/capture'

import { Left } from '../canvas/left'
import { Right } from '../canvas/right'
import { Vehicles } from '../canvas/vehicle'
import { Interact } from '../canvas/interact'
import { PlanDig } from '../canvas/plan_dig'
import { PlanShot, HelperShot } from '../canvas/plan_shot'

import Connection from '../views/connection'
import TopRight from '../views/top_right'
import BotLeft from '../views/bot_left'
import Middle from '../views/middle'

const arrows: any = {}

let blink = true

Loop(() => {

    blink = !blink
    for (const x in arrows) arrows[x].setColor(blink ? 'red' : 'green')

}, 500)

export default (cfg: iArgs) => {

    const { api, event, env } = cfg
    const { webcam, screenshot } = env
    const [half, setHalf] = React.useState(false)

    const [wimg] = useWebcam({ loop: webcam === 'true' ? 5000 : -1, size: [128, 128] })
    const [simg] = useScreenshot({ loop: screenshot === 'true' ? 5000 : -1, size: [128 * 3, 128 * 4], canvas_selector: '#left canvas' })

    React.useEffect(() => { cfg.event.emit('mode', cfg.isDarkMode) }, [cfg.isDarkMode])
    React.useEffect(() => { Safe(async () => wimg && await api.set('img-camera', { img: wimg }), 'SET.WECAM') }, [wimg])
    React.useEffect(() => { Safe(async () => simg && await api.set('img-map', { img: simg }), 'SET.SCREENSHOT') }, [wimg])

    React.useEffect(() => {

        const lv = new Left('left', cfg)
        const rv = new Right('right', cfg)

        lv.on((sms) => sms === 'ready' && render())
        rv.on((sms) => sms === 'ready' && render())


        const handler = (arg: any) => {
            typeof arg === 'boolean' && setHalf(arg)
            setTimeout(() => rv.resize())
        }
        event.on('half', handler)

        const render = () => lv.ready && rv.ready && Safe(() => {

            const left = lv.can
            const right = rv.can
            const vehicle = new Vehicles(left, right)

            vehicle.on((name) => name === 'ready' && Safe(() => {
                vehicle.can && listen(left, right, vehicle.can) /** Update Maps and Vehicle **/
                vehicle.can && new PlanDig(left, right, cfg)    /** Support Dig_Plan  -> [Dozer, Supervisor ...] **/
                vehicle.can && new PlanShot(left, right, cfg)   /** Support Shot_Plan -> [Drill, Supervisor ...] **/

            }, 'MAIN-VEHICLE'))

        }, 'MAIN-RENDER')

        const listen = (left: MapView, right: ThreeView, vehicle: Vehicle) => {

            let data: any = null

            const itrc = new Interact(left, right, cfg)
            const point = new Point({ Maptalks: left, Three: right })

            vehicle.on((ename: string, arg: any) => {

                if (ename === 'position-map') {

                    const { T, R, G, A, B, C, shapes, camera } = data
                    const { lines, points, colored } = shapes

                    itrc.is_left_ok() && left.map.setCenter([G[1], G[0], 0])
                    itrc.is_right_ok() && right.update(camera_angle({ ...camera, A }, true), data.A)

                    right.arroHelper.position.set(A[0], A[1], A[2])
                    right.arroHelper.direction(A[0], A[1], A[2])

                    /** Drawing points **/
                    if (colored) for (const clr in colored) for (let i = 0; i < colored[clr].length; i++) point.update(`${clr}_${i}`, clr, colored[clr][i])
                    else for (let i = 0; i < points.length; i++) point.update(`p_${i}`, 'blue', points[i])

                    /** Drawing lines **/
                    for (let i = 0; i < lines?.length; i++) {

                        const [start, end] = lines[i]
                        let key = `l_${i}`

                        if (arrows.hasOwnProperty(key) === false) {

                            arrows[key] = new THREE.ArrowHelper(new THREE.Vector3(start[0], start[1], start[2]), new THREE.Vector3(end[0], end[1], end[2]), 1, '#ff0000', 0.2, 0.2)
                            right.scene.add(arrows[key])

                        } else {

                            const dir = new THREE.Vector3().subVectors(new THREE.Vector3(end[0], end[1], end[2]), new THREE.Vector3(start[0], start[1], start[2])).normalize()
                            const length = new THREE.Vector3().subVectors(new THREE.Vector3(end[0], end[1], end[2]), new THREE.Vector3(start[0], start[1], start[2])).length()
                            arrows[key].setDirection(dir)
                            arrows[key].setLength(length, 0.02, 0.02)
                            arrows[key].position.set(start[0], start[1], start[2])
                        }

                    }

                }

            })

            event.on('stream', ({ data_gps }) => Safe(() => {

                const { T, R, G, A, B, C, shapes } = data_gps
                data = data_gps
                vehicle.update({ gps: [G[1], G[0], 0], utm: A, head: R })

            }, 'MAIN.LISTEN'))

        }

    }, [])

    return <Row id="main" style={{ height: '100%' /* , opacity: 0.05, filter: 'grayscale(1)' */ }}>

        <Col id='left' span={12} style={{ height: half ? '100%' : '100%' }} />
        <Col id='right' span={12} style={{ height: half ? '100%' : '100%' }} />

        <Connection {...cfg} />
        <BotLeft {...cfg} />
        <TopRight {...cfg} />
        <Middle {...cfg} half={half} />

        <HelperShot {...cfg} half={half} />

    </Row>

}