import { Host, NetServer, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'
import { Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'

const AT_BEAUTIFY = (s: string) => {

    if (s.indexOf('+CSQ: ') !== -1) {
        const ls = s.replace('+CSQ: ', '').split(',')
        const quality = (Number(ls[0]) * 827 + 127) >> 8
        return { quality }
    }

    if (s.indexOf('+COPS: ') !== -1) {
        const ls = s.replace('+COPS: ', '').split(',')
        const operator = ls[2].replace(/"/g, '')
        return { operator }
    }

    return null

}

Safe(() => {

    log.success(``) && log.success(`"${env.npm_package_name}" module is running on "${process.pid}" 🚀🚀🚀`)

    const cf = { path: '/dev/ttyS0', baud: 115200 }
    const API = new Host({ name: 'gsm' })
    const GSM = new Serial()
    const LOG: any = log

    GSM.start(cf.path, cf.baud)

    GSM.onInfo = (t, { type, message }) => LOG[type](message) && API.emit('GSM', { state: t, type, message })

    GSM.on((chunk: any) => chunk[0] === '+' && Safe(() => {

        const parsed = AT_BEAUTIFY(chunk)
        log.res(`Serial[GSM]: ${chunk} / ${Sfy(parsed ?? {})}`)
        parsed && API.emit('GSM', { state: 'success', type: 'success', message: `Network connected!`, data: parsed })

    }))

    const call = async () => {

        await GSM.emit('AT+CSQ\r\n')
        await GSM.emit('AT+COPS?\r\n')

    }

    Delay(async () => { await call() }, 250)
    Loop(async () => { await call() }, 5000)

})