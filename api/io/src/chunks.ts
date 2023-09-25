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
    const Chunks = SequelTable('chunks', sequelize, me, {
        meta: { type: DataTypes.TEXT, defaultValue: '' },
        offset: { type: DataTypes.INTEGER, defaultValue: 0 },
        data: { type: DataTypes.TEXT, defaultValue: '' },
    })

    /** Starting replication */
    const RepChunks = new ReplicaSlave({
        me: me,
        name: 'chunks',
        channel: core,
        limit: 25,
        table: Chunks,
        retain: [30, 'days'],
        debug: debug === 'true',
        delay: 1000,
    })

    /** Exposing endpoints */
    io.on("get-chunks", async ({ query }: any) => await Chunks.uget(query))
    io.on("set-chunks", async ({ body }: any) => await Chunks.uset(body))
    io.on("del-chunks", async ({ body }: any) => await Chunks.udel(body))

    io.on("get-chunks-merged", async ({ query }: any) => {
        const rows = await Chunks.findAll({ where: { ...query, deletedAt: null }, order: [['offset', 'ASC']] })
        return Chunk.Merge(rows)
    })

    io.on("get-chunks-distinct", async ({ }) => await Chunks.findAll({
        attributes: ['name', 'type', 'meta', 'src', 'dst', 'createdAt', 'updatedAt', [Sequelize.fn('COUNT', Sequelize.col('offset')), 'count']],
        where: { deletedAt: null }, order: [['updatedAt', 'DESC']],
        group: 'name',
    }))

    return { Chunks, RepChunks }

}