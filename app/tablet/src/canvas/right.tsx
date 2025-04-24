import { ThreeView } from 'uweb/three'

export class Right {

    public can: ThreeView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, cfg: iArgs) {

        this.can = new ThreeView({
            containerId: id,
            isDarkMode: cfg.isDarkMode,
            simulate: false,
            axesHelper: true,
            polrHelper: true,
            // devicePixelRatio: 0.9,
            // fps: 30,
            antialias: false,
        })

        this.can.onReady(() => {

            cfg.event.on('mode', (isDark: boolean) => this.can.setMode(isDark))
            this.ready = true
            this.cb('ready')

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}