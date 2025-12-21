import { Sequelize } from 'sequelize'
import { Host, Connection, rSlave } from 'unet'
import { decodeENV, Safe, Shell, env, log, Delay } from 'utils'

import { Event } from './event'
import { Chunk } from './chunk'

const { name, version, mode, me, proxy, token } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const cf = {
    cloud: new Connection({ name: 'core_data', proxy, token, timeout: 60 * 1000 }),
    local: new Host({ name, port: 8071, timeout: 60 * 1000 }),
    sequelize: new Sequelize({
        dialect: 'sqlite',
        storage: `../../${me}_${name}.sqlite`,
        logging: false,
        /* logging: (sql, timing: any) => {
            console.log('***')
            console.log(sql)
        }, */
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    new Event(cf)
    new Chunk(cf)

    const replica = new rSlave({
        api: cf.cloud,
        sequel: cf.sequelize,
        slave_name: me,
        parallel: false,
        debug: false,
        models: [
            {
                name: 'events',
                direction: 'bidirectional',
                size: 10, /** Around 1kb extract to 6kb  **/
                retain: [1 / 24, 'days'],
                delay_success: 1.25 * 1000, /** There are no data to be pulled or pushed **/
                delay_fail: 5 * 1000, /** Something wrong while pulling or pushing **/
                delay_loop: 250, /** Sleep **/
            },
            {
                name: 'chunks',
                direction: 'pull-only',
                size: 5, /** Around 5kb extract to 56kb **/
                retain: [90, 'days'],
                delay_success: 10 * 1000,
                delay_fail: 10 * 1000,
                delay_loop: 250,
            }
        ]
    })

    // replica.cb = (...e: any) => console.log(`[R] Trigger:    [${e}]`)

    await cf.sequelize.sync({ force: false, alter: true })

    Delay(() => {

        Safe(() => {

            if (process.pid && Shell.which('renice')) {

                Shell.exec(`echo '${mode === 'development' ? 'tulgaew' : 'umine'}' | sudo -S renice -n -19 -p ${process.pid}`)
                log.success(`Renice: Process re-niced ${process.pid}`)

            } else log.error(`Renice: Couldn't start`)

        }, 'Renice')

        Safe(() => {

            const wifi = Shell.exec(`echo 'umine' | sudo -S ip neigh show dev wlan0`, { silent: true }).stdout
            const wifi_list = wifi.split('\n')

            for (const x of wifi_list) {

                /**
                 * Valid "x": 10.42.0.55 lladdr b0:60:88:82:4d:3a REACHABLE
                 */

                const str = x.split(' ')
                const dots = (str[0].split('.') || []).length

                if (dots === 4) {

                    const command = `echo '${mode === 'development' ? 'tulgaew' : 'umine'}' | sudo -S iptables -A FORWARD -s ${str[0]} -j DROP`
                    Shell.exec(command, { silent: true }).stdout
                    log.success(`IP-Table / executed -> ${command}`)

                }

            }

        }, 'IP-Table')

    }, 30 * 1000)

})