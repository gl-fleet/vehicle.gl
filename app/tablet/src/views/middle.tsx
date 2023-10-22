import { React, Typography, Layout, Row, Col, Statistic, Carousel } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { Point, colorize, ColorG2R, ColorR2G } from 'uweb/utils'
import { ThreeView, THREE } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Safe, Delay, Loop } from 'utils/web'

import { camera_angle, camera_angle_custom } from '../helper/camera'
import { Clynder } from '../helper/clynder'

const { useEffect, useState, useRef } = React

const Style = createGlobalStyle`

    #right > div {
        left: 50% !important;
        margin-left: -40px;
    }

    .slick-slider button {
        background: orange !important;
    }

`

/*** *** *** @___MIDDLE_BASIC_VIEW___ *** *** ***/

const BasicView = ({ isDarkMode, event }: iArgs) => {

    const [_, setStatus] = useState({ x: '', y: '', el: '*', di: 0 })

    useEffect(() => {

        event.on('stream', (data) => Safe(() => {

            const x = data?.data_gps?.utm[0] ?? 0
            const y = data?.data_gps?.utm[1] ?? 0
            const el = data?.data_gps?.utm[2] ?? 0
            const di = data?.data_gps?.prec3d ?? 0
            setStatus({ x, y, el, di })

        }))

    }, [])

    const ac = colorize(Number(_.di), [12.5, 10, 7.5, 5, 2.5])
    const fontSize = 24

    return <Layout id="center-view-0" style={{ background: 'transparent', width: '100%', height: '100%' }}>

        {Number(_.di) >= 5 ? <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>

            <Col span={24}><Statistic title={`Accuracy`} value={`GPS Processing`} suffix="..." valueStyle={{ fontSize, color: 'red' }} /></Col>
            <Col span={24}><Statistic title={`Error`} value={`~${_.di}`} suffix="cm" valueStyle={{ fontSize, color: 'orange' }} /></Col>
            <Col span={24}><Statistic title={`Elevation`} value={`~${_.el}`} suffix="m" valueStyle={{ fontSize, color: 'orange' }} /></Col>

        </Row> : <>

            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={24}><Statistic title={`East`} value={_.x} suffix="" valueStyle={{ fontSize }} /></Col>
                <Col span={24}><Statistic title={`North`} value={_.y} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

            <Row gutter={16} style={{ fontWeight: 900, overflow: 'hidden', position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                <Col span={12}><Statistic title={`Accuracy`} value={_.di} suffix="cm" valueStyle={{ fontSize, color: ac }} /></Col>
                <Col span={12}><Statistic title={`Elevation`} value={_.el} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

        </>}

    </Layout>

}

/*** *** *** @___MIDDLE_PLAN_DIG_VIEW___ *** *** ***/

const PlanDigView = (cfg: iArgs) => {

    const [_, setStatus] = useState({ x: '', y: '', el: '*', di: 0 })
    const [ray, setRay] = useState({ dis: 0, dir: '*' })
    const ref: any = useRef(null)

    useEffect(() => {

        ref.current = new ThreeView({
            containerId: 'center-view-1',
            isDarkMode: cfg.isDarkMode,
            simulate: true,
            axesHelper: true,
            polrHelper: true,
            stats: null,
        })

        ref.current.onReady(() => {

            const { event } = cfg

            const N = (m: any, f = 2) => { const n = Number(m.toFixed(f)); return n >= 99 ? 99 : n; }

            event.on('dig_plan_status', (distance: number) => Safe(() => {
                event.emit('goto', 1)
                setRay({ dis: N(distance), dir: distance >= 0 ? 'CUT ↓' : 'FILL ↑' })
            }))

            event.on('stream', (data) => Safe(() => {

                const x = data?.data_gps?.utm[0] ?? 0
                const y = data?.data_gps?.utm[1] ?? 0
                const el = data?.data_gps?.utm[2] ?? 0
                const di = data?.data_gps?.prec3d ?? 0
                setStatus({ x, y, el, di })

            }))

        })

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(cfg.isDarkMode) }, [cfg.isDarkMode])

    const ac = ColorG2R(Number(_.di), [2.5, 5, 7.5, 10, 12.5])
    const dc = ColorG2R(Number(ray.dis), [10, 25, 50, 100, 500])
    const fontSize = 24

    return <Layout id="center-view-0" style={{ width: '100%', height: '100%' }}>

        <Layout id="center-view-1" style={{ width: '100%', height: '100%', background: 'orange' }}></Layout>

        {Number(_.di) >= 5 ? <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>

            <Col span={24}><Statistic title={`Accuracy`} value={`GPS Processing`} suffix="..." valueStyle={{ fontSize, color: 'red' }} /></Col>
            <Col span={24}><Statistic title={`Error`} value={`~${_.di}`} suffix="cm" valueStyle={{ fontSize, color: 'orange' }} /></Col>
            <Col span={24}><Statistic title={`Elevation`} value={`~${_.el}`} suffix="m" valueStyle={{ fontSize, color: 'orange' }} /></Col>

        </Row> : <>

            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={24}><Statistic title={`Distance`} value={ray.dis} suffix="cm" valueStyle={{ fontSize, color: dc }} /></Col>
                <Col span={24}><Statistic title={`Direction`} value={ray.dir} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

            <Row gutter={16} style={{ fontWeight: 900, overflow: 'hidden', position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                <Col span={12}><Statistic title={`Accuracy`} value={_.di} suffix="cm" valueStyle={{ fontSize, color: ac }} /></Col>
                <Col span={12}><Statistic title={`Elevation`} value={_.el} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

        </>}

    </Layout>

}

/*** *** *** @___MIDDLE_PLAN_SHOT_VIEW___ *** *** ***/

const PlanShotView = (cfg: iArgs) => {

    const [_, setStatus] = useState({ x: '', y: '', el: '*', di: 0 })
    const [ray, setRay] = useState({ dis: 0, dir: '*' })
    const ref: any = useRef()

    useEffect(() => {

        ref.current = new ThreeView({
            containerId: 'center-view-2',
            isDarkMode: cfg.isDarkMode,
            simulate: true,
            axesHelper: true,
            polrHelper: true,
            arroHelper: true,
            stats: null,
        })

        ref.current.onReady(() => {

            const N = (m: any, f = 2) => { const n = Number(m.toFixed(f)); return n >= 99 ? 99 : n; }

            const { event } = cfg
            const right: ThreeView = ref.current
            const clynder = new Clynder({ Maptalks: undefined, Three: right })
            const cly = clynder.get('clynder_target', 0.01)
            right.scene.add(cly)

            let m = { d: 0, v: [0, 0, 0], n: '*' }

            event.on('shot_plan_status', (e: any) => Safe(() => {

                event.emit('goto', 2)
                const { d, v, n } = e
                setRay({ dis: N(d), dir: n })
                m = e

            }))

            event.on('stream', ({ data_gps }) => Safe(() => {

                const { utm, prec3d } = data_gps

                const x = utm[0] ?? 0
                const y = utm[1] ?? 0
                const el = utm[2] ?? 0
                const di = prec3d ?? 0

                setStatus({ x, y, el, di })

                if (m && m.n !== '*') {

                    const { d, v, n } = m

                    const cam_far = ((d > 10000 ? 2.5 : (0.75 >= d ? 0.75 : d)) * 1.5)
                    ref.current.update(camera_angle_custom(data_gps, 4, cam_far, true), utm)

                    ref.current.arroHelper.direction(v[0], v[1], el)
                    cly.position.set(v[0], v[1], el - 0.01)

                }

            }))

        })

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(cfg.isDarkMode) }, [cfg.isDarkMode])

    const ac = ColorG2R(Number(_.di), [2.5, 5, 7.5, 10, 12.5])
    const dc = ColorG2R(Number(ray.dis), [0.10, 0.25, 0.50, 1, 5])
    const fontSize = 24

    return <Layout id="center-view-0" style={{ width: '100%', height: '100%' }}>

        <Layout id="center-view-2" style={{ width: '100%', height: '100%', background: 'orange' }}></Layout>

        {Number(_.di) >= 5 ? <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>

            <Col span={24}><Statistic title={`Accuracy`} value={`GPS Processing`} suffix="..." valueStyle={{ fontSize, color: 'red' }} /></Col>
            <Col span={24}><Statistic title={`Error`} value={`~${_.di}`} suffix="cm" valueStyle={{ fontSize, color: 'orange' }} /></Col>
            <Col span={24}><Statistic title={`Elevation`} value={`~${_.el}`} suffix="m" valueStyle={{ fontSize, color: 'orange' }} /></Col>

        </Row> : <>

            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={24}><Statistic title={`Distance[3D]`} value={ray.dis} suffix="m" valueStyle={{ fontSize, color: dc }} /></Col>
                <Col span={24}><Statistic title={`Name`} value={ray.dir} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

            <Row gutter={16} style={{ fontWeight: 900, overflow: 'hidden', position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                <Col span={12}><Statistic title={`Accuracy`} value={_.di} suffix="cm" valueStyle={{ fontSize, color: ac }} /></Col>
                <Col span={12}><Statistic title={`Elevation`} value={_.el} suffix="" valueStyle={{ fontSize }} /></Col>
            </Row>

        </>}

    </Layout>



}

/*** *** *** @___MIDDLE_VIEW_ROUTER___ *** *** ***/

export default (cfg: iArgs) => {

    const { innerWidth: iw, innerHeight: ih } = window
    const _w = Number((320 * 100 / iw).toFixed(0))
    const _h = Number((240 * 100 / ih).toFixed(0))
    const w = _w * iw / 100, h = _h * ih / 100

    const [slide, setSlide] = useState(0)
    const slider: any = useRef()

    const background = cfg.isDarkMode ? '#0e1219' : 'cornsilk'

    useEffect(() => {

        const timer: any = {}

        Loop(() => {

            const keys = Object.keys(timer)
            let activeView = false

            for (const x of keys) {
                const difs = Date.now() - timer[x]
                if (difs <= 5000) { activeView = true }
            }

            if (!activeView) { cfg.event.emit('goto', 0) }

        }, 500)

        Safe(() => cfg.event.on('_goto', (idx: number) => {

            timer[`_${idx}_`] = Date.now()

        }))

        Safe(() => cfg.event.on('goto', (idx: number) => {

            timer[`_${idx}_`] = Date.now()
            slider.current.goTo(idx)
            setSlide(idx)

        }), 'Middle.GoTo')

    }, [])

    return <Layout style={{ background, border: '2px solid grey', left: '50%', top: '50%', position: 'absolute', width: `${w}px`, height: `${h}px`, marginLeft: `-${w / 2 + 2}px`, marginTop: `-${h / 2 + 2}px`, padding: 0, zIndex: 1 }}>
        <Style />
        <Carousel beforeChange={(e: number) => { cfg.event.emit('_goto', e) }} dotPosition={'right'} effect="fade" ref={ref => { slider.current = ref }} >
            <div><div style={{ width: w, height: h - 4, background }}><BasicView {...cfg} /></div></div>
            <div><div style={{ width: w, height: h - 4, background }}><PlanDigView {...cfg} /></div></div>
            <div><div style={{ width: w, height: h - 4, background }}><PlanShotView {...cfg} /></div></div>
        </Carousel>
    </Layout>

}