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
        try {
            const CPSI = s.replace('+CPSI: ', '')
            const ls = CPSI.split(',')
            /* 
            0. LTE
            1. Online,
            2. 428-88,
            3. 0x002C,
            4. 1289770,
            5. 103,
            6. EUTRAN-BAND40,
            7. 39350,5,5,-103,-927,-620,11
            */
            return { CPSI: `${ls[0]} ${ls[1]} ${ls[2]} ${ls[5]} ${ls[6]}` }
        } catch { return null }
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

        await AsyncWait(2500)
        await GSM.emit('AT+CSQ\r\n')

        await AsyncWait(2500)
        await GSM.emit('AT+COPS?\r\n')

        await AsyncWait(2500)
        await GSM.emit('AT+CPSI?\r\n')

    }), 1000 * 15)

})