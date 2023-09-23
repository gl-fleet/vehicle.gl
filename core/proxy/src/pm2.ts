import pm2 from 'pm2'
import { log, env } from 'utils'

export class Manage {

    isDev = false
    debug = false

    constructor() {

        this.isDev = env.MODE && env.MODE === 'development' ? true : false

        pm2.launchBus((err, pm2_bus) => {

            pm2_bus.on('process:msg', (packet: any) => {

                packet.data === 'ping' && pm2.sendDataToProcessId(packet.process.pm_id, { type: 'process:msg', data: 'pong', topic: "ping" }, (err, res) => { })

            })

        })

    }

    start = (name: string) => new Promise((res, rej) => {

        pm2.start(name, (err, proc: any) => {
            err ? log.warn(`PM2: While starting ${name} / ${err.message}`) : log.success(`PM2: ${name} Started!`)
            res({ ...proc[0], pm2_env: '***' })
        })

    })

    restart = (name: string) => new Promise((res, rej) => {

        pm2.restart(name, (err, proc: any) => {
            err ? log.warn(`PM2: While restarting ${name} / ${err.message}`) : log.success(`PM2: ${name} Restarted!`)
            typeof proc === 'undefined' ? res({}) : res({ ...proc[0], pm2_env: '***' })
        })

    })

    reload = (name: string) => new Promise((res, rej) => {

        pm2.reload(name, (err, proc: any) => {
            err ? log.warn(`PM2: While reloading ${name} / ${err.message}`) : log.success(`PM2: ${name} Reloaded!`)
            typeof proc === 'undefined' ? res({}) : res({ ...proc[0], pm2_env: '***' })
        })

    })

    stop = (name: string) => new Promise((res, rej) => {

        pm2.stop(name, (err, proc: any) => {
            this.debug && (err ? log.warn(`PM2: While stopping ${name} / ${err.message}`) : log.success(`PM2: ${name} Stopped!`))
            typeof proc === 'undefined' ? res({}) : res({ ...proc[0], pm2_env: '***' })
        })

    })

    describe = (name: string) => new Promise((res, rej) => {

        pm2.describe(name, (err, proc: any) => {
            this.debug && (err ? log.warn(`PM2: While describing ${name} / ${err.message}`) : log.success(`PM2: ${name} Described!`))
            typeof proc === 'undefined' ? res({}) : res({ ...proc[0], pm2_env: '***' })
        })

    })

    delete = (name: string) => new Promise((res, rej) => {

        pm2.delete(name, (err, proc: any) => {
            this.debug && (err ? log.warn(`PM2: While deleting ${name} / ${err.message}`) : log.success(`PM2: ${name} Deleted!`))
            typeof proc === 'undefined' ? res({}) : res({ ...proc[0], pm2_env: '***' })
        })

    })

}