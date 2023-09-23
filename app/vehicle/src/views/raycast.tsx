import { React, Typography, Layout, Row, Col, Statistic } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { Point, colorize } from 'uweb/utils'
import { ThreeView } from 'uweb/three'

const { useEffect, useState, useRef } = React
const { Title, Text } = Typography

const Style = createGlobalStyle``

export const MiddleInfo = (cfg: iArgs) => {

    const ref: { current: ThreeView } = useRef(null)

    const { innerWidth: iw, innerHeight: ih } = window
    const _w = Number((320 * 100 / iw).toFixed(0))
    const _h = Number((240 * 100 / ih).toFixed(0))
    const w = _w * iw / 100, h = _h * ih / 100
    const b = 2 /** Border **/

    const [D3, setD3] = useState(['*', 0])
    const [D2, setD2] = useState(['*', 0])

    const [status, setStatus] = useState({ _2D: '*', _3D: '*' })

    useEffect(() => {

        console.log(iw, ih)

        const N = (m: any, f = 2) => {
            const n = Number(m.toFixed(f))
            return n >= 99 ? 99 : n
        }

        const { event } = cfg

        event.on('3D-Range', ([name, range]) => setD3([name, range]))
        event.on('2D-Range', ([name, range]) => setD2([name, range]))
        ref.current = new ThreeView({
            containerId: 'center-view',
            isDarkMode: cfg.isDarkMode,
            simulate: true,
            axesHelper: true,
            polrHelper: true,
        })

        ref.current.onReady(() => {
            console.log('ready')
        })

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(cfg.isDarkMode)

    }, [cfg.isDarkMode])

    const c3 = colorize(Number(D3[1]), [10, 1, 0.5, 0.25, 0.1])
    const c2 = colorize(Number(D2[1]), [10, 1, 0.5, 0.25, 0.1])
    const s3 = colorize(Number(status._3D), [12.5, 10, 7.5, 5, 2.5])

    return <Layout style={{ border: '2px solid red', left: '50%', top: '50%', position: 'absolute', textShadow: '0px 2px 3px #000', width: `${w}px`, height: `${h}px`, marginLeft: `-${w / 2 + 2}px`, marginTop: `-${h / 2 + 2}px`, padding: 0, zIndex: 1 }}>

        <Layout id="center-view" style={{ width: '100%', height: '100%' }}></Layout>

        {Number(status._3D) >= 5 ? (
            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={24}><Statistic title={`Accuracy`} value={'Processing'} suffix="..." valueStyle={{ fontSize: 28, color: 'red' }} /></Col>
            </Row>
        ) : (
            <Row gutter={16} style={{ position: 'absolute', width: '100%', padding: 16, fontWeight: 800, overflow: 'hidden' }}>
                <Col span={12}><Statistic title={`${D3[0]} / 3D`} value={D3[1]} suffix="m" valueStyle={{ fontSize: 28, color: c3 }} /></Col>
                <Col span={12}><Statistic title={`${D2[0]} / 2D`} value={D2[1]} suffix="m" valueStyle={{ fontSize: 28, color: c2 }} /></Col>
            </Row>
        )}

        <Row gutter={16} style={{ fontWeight: 900, overflow: 'hidden', position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <Col span={24}><Statistic title={`Acc & Diff / 3D`} value={status._3D} suffix="cm" valueStyle={{ fontSize: 24, color: s3 }} /></Col>
        </Row>

    </Layout>

}