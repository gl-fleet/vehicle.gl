import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { SequelTable } from './utils/sequel'
import { Chunk } from './utils/merger'

export const initChunks = (

    io: Host,
    core: Connection,
    sequelize: Sequelize,
    me: string,
    debug: string,

) => {

    /** Building a table */
    const alias = 'chunks'
    const List = SequelTable(alias, sequelize, me, {
        meta: { type: DataTypes.TEXT, defaultValue: '' },
        offset: { type: DataTypes.INTEGER, defaultValue: 0 },
        data: { type: DataTypes.TEXT, defaultValue: '' },
    })

    /** Starting replication */
    const RepChunks = new ReplicaSlave({
        me: me,
        name: alias,
        channel: core,
        limit: 10,
        table: List,
        retain: [30, 'days'],
        debug: debug === 'true',
        delay: 1000,
    })

    /** Exposing endpoints */
    io.on(`set-${alias}`, async (req: any) => await List.uset(req.body))
    io.on(`get-${alias}`, async (req: any) => await List.uget(req.query))
    io.on(`del-${alias}`, async (req: any) => await List.udel(req.body))

    io.on(`get-${alias}-merged`, async ({ query }: any) => {
        const rows = await List.findAll({ where: { ...query, deletedAt: null }, order: [['offset', 'ASC']] })
        return Chunk.Merge(rows)
    })

    io.on(`get-${alias}-distinct`, async ({ }) => await List.findAll({
        attributes: ['name', 'type', 'meta', 'src', 'dst', 'createdAt', 'updatedAt', [Sequelize.fn('COUNT', Sequelize.col('offset')), 'count']],
        where: { deletedAt: null }, order: [['updatedAt', 'DESC']],
        group: 'name',
    }))

    return { List, RepChunks }

}