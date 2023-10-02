import { React, Typography, Layout, Alert, FloatButton } from 'uweb'
import { FolderOpenOutlined, ZoomInOutlined, ZoomOutOutlined, CodeSandboxOutlined } from '@ant-design/icons'
import { log } from 'utils/web'
import * as camera from '../utils/geometry'

const { useEffect, useState, useRef } = React

export const TopLeft = (cfg: iArgs) => {

    const [alert, setAlert] = useState({})

    useEffect(() => {

        const icons: any = {
            tick: <CodeSandboxOutlined />,
            tick_map: <CodeSandboxOutlined />,
            file: <FolderOpenOutlined />,
        }

        cfg.event.on('alert', ({ key, type = 'success', message, onclose = 'none' }) => {

            log.success(`[${type}] -> ${message}`)

            const obj = alert

            obj[key] = message ? <Alert
                key={key}
                icon={icons[key]}
                type={type}
                message={message}
                afterClose={() => { cfg.event.emit(onclose, key) }}
                showIcon={true}
                closable={true}
                style={{ marginTop: 8 }}
            /> : null

            setAlert({ ...obj })

        })

    }, [])

    return <Layout style={{ background: 'transparent', position: 'absolute', left: 16, top: 16, padding: 0, zIndex: 100 }}>

        <FloatButton.Group shape="circle" style={{ top: 24, zIndex: 10, height: 180 }}>
            <FloatButton onClick={() => camera.camera_zoom_in()} icon={<ZoomInOutlined />} />
            <FloatButton onClick={() => camera.camera_zoom_out()} icon={<ZoomOutOutlined />} />
            <FloatButton onClick={() => camera.camera_toggle()} icon={<CodeSandboxOutlined />} />
        </FloatButton.Group>

        <Alert message={'Mode: Vehicle'} type="success" showIcon />
        {Object.keys(alert).map((key: string) => alert[key])}

    </Layout>

}