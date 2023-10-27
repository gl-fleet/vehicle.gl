import { React, Layout, Alert, FloatButton, message } from 'uweb'
import {
    FolderOpenOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    CodeSandboxOutlined,
    PushpinOutlined,
} from '@ant-design/icons'
import * as camera from '../helper/camera'

const { useEffect, useState } = React

export default (cfg: iArgs) => {

    const [text, setText] = useState(`...`)
    const [alert, setAlert] = useState<any>({})
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {

        const { event } = cfg

        const icons: any = {
            tick: <CodeSandboxOutlined />,
            tick_map: <CodeSandboxOutlined />,
            file: <FolderOpenOutlined />,
        }

        const showAlert = (key: string, type: any, message: string, onclose: string) => {

            if (message) {

                const temp: any = alert
                temp[key] = <Alert
                    key={key}
                    icon={icons[key]}
                    type={type}
                    message={message}
                    afterClose={() => closeAlert(key, onclose)}
                    showIcon={true}
                    closable={true}
                    style={{ marginTop: 8 }}
                />
                setAlert({ ...temp })

            } else { closeAlert(key) }

        }

        const closeAlert = (key: string, onclose: string = 'none') => {

            event.emit(onclose, key)
            const temp: any = alert
            temp[key] = null
            delete temp[key]
            setAlert({ ...temp })

        }

        event.on('stream', ({ data_activity }) => {
            data_activity && setText(`Mode: ${cfg.env.type} < ${data_activity.state} >`)
        })

        event.on('alert', ({ key, type = 'success', message, onclose = 'none' }) => {
            showAlert(key, type, message, onclose)
        })

    }, [])

    return <Layout style={{ background: 'transparent', position: 'absolute', left: 16, top: 16, padding: 0, zIndex: 100 }}>

        {contextHolder}

        <FloatButton.Group shape="circle" style={{ top: 24, zIndex: 10, height: 180 }}>
            <FloatButton onClick={() => camera.camera_zoom_in()} icon={<ZoomInOutlined />} />
            <FloatButton onClick={() => camera.camera_zoom_out()} icon={<ZoomOutOutlined />} />
            <FloatButton onClick={() => camera.camera_toggle()} icon={<CodeSandboxOutlined />} />
            <FloatButton onClick={() => {
                messageApi.open({
                    type: 'warning',
                    content: 'Permission denied!',
                })
            }} icon={<PushpinOutlined />} />
        </FloatButton.Group>

        <Alert message={text} type="success" showIcon />
        {Object.keys(alert).map((key: string) => alert[key])}

    </Layout>

}