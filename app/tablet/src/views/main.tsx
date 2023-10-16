import { React, Row, Col } from 'uweb'
import { Safe, log } from 'utils/web'
import { Tick, Point } from 'uweb/utils'

import { camera_angle } from '../helper/camera'
import { useWebcam } from '../helper/capture'

import { Left } from '../canvas/left'
import { Right } from '../canvas/right'
import { Vehicles } from '../canvas/vehicle'
import { Interact } from '../canvas/interact'

import TopRight from '../views/top_right'
import BotLeft from '../views/bot_left'
import Middle from '../views/middle'

const canvas: {
    left?: Left
    right?: Right
    vehicle?: Vehicles
} = {}

export default (cfg: iArgs) => {

    const [count, setCount] = React.useState(0)
    const [wimg, wset] = useWebcam({ loop: 2500, size: [128, 128] })

    React.useEffect(() => {

        const { event, isDarkMode } = cfg

        canvas.left = new Left('left', isDarkMode)
        canvas.right = new Right('right', isDarkMode)
        canvas.left.on((sms) => sms === 'ready' && render())
        canvas.right.on((sms) => sms === 'ready' && render())

        const render = () => {

            if (!(canvas.left?.ready && canvas.right?.ready)) { return }

            log.info(`Left is ${canvas.left.ready}`)
            log.info(`Right is ${canvas.right.ready}`)

            const left = canvas.left.can
            const right = canvas.right.can

            canvas.vehicle = new Vehicles(left, right)
            const itrc = new Interact(left, right, cfg)
            const point = new Point({ Maptalks: left, Three: right })

            event.on('stream', ({ data_gps }) => Safe(() => {

                const { A, B, TM, BM } = data_gps
                const { gps, utm, head } = data_gps

                itrc.is_left_ok() && left.map.setCenter(gps)
                itrc.is_right_ok() && right.update(camera_angle(data_gps, true), utm)
                canvas.vehicle?.can?.update({ gps, utm, head })

                point.update('f_m', 'grey', [TM.x, TM.y, TM.z])
                point.update('b_m', 'grey', [BM.x, BM.y, BM.z])

                point.update('left', 'red', [A.x, A.y, A.z])
                point.update('right', 'blue', [B.x, B.y, B.z])
                point.update('origin', 'green', utm)

            }, 'STREAM'))

        }

    }, [])

    return <Row id="main" style={{ height: '100%' }}>

        <Col id='left' span={12} style={{ height: '100%' }} />
        <Col id='right' span={12} style={{ height: '100%' }} />

        <>
            <TopRight {...cfg} />
            <BotLeft {...cfg} />
            <Middle {...cfg} />
        </>

    </Row>

}