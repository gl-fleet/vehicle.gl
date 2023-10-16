import { MapView, maptalks } from 'uweb/maptalks'
import { Win } from 'utils/web'

export class Left {

    public base = maptalks
    public can: MapView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, mode: boolean) {

        this.can = new MapView({
            containerId: id,
            isDarkMode: mode,
            animateDuration: 250,
            urlTemplate: Win.env.tile,
            simulate: false,
        })

        this.can.onReady(() => {
            this.ready = true
            this.cb('ready')
        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}