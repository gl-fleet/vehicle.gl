import { React, Typography, Layout, Row, Col, Statistic } from 'uweb'

import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

import { Triangle } from '../helper/triangle'
import { LineString } from '../helper/linestring'
import { GeojsonParser } from '../helper/parsers'

export class PlanDig {

    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        const { api, event } = cfg

        const Polygon = new Triangle({ Maptalks, Three })
        const Lines = new LineString({ Maptalks, Three })

        event.on('stream', (data) => {

            // Polygon.ray(data.data_gps?.utm ?? [0, 0, 0], ({ distance }: any) => event.emit('raycast', distance))
            Polygon.ray(data.data_gps?.utm ?? [0, 0, 0], (arg: any) => {

                const { distance } = arg
                event.emit('dig_plan_status', distance)

            })

        })

        event.on('dxf-dispose', () => {
            Polygon.removeAll()
            Lines.removeAll()
        })

        event.on('dxf-geojson', (name) => {

            event.emit('alert', { key: 'file', message: `File:${name} is loading ...` })

            api.pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    const { polygons, linestrings } = GeojsonParser(data)

                    Polygon.updateAll(polygons)
                    Lines.updateAll(linestrings)

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