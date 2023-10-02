import { React, Typography, Layout, Row, Col, Statistic } from 'uweb'
import { Point, colorize } from 'uweb/utils'
import { Delay, log } from 'utils/web'

import { MapView } from 'uweb/maptalks'
import { THREE, ThreeView } from 'uweb/three'

import { Triangle, GeojsonParser, LineString } from './dxf_helper'

const { useEffect, useState, useRef } = React

export const dxfHook = (
    cfg: iArgs,
    Ready: boolean,
    Maptalks: MapView,
    Three: ThreeView
): [boolean, string] => {

    const [state, setState] = useState([false, ''])

    useEffect(() => {

        if (!Ready) return

        const { event, io: { io } } = cfg

        const Polygon = new Triangle({ Maptalks, Three })
        const Lines = new LineString({ Maptalks, Three })

        event.on('GPS-calc', (arg: any) => {
            Polygon.ray(arg.MP, ({ distance }: any) => event.emit('raycast', distance))
        })

        event.on('dxf-geojson', (name) => {

            setState(true, `[${name}]: Fetching ...`)
            event.emit('alert', { key: 'file', message: `File:${name} is loading ...` })

            io.pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    setState(true, `[${name}]: Rendering ...`)
                    const { polygons, linestrings } = GeojsonParser(data)

                    Polygon.updateAll(polygons)
                    Lines.updateAll(linestrings)

                    Delay(() => setState(false, err ? `[${name}]: ${err.message}` : ''), 250)
                    event.emit('alert', { key: 'file', type: err ? 'error' : 'success', message: `File ${name} ${err ? err.message : 'is loaded'}` })

                } catch (err: any) {

                    setState(false, `[${name}]: ${err.mssage}`)
                    event.emit('alert', { key: 'file', type: 'error', message: `[${name}] ${err.message}` })

                }

            })

        })

    }, [Ready])

    return [state[0], state[1]]

}