import { React, Render, Layout, Row, Col } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Now, Win, log } from 'utils/web'

const { name, version, mode } = Win.env

log.success(`${mode}: ${name} ${version}`)

const cfg: iArgs = {
    event: new EventEmitter(),
    api: new Connection({ name: 'data' }),
    isDarkMode: true,
    proxy: Win.location.origin,
    env: Win.env,
}

cfg.api.on('stream', (args: any) => {
    cfg.event.emit('stream', args)
})

const Main = (cfg: iArgs) => {

    const [cam_imgs, set_cam_imgs] = React.useState([])
    const [map_img, set_map_img] = React.useState(<></>)

    React.useEffect(() => {

        cfg.api.on('img-camera', (body: any) => {

            const _cam_imgs: any = cam_imgs
            if (_cam_imgs.length >= 12) { _cam_imgs.shift() }
            _cam_imgs.push(<div key={`${Date.now()}`} style={{ position: 'relative', display: 'inline-block', width: '33.3%', height: '25%' }}>
                <img src={body.img} style={{ display: 'block', width: '100%', height: '100%' }} />
                <span style={{ textShadow: '0px 0px 2px #fff', color: '#000', fontWeight: 'bold', position: 'absolute', bottom: 8, width: '100%', textAlign: 'center' }}>{Now().split(' ')[1]}</span>
            </div>)
            set_cam_imgs(_cam_imgs)

        })

        cfg.api.on('img-map', (body: any) => {

            console.log(body)
            set_map_img(<img src={body.img} style={{ display: 'block', width: '100%', height: '100%' }} />)

        })

    }, [])

    return <Row style={{ height: '100%' }}>
        <Col span={12} style={{ height: '100%' }}>
            {cam_imgs}
        </Col>
        <Col span={12} style={{ height: '100%' }}>
            {map_img}
        </Col>
    </Row>

}

const Settings = (cfg: iArgs) => null

Render(
    ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />,
    ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />,
    { maxWidth: '100%' },
)