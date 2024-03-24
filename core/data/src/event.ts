import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, Op } from 'sequelize'
import { Safe, Loop, decodeENV, moment, dateFormat, Uid, Now, Sfy, log } from 'utils'

import { tEvent, roughSizeOfObject, wr, f } from './utils'

const { me } = decodeENV()

export class Event {

    public local: Host
    public cloud: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    public name = 'events'
    public channel: string = 'stream'
    public delay: any = { cloud: 2500, local: 500, parse: 100 }
    public data: any = {}
    public inj: any = {}
    public cbs: any = {}
    public timeout: any = {}
    public state: any = {
        last_pub_cloud: 0,
        is_cloud_pubing: false,
        last_pub_local: 0,
        is_local_pubing: false,
        prev_state: 'unk',
        rotation: (1000 * 60 /* 1-min */) * (60 /* 1-hr */) * (3 /* 3-hrs */),
        keep: 14 /** days **/
    }

    constructor({ cloud, local, sequelize }: { cloud: Connection, local: Host, sequelize: Sequelize }) {

        log.success(`[Emitter] is starting ...`)

        this.cloud = cloud
        this.local = local
        this.sequelize = sequelize

        local.on('status-local', () => {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => { if (this.data[key]?.out?.local) obj[key] = this.data[key].out.local })
            const kb = (roughSizeOfObject(obj) / 1024).toFixed(1)
            obj.size = `[emitter.local] -> ${kb} kb to be sent to local!`

            return obj

        })

        local.on('status-cloud', () => {

            const obj: any = {}
            Object.keys(this.data).map((key: string) => { if (this.data[key]?.out?.cloud) obj[key] = this.data[key].out.cloud })
            const kb = (roughSizeOfObject(obj) / 1024).toFixed(1)
            obj.size = `[emitter.cloud] -> ${kb} kb to be sent to cloud!`

            return obj

        })

        this.table_build()
        this.table_serve()
        this.collect()
        this.inject()

    }

    /*** *** *** @___Persisting___ *** *** ***/

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },
            data: { type: DataTypes.TEXT, defaultValue: '' },
            src: { type: DataTypes.STRING, defaultValue: me },
            dst: { type: DataTypes.STRING, defaultValue: 'master' },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] })

        Loop(() => Safe(async () => {

            const date = moment().add(-(this.state.keep), 'days').format(dateFormat)
            log.warn(`[Event] Remove / lower than equal -> ${date}`)
            const result = await this.collection.destroy({ where: { updatedAt: { [Op.lte]: date } } })
            log.success(`[Event] -> Remove / ${Sfy(result)}`)

        }), this.state.rotation)

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.body))
        this.local.on(`del-${this.name}`, async (req: any) => await this.del(req.body))

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any) => {

        const { options } = args
        delete args['options']

        return await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC']],
            ...options
        })

    }

    set = async (args: any) => {

        const { options } = args
        delete args['options']

        if (args.id) { /** gonna update **/

            const [updatedRows] = await this.collection.update({ ...args, updatedAt: Now() }, {
                where: { id: args.id, src: me }, ...options, individualHooks: true
            })

            if (updatedRows > 0) return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} updated!`
            else throw new Error(`Permission denied!`)

        } else {

            const [instance] = await this.collection.upsert({ ...args, data: Sfy(args.data) }, { ...options })
            return `${instance.id} is created!`

        }

    }

    del = async ({ id }: { id: string }) => {

        const [updatedRows] = await this.collection.update({ updatedAt: Now(), deletedAt: Now() }, { where: { id: id, src: me }, individualHooks: true })
        if (updatedRows > 0) return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} deleted!`
        else throw new Error(`Permission denied!`)

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
            Object.keys(this.data).map((key: string) => { if (this.data[key]?.out?.local) obj[key] = this.data[key].out.local })

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
            Object.keys(this.data).map((key: string) => { if (this.data[key]?.out?.cloud) obj[key] = this.data[key].out.cloud })

            this.state.last_pub_cloud = Date.now()
            !is_ignored(obj) && this.emit('pub_cloud', obj)

            if (!this.state.is_cloud_pubing) {

                this.state.is_cloud_pubing = true
                this.set({ type: 'status', name: 'device', data: obj })
                    .then((e) => { })
                    .catch(e => log.error(`[Event] While saving / ${e.message}`))
                    .finally(() => { this.state.is_cloud_pubing = false })

            }

        }

    }

    /*** *** *** @___Data_Parsers__ *** *** ***/

    parser_gpsx = (e: any) => wr(() => ({
        cloud: [e.state, e.data.fix, e.data.sat, e.data.vac, e.data.hac, e.data.spd],
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
            message: e.message,
            quality: e.data.quality,
            operator: e.data.CPSI ? e.data.CPSI : e.data.operator ?? '...'
        },
        cloud: {
            state: e.state,
            quality: e.data.quality,
            operator: e.data.CPSI ? e.data.CPSI : e.data.operator ?? '...'
        },
    }))

    parser_rtcm = (e: any) => wr(() => ({
        local: { state: e.state, message: e.message },
        cloud: { state: e.state },
    }))

    parser_activity = (e: any) => wr(() => ({
        local: { state: e.state, speed: [f(e.avg1.s, 3), f(e.avg2.s, 3)] },
        cloud: { state: e.state },
    }))

    parser_value = (ne: any = {}, pr: any = {}) => wr(() => {

        Object.keys(ne).map(key => { this.timeout[key] = Date.now() })

        return {
            local: { ...pr.local, ...ne },
            cloud: { ...pr.cloud, ...ne },
        }

    })

    /*** *** *** @___HTTP_Data_Collectors__ *** *** ***/

    inject = () => Loop(() => Safe(async () => {

        const sockets = await this.local.io.fetchSockets()
        const ips = sockets.map((socket: any) => socket.handshake.headers.origin)
        const fips = ips.filter((e: any) => typeof e === 'string')
        this.data.inj_clients = { out: { local: fips, cloud: fips } }

        /** Remove temporary values when GTE 7.5s **/
        if (this.data.value && this.data.value.out) {

            const cloud = this.data.value.out.cloud
            const local = this.data.value.out.local

            Object.keys(this.timeout).map((key: string) => {

                if ((Date.now() - this.timeout[key]) >= 7500) {
                    delete cloud[key]
                    delete local[key]
                    delete this.timeout[key]
                }

            })

        }

    }), 10 * 1000)

    collect = () => {

        this.data = {

            data_gps1: { parser: this.parser_gpsx, inp: {}, out: {}, time: 0 },
            data_gps2: { parser: this.parser_gpsx, inp: {}, out: {}, time: 0 },
            data_gps: { parser: this.parser_gps, inp: {}, out: {}, time: 0 },
            data_gsm: { parser: this.parser_gsm, inp: {}, out: {}, time: 0 },
            data_rtcm: { parser: this.parser_rtcm, inp: {}, out: {}, time: 0 },
            data_activity: { parser: this.parser_activity, inp: {}, out: {}, time: 0 },
            value: { parser: this.parser_value, inp: {}, out: {}, time: 0 },

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
                        p.out = p.parser(p.inp, p.out)
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