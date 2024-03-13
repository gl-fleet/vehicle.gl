import { Connection } from 'unet'
import { Serial } from 'ucan'
import { AsyncWait, decodeENV, Safe, Loop, Sfy, env, log } from 'utils'

const { version, mode, path } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const DEV = mode === 'development', PROD = !DEV
const API_DATA = new Connection({ name: 'data', timeout: 500 })
const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data))
let temp: any = { operator: '', quality: 0 }

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

    if (s.indexOf('+CPSI: ') !== -1) {
        const CPSI = s.replace('+CPSI: ', '') // .split(',')
        return { CPSI }
    }

    if (s.indexOf('+CGREG: ') !== -1) {

        const p0 = [
            'Disable network registration unsolicited',
            'Enable network registration unsolicited',
            'Enable network registration and location information unsolicited'
        ]

        const p1 = [
            'Not registered and the modem is not currently searching for an operator to register to',
            'Registered to the home network',
            'Not registered, but the modem is currently trying to attach or is searching for an operator to register to',
            'Registration denied',
            'Unknown',
            'Registered to a roaming network',
            'Registered for “SMS only”, home network (applicable only when <Act> indicates E-UTRAN',
            'Registered for “SMS only”, roaming (applicable only when <Act> indicates E-UTRAN) <lac> String type; two byte location area code in hexadecimal format (e.g. “00C3” equals 195 in decimal)',
        ]

        const CGREG = s.replace('+CGREG: ', '') // .split(',')
        return { CGREG }

    }

    return null

}

PROD && Safe(() => {

    const GSM = new Serial()
    const LOG: any = log

    GSM.start(path[0], Number(path[1]))

    GSM.onInfo = (t, { type, message }) => LOG[type](message) && publish('data_gsm', { state: t, type, message })

    GSM.on((chunk: any) => Safe(() => {

        if (chunk[0] === '+') {

            const parsed = AT_BEAUTIFY(chunk)
            if (parsed && typeof parsed === 'object') {

                temp = { ...temp, ...parsed }
                log.res(`Serial[GSM]: ${Sfy(temp)}`)
                publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: temp })

            }

        }

    }))

    Loop(() => Safe(async () => {

        await AsyncWait(1250)
        await GSM.emit('AT+CSQ\r\n')

        await AsyncWait(1250)
        await GSM.emit('AT+COPS?\r\n')

        await AsyncWait(1250)
        await GSM.emit('AT+CPSI?\r\n')

        await AsyncWait(1250)
        await GSM.emit('AT+CGREG?\r\n')

    }), 1000 * 15)

})