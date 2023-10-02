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

const { useEffect, useState, useRef } = React

const n = Win.env.mode === 'development' ? [1, 0.75] : [0, 1]
const Style = createGlobalStyle`
    html, body { 
        filter: grayscale(${n[0]}) brightness(${n[1]});
    }`

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: { zoom: 20 } })
    const [isThreeReady, Three] = threeHook({ containerId: 'render_1', isDarkMode, conf: {} })
    const [isVehicleReady, Vehicle] = vehicleHook(isMapReady, Maptalks, isThreeReady, Three)
    const [dxf_loading, dxf_message] = dxfHook(cfg, isVehicleReady, Maptalks, Three)

    useEffect(() => {

        if (!isVehicleReady) return

        log.info('[CANVAS-Redraw]')

        const point = new Point({ Maptalks, Three })

        const tick = new Tick()
        Three.on('tick', (s: any) => event.emit('alert', { key: 'tick', message: s, onclose: 'tick-back' }))
        tick.on((s: number) => event.emit('alert', { key: 'tick_map', message: s > 0 ? `Will automatically reposition camera in ${s} seconds` : '', onclose: 'tick-back' }))

        event.on('GPS-calc', (arg: any) => {

            const { A, B, TL, TR, MP, coords } = arg

            if (Maptalks.map.isInteracting()) tick.set(10)
            tick.can() && Maptalks.map.setCenter([coords.front[1], coords.front[0]])

            Three.view('RIGHT', { ...arg, camera: { right: camera_angle(arg) } })
            Vehicle.update(arg)

            point.update('left', 'red', [A.x, A.y, A.z])
            point.update('right', 'blue', [B.x, B.y, B.z])
            point.update('TL', 'orange', [TL.x, TL.y, TL.z])
            point.update('MP', 'green', [MP.x, MP.y, MP.z])
            point.update('TR', 'orange', [TR.x, TR.y, TR.z])

        })

    }, [isVehicleReady])

    return <Row id="main" style={{ height: '100%' }}>

        <Style />

        <Col id='render_0' span={12} style={{ height: '100%' }} />
        <Col id='render_1' span={12} style={{ height: '100%' }} />

        <>
            <TopLeft {...cfg} />
            <DeviceListView {...cfg} />
            <MiddleInfo {...cfg} />
        </>

    </Row>

}