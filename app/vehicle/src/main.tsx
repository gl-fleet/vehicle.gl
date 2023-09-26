import { React, Row, Col } from 'uweb'
import { Loop, Delay, Safe, log } from 'utils/web'
import { Point } from 'uweb/utils'

import { mapHook } from './hooks/map'
import { threeHook } from './hooks/three'
import { vehicleHook } from './hooks/vehicle'
import { dxfHook } from './hooks/dxf'

import { DeviceListView } from './views/device'
import { MiddleInfo } from './views/raycast'

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })
    const [isThreeReady, Three] = threeHook({ containerId: 'render_1', isDarkMode, conf: {} })
    const [isVehicleReady, Vehicle] = vehicleHook(isMapReady, Maptalks, isThreeReady, Three)
    const [dxf_loading, dxf_message] = dxfHook(cfg, isVehicleReady, Maptalks, Three)

    useEffect(() => {

        if (!isVehicleReady) return

        log.info('[CANVAS-Redraw]')

        const point = new Point({ Maptalks, Three })

        event.on('GPS-calc', (arg: any) => {

            const { M, A, B, C, D, TL, TM, TR, BM, MP, camera } = arg

            Maptalks.view('TOP', arg)
            Three.view('TOP', arg)
            Vehicle.update(arg)

            point.update('left', 'red', [A.x, A.y, A.z])
            point.update('right', 'blue', [B.x, B.y, B.z])
            point.update('TL', 'orange', [TL.x, TL.y, TL.z])
            point.update('MP', 'green', [MP.x, MP.y, MP.z])
            point.update('TR', 'orange', [TR.x, TR.y, TR.z])

        })

    }, [isVehicleReady])

    return <Row id="main" style={{ height: '100%' }}>

        <DeviceListView {...cfg} />
        <MiddleInfo {...cfg} />
        <Col id='render_0' span={12} style={{ height: '100%' }} />
        <Col id='render_1' span={12} style={{ height: '100%' }} />

    </Row>

}