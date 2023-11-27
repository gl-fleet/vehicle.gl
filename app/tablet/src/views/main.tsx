import { React, Row, Col } from 'uweb'
import { ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Point, Vehicle } from 'uweb/utils'
import { Safe, Loop } from 'utils/web'

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
    React.useEffect(() => { Safe(async () => await api.set('img-camera', { img: wimg }), 'SET.WECAM') }, [wimg])
    React.useEffect(() => { Safe(async () => await api.set('img-map', { img: simg }), 'SET.SCREENSHOT') }, [wimg])

    React.useEffect(() => {

        const lv = new Left('left', cfg)
        const rv = new Right('right', cfg)

        lv.on((sms) => sms === 'ready' && render())
        rv.on((sms) => sms === 'ready' && render())

        const fix_blank = () => {

            const cv: any = document.querySelector('.maptalks-canvas-layer > canvas')
            const ct: any = cv.getContext('2d')
            Loop(() => {
                const p = ct.getImageData(200, 200, 1, 1).data
                console.log(p)
            }, 5000)

        }

        const render = () => lv.ready && rv.ready && Safe(() => {

            fix_blank()

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

            event.on('stream', ({ data_gps }) => Safe(() => {

                const { A, B, TL, TM, TR, BL, BM, BR } = data_gps
                const { gps, utm, head } = data_gps

                itrc.is_left_ok() && left.map.setCenter(gps)
                itrc.is_right_ok() && right.update(camera_angle(data_gps, true), utm)
                vehicle.update({ gps, utm, head })

                point.update('f_l', 'grey', [TL.x, TL.y, TL.z])
                point.update('f_r', 'grey', [TR.x, TR.y, TR.z])

                point.update('b_l', 'grey', [BL.x, BL.y, BL.z])
                point.update('b_m', 'orange', [BM.x, BM.y, BM.z])
                point.update('b_r', 'grey', [BR.x, BR.y, BR.z])

                point.update('l_p', 'red', [A.x, A.y, A.z])
                point.update('r_p', 'blue', [B.x, B.y, B.z])

            }, 'MAIN-LISTEN'))

        }

    }, [])

    return <Row id="main" style={{ height: '100%' }}>

        <Col id='left' span={12} style={{ height: '100%' }} />
        <Col id='right' span={12} style={{ height: '100%' }} />

        <Connection {...cfg} />
        <TopRight {...cfg} />
        <BotLeft {...cfg} />
        <Middle {...cfg} />

    </Row>

}