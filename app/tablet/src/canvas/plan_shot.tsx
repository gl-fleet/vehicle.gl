import type { MapView } from 'uweb/maptalks'
import type { ThreeView } from 'uweb/three'
import { THREE } from 'uweb/three'
import { colorize, ColorG2R } from 'uweb/utils'
import { React, Button, Drawer, Row, Col, Tabs, Card, Select, Space, message } from 'uweb'
import { Safe, Delay, KeyValue } from 'utils/web'

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

        }).catch((e: any) => { setInit(undefined) })

    }, [])

    if (init === false) return 'Loading...'

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
    const [title, setTitle]: any = useState(`-`)
    const [subTitle, setSubTitle]: any = useState(`-`)
    const [selectItems, setSelectItems] = useState([])
    const [shot, setShot] = useState('')
    const [shots, setShots] = useState([])

    useEffect(() => {

        const { event } = cfg

        const asked: any = {}

        const handler = (arg: any) => {

            if (typeof arg === 'boolean') setOpen(arg)
            else {

                const { name, rows } = arg

                setTitle(`${name} ( ${rows.length} )`)

                setSelectItems(rows.map(([hid, east, north, elev, depth]: any) => {

                    return {
                        value: hid,
                        label: <span>{hid}</span>
                    }

                }))

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

            const d3c = ColorG2R(Number(e.d3), [0.10, 0.25, 0.50, 1, 5])
            const d2c = ColorG2R(Number(e.d2), [0.10, 0.25, 0.50, 1, 5])
            setSubTitle(<span><b>{e.n}</b> ( <b style={{ color: d3c }}>3D: {(e.d3).toFixed(2)}m</b> <b style={{ color: d2c }}>2D: {(e.d2).toFixed(2)}m</b> )</span>)

            setShot((c) => {

                if (c === '') {
                    asked[e.n] = 50
                    return e.n
                }

                if (c !== e.n && e.d2 <= 0.5) { // Different from selected

                    if (asked.hasOwnProperty(e.n)) {

                        asked[e.n] += 1
                        if (asked[e.n] === 20) {
                            Delay(() => { setShot(e.n) }, 60 * 1000)
                            msgApi.open({
                                type: 'success',
                                content: `Automatic selection of ${e.n} in 60 seconds.`,
                                duration: 60,
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
            title={<>{title} / {subTitle}</>}
            closable={{ 'aria-label': 'Close Button' }}
            onClose={() => { setOpen(false) }}
            extra={
                <Space>
                    <Select
                        style={{ minWidth: 240 }}
                        onChange={(k) => setShot(k)}
                        value={shot}
                        options={selectItems}
                    />
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </Space>
            }
            open={open}
            placement='bottom'
            height="100vh"
            styles={{
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
            {/* <Row>
                <Col span={20}>
                    <Tabs
                        centered={true}
                        activeKey={shot}
                        onChange={(k) => setShot(k)}
                        tabPosition={'top'}
                        items={shots}
                    />
                </Col>
                <Col span={24}>
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ position: 'relative', width: 320, height: 240 }}>
                            <PlanShotView {...cfg} cid={'inside-drawer'} />
                        </div>
                    </Card>
                </Col>
            </Row> */}
        </Drawer>
    </>

}

export class PlanShot {

    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        const { api, cloud, event } = cfg

        const clynder = new Clynder({ Maptalks, Three })
        const type = 'plan_shot'

        type V3 = [number, number, number] // x, y, z
        const dist = (A: V3, B: V3) => { try { return Math.sqrt(Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2) + Math.pow(B[2] - A[2], 2)) } catch (error) { return -1 } }
        // const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 1, '#52c41a', 0.75, 0.75)
        // Three.scene.add(arrow)
        const pointAtZ = (a: V3, b: V3, z: number): V3 | null => {
            const dz = b[2] - a[2]
            if (dz === 0) return null // line is horizontal, no unique point at this z
            const t = (z - a[2]) / dz
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z]
        }

        event.on('stream', ({ data_gps = {} }) => {

            const { K, A } = data_gps

            const { d2, d3, v, n }: any = clynder.nearest(A ?? [0, 0, 0], 500 /** Within 500 meters **/)
            const pz = pointAtZ(K, A, v[2])

            if (pz) {

                /* const dir = new THREE.Vector3().subVectors(new THREE.Vector3(pz[0], pz[1], pz[2]), new THREE.Vector3(A[0], A[1], A[2])).normalize()
                const length = new THREE.Vector3().subVectors(new THREE.Vector3(pz[0], pz[1], pz[2]), new THREE.Vector3(A[0], A[1], A[2])).length()
                arrow.setDirection(dir)
                arrow.setLength(length, 0.02, 0.02)
                arrow.position.set(A[0], A[1], A[2]) */
                const ds = dist(pz, v)
                if (n && n !== '*') event.emit('shot_plan_status', { d2: ds, d3, v, n })

            }

        })

        event.on('csv-dispose', () => {
            clynder.removeAll()
        })

        cloud && Delay(() => Safe(() => {

            const cm = KeyValue('common_gps')
            const p = JSON.parse(cm)
            const { B, A, C } = p.gps[2]
            B[2] = C[2] = A[2]
            const rows: any = [
                ['D0', ...B, 10],
                ['D1', ...A, 10],
                ['D2', ...C, 10],
            ]
            console.log(rows)

            clynder.updateAll(rows)
            event.emit('shots', { name: 'demo', rows })

        }, 'Add demo shot'), 2500)

        event.on('csv-geojson', (name) => {

            event.emit('alert', { key: type, message: `[CSV] "${name}" is loading ...` });

            (cloud ?? api).pull('get-chunks-merged', { name }, (err: any, data: any) => {

                try {

                    const rows = CSV_GeoJson_Parser(data)

                    console.log(rows)

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