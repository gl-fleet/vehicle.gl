import type { MapView } from 'uweb/maptalks'
import type { ThreeView } from 'uweb/three'

import { React, Button, Drawer, Row, Col, Tabs, message } from 'uweb'
import { Safe, Delay } from 'utils/web'

import DrillSession from '../comps/drill'
import { Clynder } from '../helper/clynder'
import { CSV_GeoJson_Parser } from '../helper/parsers'

const { useEffect, useState } = React

const ShotPoller = ({ api, body, name, hid }: any) => {

    const [init, setInit]: any = useState(false)

    useEffect(() => {

        api.get('get-events', { options: { order: [['updatedAt', 'DESC']], limit: 1, }, type: 'shot-actual', name: `${name}-${hid}` }).then((e: any) => {

            if (Array.isArray(e) && e.length > 0 && e[0].data) {

                const jsn = JSON.parse(e[0].data)
                setInit(jsn)

            } else {
                setInit(undefined)
            }

        }).catch((e: any) => {
            setInit(undefined)
        })

    }, [])

    if (init === false) return 'Loading...'

    console.log(name, hid, init)

    return <DrillSession
        initialData={init}
        {...body}
        onComplete={(summary: any) => {
            console.log(summary)
            api.set('set-events', { type: 'shot-actual', name: `${name}-${hid}`, data: summary }) // ???
        }}
    />

}

export const HelperShot = (cfg: iArgs & { half: boolean }) => {

    const [msgApi, contextHolder] = message.useMessage()
    const [open, setOpen] = useState(false)
    const [shot, setShot] = useState('')
    const [shots, setShots] = useState([])

    useEffect(() => {

        const { event } = cfg

        const asked: any = {}

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
                        children: <ShotPoller api={cfg.api} body={body} name={name} hid={hid} />
                    }

                }))

            }

        }

        event.on('shot_plan_status', (e: any) => Safe(() => {

            setShot((c) => {

                if (c === '') {
                    asked[e.n] = 50
                    return e.n
                }

                if (c !== e.n && e.d2 <= 0.5) { // Different from selected

                    if (asked.hasOwnProperty(e.n)) {

                        asked[e.n] += 1
                        if (asked[e.n] === 20) {
                            Delay(() => { setShot(e.n) }, 15 * 1000)
                            msgApi.open({
                                type: 'success',
                                content: `Automatic selection of ${e.n} in 10 seconds.`,
                                duration: 15,
                            })
                        }

                    } else asked[e.n] = 1

                }

                return c

            })

        }))

        event.on('shots', handler)
        return () => { event.off('shots', handler) }

    }, [])

    useEffect(() => {

        const { event } = cfg
        event.emit('half', open)

    }, [open])

    return <>
        {contextHolder}
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
                activeKey={shot}
                onChange={(k) => setShot(k)}
                tabPosition={'top'}
                items={shots}
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