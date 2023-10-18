import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

import { Clynder } from '../helper/clynder'
import { CSV_GeoJson_Parser } from '../helper/parsers'

export class PlanShot {

    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        const { api, event } = cfg

        const clynder = new Clynder({ Maptalks, Three })

        event.on('stream', (data) => {

            const { d, v, n } = clynder.nearest(data.data_gps?.utm ?? [0, 0, 0], 500 /** Within 500 meters **/) //
            n && n !== '*' && event.emit('shot_plan_status', { d, v, n })

        })

        event.on('csv-dispose', () => {
            clynder.removeAll()
        })

        event.on('csv-geojson', (name) => {

            event.emit('alert', { key: name, message: `File:${name} is loading ...` })

            api.pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    const rows = CSV_GeoJson_Parser(data)

                    clynder.updateAll(rows)

                    event.emit('alert', {
                        key: name,
                        type: err ? 'error' : 'success',
                        message: `File ${name} ${err ? err.message : 'is loaded'}`,
                        onclose: 'csv-dispose',
                    })

                } catch (err: any) {

                    event.emit('alert', {
                        key: name,
                        type: 'error',
                        message: `[${name}] ${err.message}`
                    })

                }

            })

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}