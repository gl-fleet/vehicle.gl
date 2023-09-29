import { Host, Connection, ReplicaSlave } from 'unet'
import { decodeENV, Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'
import { Now, Uid } from 'utils'

import { Sequelize } from 'sequelize'
import { DataTypes, Model, ModelStatic } from 'sequelize'

interface iModel {
    uchange: (cb: any, delay: number) => {}
    uget: (n: any) => {}
    uset: (n: any) => {}
    udel: (n: any) => {}
}

export class Responsive { /** Collect and Dispose gracefully **/
    queue: boolean[] = []
    shake = () => {
        this.queue.push(true)
        return true
    }
    call = (cb: () => {}, ms: number) => Loop(() => {
        if (this.queue.length > 0) {
            this.queue = []
            cb()
        }
    }, ms)
}

export const SequelTable = (table: string, sequelize: Sequelize, name: string, colls: any): ModelStatic<Model<any, any>> & iModel => {

    const { unique } = colls
    delete colls['unique']

    const indexes: any = []
    indexes.push({ unique: false, fields: ['type', 'name', 'src', 'dst', 'updatedAt'] })
    unique && indexes.push({ unique: true, fields: unique })

    log.info(`[${table}] -> ${Sfy(indexes)}`)

    const collection: ModelStatic<Model<any, any>> & any = sequelize.define(table, {

        id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },
        type: { type: DataTypes.STRING, defaultValue: '' },
        name: { type: DataTypes.STRING, defaultValue: '' },
        ...colls,
        src: { type: DataTypes.STRING, defaultValue: name },
        dst: { type: DataTypes.STRING, defaultValue: '' },
        createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
        updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
        deletedAt: { type: DataTypes.STRING, defaultValue: null },

    }, { indexes })

    collection.uchange = async (cb: any, delay: number = 250) => {

        const { shake, call } = new Responsive()
        call(cb, delay)
        collection.afterCreate(() => { shake() })
        collection.afterUpdate(() => { shake() })
        collection.afterUpsert(() => { shake() })

    }

    collection.uget = async (args: any) => {

        const { options } = args
        delete args['options']

        return await collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC']],
            ...options
        })

    }

    collection.uset = async (args: any) => {

        const { options } = args
        delete args['options']

        if (args.id) { /** gonna update **/

            const [updatedRows] = await collection.update({ ...args, updatedAt: Now() }, {
                where: { id: args.id, src: name },
                ...options,
                individualHooks: true
            })

            if (updatedRows > 0) {
                return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} updated!`
            } else {
                throw new Error(`Permission denied!`)
            }

        } else {

            const [instance, created] = await collection.upsert({ ...args, meta: Sfy(args.meta), data: Sfy(args.data) }, { ...options })
            return `${instance.id} is created!`

        }

    }

    collection.udel = async ({ id }: { id: string }) => {

        const [updatedRows] = await collection.update({ updatedAt: Now(), deletedAt: Now() }, { where: { id: id, src: name }, individualHooks: true })
        if (updatedRows > 0) {
            return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} deleted!`
        } else {
            throw new Error(`Permission denied!`)
        }

    }

    return collection

}