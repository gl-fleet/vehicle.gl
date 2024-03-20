import { Sequelize } from 'sequelize'
import { Host, Connection, rSlave } from 'unet'
import { decodeENV, Safe, env, log } from 'utils'

import { Emitter } from './emitter'
import { Event } from './event'
import { Chunk } from './chunk'

const { name, version, mode, me, proxy, token } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const cf = {
    cloud: new Connection({ name: 'core_data', proxy, token, timeout: 15000 }),
    local: new Host({ name, port: 8071 }),
    sequelize: new Sequelize({
        dialect: 'sqlite',
        storage: `../../${me}_${name}.sqlite`,
        logging: false
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    new Emitter(cf)
    new Event(cf)
    new Chunk(cf)

    const replica = new rSlave({
        api: cf.cloud,
        sequel: cf.sequelize,
        slave_name: me,
        parallel: true,
        models: [{
            name: 'events',
            direction: 'bidirectional',
            size: 10,
            retain: [7, 'days'],
            delay_success: 2000,
            delay_fail: 2500,
            delay_loop: 100,
        },
        {
            name: 'chunks',
            direction: 'pull-only',
            size: 5,
            retain: [90, 'days'],
            delay_success: 7500,
            delay_fail: 5000,
            delay_loop: 100,
        }],
    })

    replica.cb = (...e: any) => {
        console.log(`[R] Trigger:    [${e}]`)
    }

    await cf.sequelize.sync({ force: false })

})