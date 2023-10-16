import { React, Row, Col } from 'uweb'
import { Win, Loop, Delay, Safe, log } from 'utils/web'
import { Tick, Point } from 'uweb/utils'
import { createGlobalStyle } from 'styled-components'

import { mapHook } from './hooks/map'
import { threeHook } from './hooks/three'
import { vehicleHook } from './hooks/vehicle'
import { dxfHook } from './hooks/dxf'

import { DeviceListView } from './views/device'
import { MiddleInfo } from './views/middle'
import { TopLeft } from './views/topleft'
import { camera_angle } from './utils/geometry'

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: { zoom: 19 } })
    const [isThreeReady, Three] = threeHook({ containerId: 'render_1', isDarkMode, conf: {} })
    const [isVehicleReady, Vehicle] = vehicleHook(isMapReady, Maptalks, isThreeReady, Three)

    const [dxf_loading, dxf_message] = dxfHook(cfg, isVehicleReady, Maptalks, Three)

    React.useEffect(() => {

        if (!isVehicleReady) return

        log.info('[CANVAS-Redraw]')

        const point = new Point({ Maptalks, Three })

        const tick = new Tick()
        Three.on('tick', (s: any) => event.emit('alert', { key: 'tick_three', message: s, onclose: 'tick-back' }))
        tick.on((s: number) => event.emit('alert', { key: 'tick_map', message: s > 0 ? `Will automatically reposition camera in ${s} seconds` : '', onclose: 'tick-back' }))

        event.on('stream', ({ data_gps }) => Safe(() => {

            const { A, B, TM, BM } = data_gps
            const { gps, utm, head } = data_gps

            if (Maptalks.map.isInteracting()) tick.set(10)
            tick.can() && Maptalks.map.setCenter(gps)

            Three.update(camera_angle(data_gps, true), utm)
            Vehicle.update({ gps, utm, head })

            point.update('f_m', 'grey', [TM.x, TM.y, TM.z])
            point.update('b_m', 'grey', [BM.x, BM.y, BM.z])

            point.update('left', 'red', [A.x, A.y, A.z])
            point.update('right', 'blue', [B.x, B.y, B.z])
            point.update('origin', 'green', utm)

        }, 'STREAM.DATA_GPS'))

    }, [isVehicleReady])

    return <Row id="main" style={{ height: '100%' }}>

        <Col id='render_0' span={12} style={{ height: '100%' }} />
        <Col id='render_1' span={12} style={{ height: '100%' }} />

        <>
            <TopLeft {...cfg} />
            <DeviceListView {...cfg} />
            <MiddleInfo {...cfg} />
        </>

    </Row>

}