import type { MapView } from 'uweb/maptalks'
import type { ThreeView } from 'uweb/three'

import { React, Button, Drawer, Row, Col, Tabs } from 'uweb'
import { Safe, Delay } from 'utils/web'

import DrillSession from '../comps/drill'
import { Clynder } from '../helper/clynder'
import { CSV_GeoJson_Parser } from '../helper/parsers'

const { useEffect, useState } = React

export const HelperShot = (cfg: iArgs & { half: boolean }) => {

    const [open, setOpen] = useState(false)
    const [shot, setShot] = useState('')
    const [shots, setShots] = useState([])

    useEffect(() => {

        const { event } = cfg

        const handler = (arg: any) => {

            if (typeof arg === 'boolean') setOpen(arg)
            else {

                const { name, rows } = arg

                setShots(rows.map(([hid, east, north, elev, depth]: any) => {

                    const body = {
                        holeId: `${hid}`,
                        patternName: `${name} - ${hid} (${rows.length})`,
                        rigId: "RIG-04",
                        siteName: `Project · Open Pit · ${name}`,
                        rowCol: `${hid}`,
                        designDepth: depth,
                    }

                    return {
                        key: hid,
                        label: hid,
                        children: <DrillSession
                            {...body}
                            onComplete={(summary) => {
                                console.log(summary)
                                cfg.api.set('set-events', { type: 'shot-actual', name: `${name}-${hid}`, data: summary }) // ???
                            }}
                        />
                    }

                }))

            }

        }

        event.on('shot_plan_status', (e: any) => Safe(() => {

            setShot(e.n)
            // const { d2, d3, v, n } = e
            // setRay({ d2: N(d2), d3: N(d3), dir: n }) /** d2: 0.1 d3: 0.3 dir: A6 */

        }))

        event.on('shots', handler)
        return () => { event.off('shots', handler) }

    }, [])

    useEffect(() => {

        const { event } = cfg
        event.emit('half', open)

    }, [open])

    return <>
        <Drawer
            title={null}
            closable={{ 'aria-label': 'Close Button' }}
            onClose={() => { setOpen(false) }}
            open={open}
            placement='bottom'
            height="50vh"
            styles={{
                header: { display: 'none' },
                body: { padding: 0 },
                mask: { backgroundColor: 'transparent' },
            }}
        >
            <Tabs
                centered={true}
                defaultActiveKey={shot}
                // activeKey={shot}
                // destroyInactiveTabPane={true}
                tabPosition={'top'}
                items={shots}
                style={{ paddingLeft: 16 }}
            />
        </Drawer>
    </>

}

export class PlanShot {

    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        const { api, event } = cfg

        const clynder = new Clynder({ Maptalks, Three })
        const type = 'plan_shot'

        event.on('stream', (data) => {

            const { d2, d3, v, n } = clynder.nearest(data.data_gps?.A ?? [0, 0, 0], 500 /** Within 500 meters **/)
            if (n && n !== '*') event.emit('shot_plan_status', { d2, d3, v, n })

        })

        event.on('csv-dispose', () => {
            clynder.removeAll()
        })

        event.on('csv-geojson', (name) => {

            event.emit('alert', { key: type, message: `[CSV] "${name}" is loading ...` })

            api.pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    const rows = CSV_GeoJson_Parser(data)

                    clynder.updateAll(rows)

                    if (err) { }
                    else event.emit('shots', { name, rows })

                    event.emit('alert', {
                        key: type,
                        type: err ? 'error' : 'success',
                        message: `[CSV] "${name}" ${err ? err.message : 'is loaded'}`,
                        onclose: 'csv-dispose',
                    })

                } catch (err: any) {

                    event.emit('alert', {
                        key: type,
                        type: 'error',
                        message: `[CSV] "${name}" ${err.message}`
                    })

                }

            })

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}