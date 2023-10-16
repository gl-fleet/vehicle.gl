import { THREE, ThreeView } from 'uweb/three'

export class Right {

    public base = THREE
    public can: ThreeView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, mode: boolean) {

        this.can = new ThreeView({
            containerId: id,
            isDarkMode: mode,
            simulate: false,
            axesHelper: true,
            polrHelper: true,
        })

        this.can.onReady(() => {
            this.ready = true
            this.cb('ready')
        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}