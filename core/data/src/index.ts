import { Sequelize } from 'sequelize'
import { Host, Connection } from 'unet'
import { decodeENV, Collect, Safe, env, log } from 'utils'

import { Emitter } from './emitter'
import { Canvas } from './canvas'
import { Persist } from './persist'

const { name, version, mode, me, proxy, token } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const cf = {
    cloud: new Connection({ name: 'core_data', proxy, token }),
    local: new Host({ name }),
    sequelize: new Sequelize({
        dialect: 'sqlite',
        storage: `../../${me}_${name}.sqlite`,
        logging: false // (query: string, { tableNames, type }: any) => typeof tableNames !== 'undefined' && log.info(`SQL: ${tableNames[0]} -> ${type} / ${query.slice(0, 64)} ...`)
    }),
}

const run = () => {

    try {

        const emitter = new Emitter(cf)
        const canvas = new Canvas(cf)
        const persist = new Persist(cf)

        emitter.on('pub_cloud', (data: any) => {

            persist.save_event({ type: 'status', name: 'device', data })

        })

    } catch (err) { console.log(err) }
}

Safe(async () => {

    await cf.sequelize.authenticate()
    run()
    await cf.sequelize.sync({ force: false })

})