import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

import { GeojsonParser } from '../helper/parsers'

export class PlanShot {

    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        const { api, event } = cfg

        /* const Polygon = new Triangle({ Maptalks, Three })
        const Lines = new LineString({ Maptalks, Three }) */

        event.on('stream', (data) => {
            // Polygon.ray(data.data_gps?.utm ?? [0, 0, 0], ({ distance }: any) => event.emit('raycast', distance))
        })

        event.on('dxf-dispose', () => {
            /* Polygon.removeAll()
            Lines.removeAll() */
        })

        event.on('plan_shot', (name) => {

            event.emit('alert', { key: 'file', message: `File:${name} is loading ...` })

            api.pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    /* const { polygons, linestrings } = GeojsonParser(data)
                    Polygon.updateAll(polygons)
                    Lines.updateAll(linestrings) */

                    event.emit('alert', {
                        key: 'file',
                        type: err ? 'error' : 'success',
                        message: `File ${name} ${err ? err.message : 'is loaded'}`,
                        onclose: 'dxf-dispose',
                    })

                } catch (err: any) {

                    event.emit('alert', {
                        key: 'file',
                        type: 'error',
                        message: `[${name}] ${err.message}`
                    })

                }

            })

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}