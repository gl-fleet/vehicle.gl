import { Host, Connection, NetServer, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'
import { decodeENV, Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'


const { name, version, mode } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const DEV = mode === 'development', PROD = !DEV
const API = new Host({ name: 'gsm' })
const API_DATA = new Connection({ name: 'data', timeout: 500 })
const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data))

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

DEV && Safe(() => { /** Simulate from remote **/

    const remote = 'https://u002-gantulgak.as1.pitunnel.com/'
    const pi = new Connection({ name: 'gsm', proxy: remote })
    pi.on('GSM', ({ data }: any) => {
        API.emit('GSM', { state: 'success', type: 'success', message: `Network connected!`, data })
        publish('data_gsm', { state: 'success', type: 'success', message: 'Network connected!', data })
    })

})

PROD && Safe(() => {

    const cf = { path: '/dev/ttyS0', baud: 115200 }
    const GSM = new Serial()
    const LOG: any = log

    GSM.start(cf.path, cf.baud)

    GSM.onInfo = (t, { type, message }) => LOG[type](message) && publish('data_gsm', { state: t, type, message })

    GSM.on((chunk: any) => Safe(() => {

        log.res(`Serial[GSM]: Message size ${chunk.length}`)
        log.info((chunk).toString())

        if (chunk[0] === '+') {

            const parsed = AT_BEAUTIFY(chunk)
            log.res(`Serial[GSM]: ${chunk} / ${Sfy(parsed ?? {})}`)
            parsed && publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: parsed })

        }

    }))

    const call = () => {

        Safe(async () => await GSM.emit('AT+CSQ\r\n'))
        Safe(async () => await GSM.emit('AT+COPS?\r\n'))

    }

    Delay(() => call(), 250)
    Loop(() => call(), 5000)

})