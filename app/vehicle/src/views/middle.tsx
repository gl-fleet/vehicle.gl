import { React, Typography, Layout, Row, Col, Statistic } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { Point, colorize } from 'uweb/utils'
import { ThreeView, THREE } from 'uweb/three'
import { Safe, Delay } from 'utils/web'

const { useEffect, useState, useRef } = React

const Style = createGlobalStyle`
    #render_1 > div {
        left: 50% !important;
        margin-left: -40px;
    }
`

export const MiddleInfo = (cfg: iArgs) => {

    const ref: { current: ThreeView } = useRef(null)

    const { innerWidth: iw, innerHeight: ih } = window
    const _w = Number((320 * 100 / iw).toFixed(0))
    const _h = Number((240 * 100 / ih).toFixed(0))
    const w = _w * iw / 100, h = _h * ih / 100

    const [status, setStatus] = useState({ EL: '*', DIF: 0 })
    const [ray, setRay] = useState({ DIST: 0, DIR: '*' })

    useEffect(() => {

        const N = (m: any, f = 2) => {
            const n = Number(m.toFixed(f))
            return n >= 99 ? 99 : n
        }

        const { event } = cfg

        event.on('raycast', (distance: number) => Safe(() => {
            setRay({ DIST: N(distance), DIR: distance >= 0 ? 'CUT ↓' : 'FILL ↑' })
        }))

        event.on('stream', ({ data_gps: { prec3d, utm } }) => Safe(() => {
            setStatus({ EL: utm[2], DIF: prec3d })
        }))

        ref.current = new ThreeView({
            containerId: 'center-view',
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

    const cd = colorize(Number(ray.DIST), [10, 1, 0.5, 0.25, 0.1])
    const ca = colorize(Number(status.DIF), [12.5, 10, 7.5, 5, 2.5])

    return <Layout style={{ border: '2px solid red', left: '50%', top: '50%', position: 'absolute', textShadow: '0px 2px 3px #000', width: `${w}px`, height: `${h}px`, marginLeft: `-${w / 2 + 2}px`, marginTop: `-${h / 2 + 2}px`, padding: 0, zIndex: 1 }}>

        <Style />

        <Layout id="center-view" style={{ width: '100%', height: '100%' }}></Layout>

        {Number(status.DIF) >= 5 ? (
            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={24}><Statistic title={`Accuracy`} value={'Processing'} suffix="..." valueStyle={{ fontSize: 28, color: 'red' }} /></Col>
            </Row>
        ) : (
            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={12}><Statistic title={`Distance`} value={ray.DIST} suffix="m" valueStyle={{ fontSize: 28, color: cd }} /></Col>
                <Col span={12}><Statistic title={`Direction`} value={ray.DIR} suffix="" valueStyle={{ fontSize: 28 }} /></Col>
            </Row>
        )}

        <Row gutter={16} style={{ fontWeight: 900, overflow: 'hidden', position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <Col span={12}><Statistic title={`Accuracy`} value={status.DIF} suffix="cm" valueStyle={{ fontSize: 28, color: ca }} /></Col>
            <Col span={12}><Statistic title={`Elevation`} value={status.EL} suffix="" valueStyle={{ fontSize: 28 }} /></Col>
        </Row>

    </Layout>

}