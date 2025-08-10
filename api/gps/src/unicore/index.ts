import { Shell, Safe, Loop, decodeENV, log, env } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'

export const start_unicore = () => {

    const cf = decodeENV()
    const { me, version, mode } = decodeENV()
    log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

    //

}