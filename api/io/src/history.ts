import { Host } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { SequelTable } from './utils/sequel'

export const initHistory = (

    io: Host,
    sequelize: Sequelize,
    me: string,

) => {

    /** Building a table */
    const alias = 'history'
    const List = SequelTable(alias, sequelize, me, {
        posx: { type: DataTypes.STRING, defaultValue: '' },
        data: { type: DataTypes.TEXT, defaultValue: '' },
        unique: ['posx'],
    })

    /** Exposing endpoints */
    io.on(`set-${alias}`, async (req: any) => await List.uset(req.body))
    io.on(`get-${alias}`, async (req: any) => await List.uget(req.query))
    io.on(`del-${alias}`, async (req: any) => await List.udel(req.body))

    /** name type data **/
    List.uchange(() => io.emit(`get-${alias}`, true), 750)

    return { List }

}