import { Host, Connection, ReplicaSlave } from 'unet'
import { decodeENV, Uid, Now, Loop, Safe, Sfy, moment, dateFormat, log } from 'utils'
import { DataTypes, Model, ModelStatic, Op } from 'sequelize'
import { Sequelize } from 'sequelize'

import { chunks, Responsive } from './utils'

const { me, replication_debug } = decodeENV()

export class Chunk {

    public local: Host
    public cloud: Connection
    public sequelize: Sequelize

    public name = 'chunks'
    public collection: ModelStatic<Model<any, any>> & any
    public data: any = {}
    public state: any = {
        rotation: (1000 * 60 /* 1-min */) * (60 /* 1-hr */) * (3 /* 3-hrs */),
        keep: 45 /** days **/
    }

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
            offset: { type: DataTypes.INTEGER, defaultValue: 0 },
            data: { type: DataTypes.TEXT, defaultValue: '' },
            src: { type: DataTypes.STRING, defaultValue: me },
            dst: { type: DataTypes.STRING, defaultValue: '' },
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

        this.local.on(`get-${this.name}-merged`, async ({ query }: any) => await this.get_merged(query))
        this.local.on(`get-${this.name}-distinct`, async ({ }) => await this.get_distinct())

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any) => {
        const { options } = args
        delete args['options']
        return await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC'], ['id', 'DESC']],
            ...options
        })
    }

    set = async (args: any) => {
        const { options } = args

        if (args.id) {
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
        call(cb, delay)
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })
    }

    /*** *** *** @___Table_Complex___ *** *** ***/

    get_distinct = async () => {
        return await this.collection.findAll({
            attributes: ['name', 'type', 'src', 'dst',
                [Sequelize.fn('COUNT', Sequelize.col('offset')), 'count'],
                [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'createdAt'],
                [Sequelize.fn('MAX', Sequelize.col('updatedAt')), 'updatedAt'],
            ],
            where: { deletedAt: null }, order: [['updatedAt', 'DESC']],
            group: ['name', 'type', 'src', 'dst'],
        })
    }

    get_merged = async (args: any) => {

        const rows = await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['offset', 'ASC']],
            raw: true,
        })
        return chunks.Merge(rows)

    }

}