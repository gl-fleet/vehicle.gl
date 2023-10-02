import { Host, Connection, ReplicaSlave } from 'unet'
import { decodeENV, Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'
import { Sequelize, DataTypes } from 'sequelize'

import { initChunks } from './chunks'
import { initConfigs } from './configs'
import { initHistory } from './history'

const { name, version, mode, me, proxy, debug } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(async () => {

    const api = new Host({ name })
    const core = new Connection({ name: 'io', proxy, token: me })
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: '../../data.sqlite', logging: (msg) => debug === 'true' && log.info(`SQLITE: ${msg}`) })

    api.on('cloud:volatile', ({ body }: any) => {

        const { channel, data } = body
        core.emit(channel, data, true)

    })

    await sequelize.authenticate()

    initChunks(api, core, sequelize, me, debug)
    initConfigs(api, sequelize, me)
    initHistory(api, sequelize, me)

    await sequelize.sync({ force: false })

})