import { Host, Connection, ReplicaSlave } from 'unet'
import { decodeENV, Uid, Now, Sfy, Loop, Safe, moment, dateFormat, log } from 'utils'
import { DataTypes, Model, ModelStatic } from 'sequelize'
import { Sequelize, Op } from 'sequelize'

import { Responsive } from '../helper'

const { me } = decodeENV()

export class Event {

    public local: Host
    public cloud: Connection
    public sequelize: Sequelize

    public name = 'events'
    public collection: ModelStatic<Model<any, any>> & any
    public state: any = { rotation: (1000 * 60 /* 1-min */) * (60 /* 1-hr */) * (6 /* 6-hrs */) }
    public data: any = {}

    constructor({ cloud, local, sequelize }: { cloud: Connection, local: Host, sequelize: Sequelize }) {

        this.cloud = cloud
        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()

    }

    /*** *** *** @___Table_Setup___ *** *** ***/

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

        new ReplicaSlave({
            me: me,
            name: this.name,
            table: this.collection,
            channel: this.cloud,
            retain: [30, 'days'],
            limit: 25,
            debug: false,
            delay: 2500,
        })

        Loop(() => Safe(async () => {

            const date = moment().add(-90, 'days').format(dateFormat)
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

    event = async (cb: any, delay: number = 250) => {

        const { shake, call } = new Responsive()
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })
        call(cb, delay)

    }

}