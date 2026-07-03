import { Host, NetServer, NetClient } from 'unet'
import { Shell, Safe, Jfy, Sfy, Loop, Delay, Now, decodeENV, env, log } from 'utils'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'

const { version, mode, sensors } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name: 'iot', port: 4099 })

    API.on('*', async (req: any) => {
        return sensors
    })

}, '[IOT]')