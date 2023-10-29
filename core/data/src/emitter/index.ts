import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { Now, Safe, Loop, log } from 'utils'

import { tEvent, roughSizeOfObject, wr, f } from './helper'

export class Emitter {

    public local: Host
    public cloud: Connection
    public sequelize: Sequelize

    public channel: string = 'stream'
    public delay: any = { cloud: 1000, local: 500, parse: 100 }
    public state: any = {
        last_pub_cloud: 0,
        is_cloud_pubing: false,
        last_pub_local: 0,
        is_local_pubing: false,
        prev_state: 'unk',
    }
    public data: any = {}
    public inj: any = {}
    public cbs: any = {}

    constructor({ cloud, local, sequelize }: { cloud: Connection, local: Host, sequelize: Sequelize }) {

        log.success(`[Emitter] is starting ...`)

        this.cloud = cloud
        this.local = local
        this.sequelize = sequelize

        local.on('status', () => this.data)

        local.on('status-local', () => {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => {
                if (this.data[key]?.out?.local) obj[key] = this.data[key].out.local
            })
            const kb = (roughSizeOfObject(obj) / 1024).toFixed(1)
            obj.size = `[emitter.local] -> ${kb} kb to be sent to local!`

            return obj

        })

        local.on('status-cloud', () => {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => {
                if (this.data[key]?.out?.cloud) obj[key] = this.data[key].out.cloud
            })
            const kb = (roughSizeOfObject(obj) / 1024).toFixed(1)
            obj.size = `[emitter.cloud] -> ${kb} kb to be sent to cloud!`

            return obj

        })

        this.collect()
        this.inject()

    }

    /*** *** *** @___Callback_Events___ *** *** ***/

    on = (key: tEvent, cb: any) => {
        this.cbs[key] = cb
    }

    emit = (key: tEvent, values: any): boolean => {
        try { return typeof this.cbs[key] === 'undefined' ? true : this.cbs[key](values) } catch { return false }
    }

    /*** *** *** @___HTTP_Events___ *** *** ***/

    pub_local = () => {

        if ((Date.now() - this.state.last_pub_local) >= this.delay.local) {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => {
                if (this.data[key]?.out?.local) obj[key] = this.data[key].out.local
            })

            this.state.last_pub_local = Date.now()
            this.emit('pub_local', obj) && this.local.emit(this.channel, obj)

        }

    }

    pub_cloud = () => {

        const is_ignored = (obj: any) => {

            let can_ignore = false
            const activity = obj.data_activity ? obj.data_activity.state : 'unk'
            const is_stopped = activity.indexOf('stopped') !== -1
            if (is_stopped && this.state.prev_state === activity) { can_ignore = true }
            this.state.prev_state = activity
            return can_ignore

        }

        if ((Date.now() - this.state.last_pub_cloud) >= this.delay.cloud) {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => {
                if (this.data[key]?.out?.cloud) obj[key] = this.data[key].out.cloud
            })

            this.state.last_pub_cloud = Date.now()
            !is_ignored(obj) && this.emit('pub_cloud', obj)

            if (this.cloud.cio.connected && !this.state.is_cloud_pubing) {
                this.state.is_cloud_pubing = true
                this.cloud.set(this.channel, obj)
                    .then(() => { })
                    .catch(e => log.error(`[Emitter] While sending to cloud / ${e.message}`))
                    .finally(() => { this.state.is_cloud_pubing = false })
            }

        }

    }

    /*** *** *** @___Data_Parsers__ *** *** ***/

    parser_gpsx = (e: any) => wr(() => ({
        cloud: [e.state, e.data.fix, e.data.sat],
        local: e,
    }))

    parser_gps = (e: any) => wr(() => {

        const { rotate, map, status } = e
        const { A, B, C, D, MP } = e
        const { TL, TM, TR, BL, BM, BR } = e
        const clear = {
            prec2d: f((Math.abs(status.distFix - status.dist3D) * 100), 1),
            prec3d: f((Math.abs(status.distFix - status.dist2D) * 100), 1),
            gps: [f(map[1], 6), f(map[0], 6), 0], /** map[lat,lon] -> gps[lon,lat] **/
            utm: [f(MP.x), f(MP.y), f(MP.z)],
            head: f(rotate[2], 4),
        }

        const cloud = { ...clear }
        const local = {
            ...clear,
            A, B, C, D,
            TL, TM, TR,
            BL, BM, BR,
        }

        return { cloud, local }

    })

    parser_gsm = (e: any) => wr(() => ({
        local: {
            state: e.state,
            quality: e.data.quality,
            operator: e.data.operator,
            message: e.message,
        },
        cloud: {
            state: e.state,
            quality: e.data.quality,
            operator: e.data.operator,
        },
    }))

    parser_rtcm = (e: any) => wr(() => ({
        local: { state: e.state, message: e.message },
        cloud: { state: e.state },
    }))

    parser_activity = (e: any) => wr(() => ({
        local: { state: e.state, speed: [f(e.avg1.s, 3), f(e.avg2.s, 3)] },
        cloud: { state: e.state, speed: [f(e.avg1.s, 3), f(e.avg2.s, 3)] },
    }))

    /*** *** *** @___HTTP_Data_Collectors__ *** *** ***/

    inject = () => {

        Loop(() => Safe(async () => {

            const sockets = await this.local.io.fetchSockets()
            const ips = sockets.map((socket: any) => socket.handshake.headers.origin)
            const fips = ips.filter((e: any) => typeof e === 'string')
            this.data.inj_clients = { out: { local: fips, cloud: fips } }

        }), 10 * 1000)
    }

    collect = () => {

        this.data = {

            data_gps1: { parser: this.parser_gpsx, inp: {}, out: {}, time: 0 },
            data_gps2: { parser: this.parser_gpsx, inp: {}, out: {}, time: 0 },
            data_gps: { parser: this.parser_gps, inp: {}, out: {}, time: 0 },
            data_gsm: { parser: this.parser_gsm, inp: {}, out: {}, time: 0 },
            data_rtcm: { parser: this.parser_rtcm, inp: {}, out: {}, time: 0 },
            data_activity: { parser: this.parser_activity, inp: {}, out: {}, time: 0 },

        }

        const publish = (key: string) => {

            this.emit('update', key)
            this.pub_local()
            this.pub_cloud()

        }

        Object.keys(this.data).map((key: string) => {

            log.warn(`Listening on channel -> [${key}]`)

            this.local.on(key, ({ body }) => {

                try {

                    const p = this.data[key]
                    if (p && (Date.now() - p.time) >= this.delay.parse) {

                        p.time = Date.now()
                        p.inp = body
                        p.out = p.parser(p.inp)
                        publish(key)

                    }

                } catch (err: any) {

                    log.error(`[${key}] -> ${err.message}`)
                    throw new Error(`[${key}] -> ${err.message}`)

                }

            })

        })

    }

}