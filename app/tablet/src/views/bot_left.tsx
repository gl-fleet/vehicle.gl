import { React, Typography, Progress, Timeline } from 'uweb'
import { ColorG2R, ColorR2G } from 'uweb/utils'
import { createGlobalStyle } from 'styled-components'
import { Safe } from 'utils/web'
import {
    CheckCircleOutlined,       // Success
    CheckOutlined,             // Info
    ExclamationCircleOutlined, // Warning
    CloseCircleOutlined,       // Error
    SyncOutlined,              // Loading
} from '@ant-design/icons'

const { useEffect, useState } = React
const { Text } = Typography

const Style = createGlobalStyle`
    .ant-timeline > li {
        padding-bottom: 8px !important;
    }
    .ant-timeline > li:last-child {
        padding-bottom: 0px !important;
    }
    .ant-timeline > li:last-child .ant-timeline-item-content {
        min-height: 36px !important;
    }
    .ant-timeline-item-head {
        background: transparent !important;
    }
    .maptalks-attribution {
        display: none;
    }
    #render_1 > div {}
`

type iMessage = 'success' | 'info' | 'error' | 'warning' | 'loading'

const getColor = (t: iMessage | any) => {
    const c: any = {
        'success': '#52c41a',
        'info': 'blue',
        'error': 'red',
        'warning': 'orange',
        'loading': '#1668dc',
    }
    return c[t] ?? 'grey'
}

const getIcon = (t: iMessage | any) => {
    const style = { fontSize: '12px', background: 'transparent' }
    const c: any = {
        'success': <CheckCircleOutlined style={style} />,
        'info': <CheckOutlined style={style} />,
        'warning': <ExclamationCircleOutlined style={style} />,
        'error': <CloseCircleOutlined style={style} />,
        'loading': <SyncOutlined spin style={style} />,
    }
    return c[t] ?? <ExclamationCircleOutlined style={style} />
}

const f = (n: number, d: number = 2) => typeof n === 'number' ? n.toFixed(d) : '0.00'

export default (cfg: iArgs) => {

    const [gsm, setGSM] = useState<any>({ state: 'loading', message: 'Loading ...', data: null })
    const [gps1, setGPS1] = useState<any>({ state: 'loading', message: 'Loading ...', data: null })
    const [gps2, setGPS2] = useState<any>({ state: 'loading', message: 'Loading ...', data: null })
    const [rtcm, setRTCM] = useState<any>({ state: 'loading', message: 'Loading ...', data: null })
    const [net, setNet] = useState<any>(`...`)

    useEffect(() => {

        cfg.event.on('stream', (args: any) => Safe(() => {

            const { data_gps1, data_gps2, data_gsm, data_rtcm, value } = args
            typeof data_gps1 !== 'undefined' && setGPS1(data_gps1)
            typeof data_gps2 !== 'undefined' && setGPS2(data_gps2)
            typeof data_rtcm !== 'undefined' && setRTCM(data_rtcm)
            typeof data_gsm !== 'undefined' && setGSM(data_gsm)
            value && setNet(`Receive ${value.rx ?? 0} kbps / Transmit ${value.tx ?? 0} kbps`)

        }, 'BOT_LEFT.LISTEN'))

    }, [])

    const sat1c = ColorR2G(Number(gps1.data?.sat), [18, 21, 24, 27, 30])
    const sat2c = ColorR2G(Number(gps2.data?.sat), [18, 21, 24, 27, 30])

    return <>
        <Style />
        <Timeline
            style={{ minWidth: 480, zIndex: 1, position: 'absolute', left: 28, bottom: 0, fontWeight: 800, color: '#fff' }}
            items={[
                {
                    color: getColor(gsm.state),
                    dot: getIcon(gsm.state),
                    children: gsm.state !== 'success' ? <Text style={{ color: getColor(gsm.state) }}>{gsm.message}</Text>
                        : <Text>
                            <Text>Network: </Text>
                            <Text style={{ color: '#52c41a' }}>{gsm.operator ?? ''}</Text>
                            <Text> / </Text>
                            <Text><Progress percent={gsm.quality} steps={5} strokeColor={ColorR2G(gsm.quality, [30, 50, 70, 90, 100])} /></Text>
                        </Text>,
                },
                {
                    color: getColor(gps1.state),
                    dot: getIcon(gps1.state),
                    children: gps1.state !== 'success' ? <Text style={{ color: getColor(gps1.state) }}>{gps1.message}</Text>
                        : <>
                            <Text>GPS-1: </Text>
                            <Text style={{ color: gps1.data?.vco }}>{(gps1.data.fix ?? '').toUpperCase()}</Text>
                            <Text style={{ color: sat1c }}> {gps1.data.sat}_SATS</Text>
                            <Text> / {f(gps1.data.est)} / {f(gps1.data.nrt)} / {f(gps1.data.ele)} / V_{f(gps1.data.vac, 1)} H_{f(gps1.data.hac, 1)} </Text>
                        </>,
                },
                {
                    color: getColor(gps2.state),
                    dot: getIcon(gps2.state),
                    children: gps2.state !== 'success' ? <Text style={{ color: getColor(gps2.state) }}>{gps2.message}</Text>
                        : <>
                            <Text>GPS-2: </Text>
                            <Text style={{ color: gps2.data.vco }}>{(gps2.data.fix ?? '').toUpperCase()}</Text>
                            <Text style={{ color: sat2c }}> {gps2.data.sat}_SATS</Text>
                            <Text> / {f(gps2.data.est)} / {f(gps2.data.nrt)} / {f(gps2.data.ele)} / V_{f(gps2.data.vac, 1)} H_{f(gps2.data.hac, 1)} </Text>
                        </>,
                },
                {
                    color: getColor(rtcm.state),
                    dot: getIcon(rtcm.state),
                    children: <Text style={{ color: getColor(rtcm.state) }}>{rtcm.message}</Text>
                },
                {
                    color: getColor('info'),
                    dot: getIcon('success'),
                    children: <Text>NET: {net}</Text>
                }
            ]}
        />
    </>

}