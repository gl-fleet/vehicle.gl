import { Host, Connection, NetServer, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'
import { AsyncWait, decodeENV, Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'

const { me, name, version, mode, path } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

let temp = { operator: '****', quality: 0 }
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

    if (me === 'SV101' /** latest supervisor **/) {

        const remote = 'https://u002-gantulgak.as1.pitunnel.com/'
        const pi = new Connection({ name: 'gsm', proxy: remote })
        pi.on('GSM', ({ data }: any) => {
            API.emit('GSM', { state: 'success', type: 'success', message: `Network connected!`, data })
            publish('data_gsm', { state: 'success', type: 'success', message: 'Network connected!', data })
        })

    }

    if (me === 'DR101'  /** legacy drill **/) {

        const pi = new Connection({ name: 'GSM', proxy: 'https://u001-gantulgak.pitunnel.com/', rejectUnauthorized: false })
        pi.on('gsm', (e: any) => {

            temp = { ...temp, ...e }
            API.emit('GSM', { state: 'success', type: 'success', message: `Network connected!`, data: temp })
            publish('data_gsm', { state: 'success', type: 'success', message: 'Network connected!', data: temp })

        })

    }

})

PROD && Safe(() => {

    const GSM = new Serial()
    const LOG: any = log

    GSM.start(path[0], Number(path[1]))

    GSM.onInfo = (t, { type, message }) => LOG[type](message) && publish('data_gsm', { state: t, type, message })

    GSM.on((chunk: any) => Safe(() => {

        log.res(`Serial[GSM]: Message size ${chunk.length}`)
        log.info((chunk).toString())

        if (chunk[0] === '+') {

            const parsed = AT_BEAUTIFY(chunk)
            log.res(`Serial[GSM]: ${chunk} / ${Sfy(parsed ?? {})}`)
            if (parsed) {

                temp = { ...temp, ...parsed }
                publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: temp })

            }

        }

    }))

    Loop(() => Safe(async () => {

        await AsyncWait(250)
        await GSM.emit('AT+CSQ\r\n')
        await AsyncWait(750)
        await GSM.emit('AT+COPS?\r\n')

    }), 7500)

})