import { Host, Connection } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { Now, Safe, Loop, log } from 'utils'

export class Canvas {

    constructor({ cloud, local, sequelize }: { cloud: Connection, local: Host, sequelize: Sequelize }) {

        log.success(`[Canvas] is starting ...`)

        this.setup_camera(local)
        this.setup_map(local)

    }

    /*** *** *** @___Image_Processing_Camera___ *** *** ***/

    setup_camera = (local: Host) => {

        local.on('img-camera', ({ body }) => {

            local.emit('img-camera', body)
            return 'received'

        })

    }

    /*** *** *** @___Image_Processing_Map___ *** *** ***/

    setup_map = (local: Host) => {

        local.on('img-map', ({ query, body }) => {

            local.emit('img-map', body)
            return 'received'

        })

    }

}