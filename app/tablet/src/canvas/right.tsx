import { ThreeView } from 'uweb/three'

export class Right {

    public can: ThreeView
    public ready = false
    public id: any = null
    public cb = (sms: string) => null

    constructor(id: string, cfg: iArgs) {

        this.id = id

        this.can = new ThreeView({
            containerId: id,
            isDarkMode: cfg.isDarkMode,
            simulate: false,
            axesHelper: true,
            polrHelper: true,
            // devicePixelRatio: 0.9,
            // fps: 30,
            antialias: false,
            arroHelper: true,
        })

        this.can.onReady(() => {

            cfg.event.on('mode', (isDark: boolean) => this.can.setMode(isDark))
            this.ready = true
            this.cb('ready')

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

    resize = () => {

        if (this.id) {

            const container: any = document.getElementById(this.id)
            const { width, height } = container.getBoundingClientRect()
            this.can.renderer.setSize(width, height)
            this.can.camera.aspect = width / height
            this.can.camera.updateProjectionMatrix()

        }

    }

}