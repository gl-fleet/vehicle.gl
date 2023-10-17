import { MapView, maptalks } from 'uweb/maptalks'
import { Win } from 'utils/web'

export class Left {

    public base = maptalks
    public can: MapView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, cfg: iArgs) {

        this.can = new MapView({
            containerId: id,
            isDarkMode: cfg.isDarkMode,
            animateDuration: 250,
            urlTemplate: Win.env.tile,
            simulate: false,
        })

        this.can.onReady(() => {

            cfg.event.on('mode', (isDark: boolean) => this.can.setMode(isDark))

            this.ready = true
            this.cb('ready')

        })


    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}