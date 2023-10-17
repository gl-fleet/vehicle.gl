import { React, Row, Col } from 'uweb'
import { ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Point, Vehicle } from 'uweb/utils'
import { Safe } from 'utils/web'

import { camera_angle } from '../helper/camera'
import { useWebcam } from '../helper/capture'

import { Left } from '../canvas/left'
import { Right } from '../canvas/right'
import { Vehicles } from '../canvas/vehicle'
import { Interact } from '../canvas/interact'
import { PlanDig } from '../canvas/plan_dig'
import { PlanShot } from '../canvas/plan_shot'

import TopRight from '../views/top_right'
import BotLeft from '../views/bot_left'
import Middle from '../views/middle'

export default (cfg: iArgs) => {

    const [wimg, wset] = useWebcam({ loop: 2500, size: [128, 128] })

    React.useEffect(() => {

        const { event, isDarkMode } = cfg

        const lv = new Left('left', isDarkMode)
        const rv = new Right('right', isDarkMode)

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

            event.on('stream', ({ data_gps }) => Safe(() => {

                const { A, B, TM, BM } = data_gps
                const { gps, utm, head } = data_gps

                itrc.is_left_ok() && left.map.setCenter(gps)
                itrc.is_right_ok() && right.update(camera_angle(data_gps, true), utm)
                vehicle.update({ gps, utm, head })

                point.update('f_m', 'grey', [TM.x, TM.y, TM.z])
                point.update('b_m', 'grey', [BM.x, BM.y, BM.z])

                point.update('left', 'red', [A.x, A.y, A.z])
                point.update('right', 'blue', [B.x, B.y, B.z])
                point.update('origin', 'green', utm)

            }, 'MAIN-LISTEN'))

        }

    }, [])

    return <Row id="main" style={{ height: '100%' }}>

        <Col id='left' span={12} style={{ height: '100%' }} />
        <Col id='right' span={12} style={{ height: '100%' }} />

        <TopRight {...cfg} />
        <BotLeft {...cfg} />
        <Middle {...cfg} />

    </Row>

}