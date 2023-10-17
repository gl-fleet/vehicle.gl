import { React, Typography, Layout, Row, Col, Statistic, Carousel } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { Point, colorize, ColorG2R, ColorR2G } from 'uweb/utils'
import { ThreeView, THREE } from 'uweb/three'
import { Safe, Delay } from 'utils/web'

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

const BasicView = ({ event }: iArgs) => {

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

    return <Layout id="center-view-0" style={{ width: '100%', height: '100%' }}>

        {Number(_.di) >= 0.5 ? <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>

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
    const [ray, setRay] = useState({ DIST: 0, DIR: '*' })
    const ref: any = useRef(null)

    useEffect(() => {

        const { event } = cfg

        const N = (m: any, f = 2) => { const n = Number(m.toFixed(f)); return n >= 99 ? 99 : n; }

        event.on('raycast', (distance: number) => Safe(() => {
            setRay({ DIST: N(distance), DIR: distance >= 0 ? 'CUT ↓' : 'FILL ↑' })
        }))

        ref.current = new ThreeView({
            containerId: 'center-view-1',
            isDarkMode: cfg.isDarkMode,
            simulate: true,
            axesHelper: true,
            polrHelper: true,
            stats: null,
        })

        ref.current.onReady(() => { })

    }, [])

    useEffect(() => {
        ref.current.setMode && ref.current.setMode(cfg.isDarkMode)
    }, [cfg.isDarkMode])

    const ac = colorize(Number(_.di), [12.5, 10, 7.5, 5, 2.5])
    const fontSize = 24

    return <Layout id="center-view-0" style={{ width: '100%', height: '100%' }}>

        <Layout id="center-view-1" style={{ width: '100%', height: '100%', background: 'orange' }}></Layout>

        {Number(_.di) >= 0.5 ? <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>

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

/*** *** *** @___MIDDLE_PLAN_SHOT_VIEW___ *** *** ***/

const PlanShotView = (cfg: iArgs) => {

    useEffect(() => { }, [])

    return <Layout id="center-view-2" style={{ width: '100%', height: '100%', background: 'blue' }}></Layout>

}

/*** *** *** @___MIDDLE_VIEW_ROUTER___ *** *** ***/

export default (cfg: iArgs) => {

    const { innerWidth: iw, innerHeight: ih } = window
    const _w = Number((320 * 100 / iw).toFixed(0))
    const _h = Number((240 * 100 / ih).toFixed(0))
    const w = _w * iw / 100, h = _h * ih / 100

    const [slide, setSlide] = useState(0)
    const slider: any = useRef()

    const background = cfg.isDarkMode ? 'rgba(0,0,0,0.25)' : '#bfb9b3'

    useEffect(() => {

        Safe(() => cfg.event.on('goto', (idx: number) => {

            slider.current.goTo(idx)
            setSlide(idx)

        }), 'Middle.GoTo')

    }, [])

    return <Layout style={{ border: '2px solid red', left: '50%', top: '50%', position: 'absolute', textShadow: '0px 2px 3px #000', width: `${w}px`, height: `${h}px`, marginLeft: `-${w / 2 + 2}px`, marginTop: `-${h / 2 + 2}px`, padding: 0, zIndex: 1 }}>
        <Style />
        <Carousel dotPosition={'right'} effect="fade" ref={ref => { slider.current = ref }} >
            <div>
                <div style={{ width: w, height: h - 4, background }}>
                    <BasicView {...cfg} />
                </div>
            </div>
            <div>
                <div style={{ width: w, height: h - 4, background }}>
                    <PlanDigView {...cfg} />
                </div>
            </div>
            <div>
                <div style={{ width: w, height: h - 4, background }}>
                    <PlanShotView {...cfg} />
                </div>
            </div>
        </Carousel>
    </Layout>

}