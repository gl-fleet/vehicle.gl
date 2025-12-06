import { React, Row, Col } from 'uweb'
import { THREE, ThreeView } from 'uweb/three'
import type { MapView } from 'uweb/maptalks'
import { Point, Vehicle } from 'uweb/utils'
import { Safe } from 'utils/web'

import { camera_angle } from '../helper/camera'
import { useWebcam } from '../helper/capture'
import { useScreenshot } from '../helper/capture'

import { Left } from '../canvas/left'
import { Right } from '../canvas/right'
import { Vehicles } from '../canvas/vehicle'
import { Interact } from '../canvas/interact'
import { PlanDig } from '../canvas/plan_dig'
import { PlanShot } from '../canvas/plan_shot'

import Connection from '../views/connection'
import TopRight from '../views/top_right'
import BotLeft from '../views/bot_left'
import Middle from '../views/middle'

export default (cfg: iArgs) => {

    const { api, event, env } = cfg
    const { webcam, screenshot } = env

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

            const itrc = new Interact(left, right, cfg)
            const point = new Point({ Maptalks: left, Three: right })
            let data: any = null

            vehicle.on((ename: string, arg: any) => {

                if (ename === 'position-map' && arg.gps && arg.gps.x && data) {

                    const { A, B, TL, TM, TR, BL, BM, BR, utm } = data

                    itrc.is_left_ok() && left.map.setCenter(data.gps)
                    itrc.is_right_ok() && right.update(camera_angle(data, true), data.utm)

                    point.update('mp_top', 'orange', [utm[0], utm[1], utm[2]])

                    point.update('f_l', 'white', [TL.x, TL.y, TL.z])
                    point.update('f_m', 'white', [TM.x, TM.y, TM.z])
                    point.update('f_r', 'white', [TR.x, TR.y, TR.z])

                    point.update('b_l', 'grey', [BL.x, BL.y, BL.z])
                    point.update('b_m', 'grey', [BM.x, BM.y, BM.z])
                    point.update('b_r', 'grey', [BR.x, BR.y, BR.z])

                    point.update('l_p', 'green', [A.x, A.y, A.z])
                    point.update('r_p', 'blue', [B.x, B.y, B.z])

                    if (true) {

                        const v1 = new THREE.Vector3(A.x, A.y, A.z)
                        const v2 = new THREE.Vector3(B.x, B.y, B.z)
                        right.arroHelper.position.set(B.x, B.y, B.z)
                        right.arroHelper.direction(utm[0], utm[1], utm[2])
                        console.log(data.extra.angle)

                    }

                }

            })

            event.on('stream', ({ data_gps }) => Safe(() => {

                if (typeof data_gps !== 'object') return
                data = data_gps
                vehicle.update({ ...data, utm: [data.utm[0], data.utm[1], data.utm[2]] })

            }, 'MAIN.LISTEN'))

        }

    }, [])

    return <Row id="main" style={{ height: '100%' }}>

        <Col id='left' span={12} style={{ height: '100%' }} />
        <Col id='right' span={12} style={{ height: '100%' }} />

        <Connection {...cfg} />
        <BotLeft {...cfg} />
        <TopRight {...cfg} />
        <Middle {...cfg} />

    </Row>

}