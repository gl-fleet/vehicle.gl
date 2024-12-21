import { Connection } from 'unet'
import { Serial } from 'ucan'
import { AsyncWait, decodeENV, Safe, Loop, Sfy, env, log, Shell, Delay } from 'utils'

const { version, mode, path } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const DEV = mode === 'development', PROD = !DEV
const API_DATA = new Connection({ name: 'data', timeout: 5000 })
const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data))
let temp: any = { operator: '', quality: 0 }

/** Parses the AT result into a JSON file **/
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

/** Calculate Up & Down bytes **/
PROD && Safe(() => {

    let free = true
    const route = DEV ? 'eth0' : 'ppp0'

    Loop(() => {

        free && Safe(async () => {

            try {

                free = false
                await AsyncWait(2500)
                const power = Shell.exec(`vcgencmd get_throttled`, { silent: true }).stdout
                await AsyncWait(2500)
                const start = Shell.exec(`cat /sys/class/net/${route}/statistics/rx_bytes && cat /sys/class/net/${route}/statistics/tx_bytes`, { silent: true }).stdout
                await AsyncWait(5000)
                const end = Shell.exec(`cat /sys/class/net/${route}/statistics/rx_bytes && cat /sys/class/net/${route}/statistics/tx_bytes`, { silent: true }).stdout

                const pw = (power || '?').split('\n')[0]
                const pr = start.split('\n')
                const nr = end.split('\n')
                const [arx, atx] = [Number(pr[0]), Number(pr[1])]
                const [brx, btx] = [Number(nr[0]), Number(nr[1])]

                const rx = Number((((brx - arx) / 5) / 1024).toFixed(2))
                const tx = Number((((btx - atx) / 5) / 1024).toFixed(2))

                const note = `RX: ${rx} kbps TX: ${tx} kbps`

                log.info(`Network usage: ${note} / Throttled: ${pw}`)

                rx !== undefined && tx !== undefined && await API_DATA.set('value', { rx, tx, pw: `${pw}` })

            } catch (err) { } finally { free = true }

        }, '[NETWORK_USAGE]')

    }, 1000)

})

/** Uses PPP log to detect network strength **/
let prev = ''
PROD && Loop(() => {

    return

    Safe(async () => {

        const chats = Shell.exec(`journalctl --since "2min ago" | grep pppd`, { silent: true }).stdout
        const ls = chats.split('\n')
        for (const x of ls) {
            if (typeof x === 'string' && x.indexOf('IPV6CP: timeout sending Config-Requests') > 0) {
                if (x !== prev) {

                    console.log('About to be restarted [PPPD]')
                    prev = x
                    const reset = Shell.exec(`echo "umine" | killall -HUP pppd`, { silent: true }).stdout
                    console.log(reset)

                }
            }
        }

    })

    Safe(async () => {

        const chats = Shell.exec(`journalctl --since "2min ago" | grep chat`, { silent: true }).stdout

        const ls = chats.split('\n')

        for (const x of ls) {

            const [s, chunk] = x.split(']: ')
            if (typeof chunk === 'string' && chunk[0] === '+') {

                const parsed = AT_BEAUTIFY(chunk)
                if (parsed && typeof parsed === 'object') {

                    temp = { ...temp, ...parsed }
                    log.res(`Serial[GSM]: ${Sfy(temp)}`)
                    publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: temp })

                }

            }

        }

    })

}, 1000 * 30)

/** Uses extra port to query network strength **/
PROD && Safe(() => {

    const silent = false
    const ls = (Shell.exec(`udevadm info --name=${path[0]} --attribute-walk | grep KERNELS`, { silent }).stdout).split('\n')
    const slot = ls[2].split('==')[1].replaceAll(`"`, '')
    log.warn(`[USB] SLOT -> '${slot}'`)

    /** Restarts the power for the GSM and reloads the GSM service **/
    const reload_usb = async () => {

        try {

            log.warn(`[USB] Reloading ...`)

            log.warn(`[USB] SLOT -> '${slot}'`)
            await AsyncWait(2500)

            log.warn(`[USB] Command -> sudo sh -c "echo 0/1 > /sys/bus/usb/devices/${slot}/authorized"`)

            log.warn(`[USB] Turning off ...`)
            Shell.exec(`echo "umine" | sudo sh -c "echo 0 > /sys/bus/usb/devices/${slot}/authorized"`, { silent }).stdout

            await AsyncWait(5000)

            log.warn(`[USB] Turning on ...`)
            Shell.exec(`echo "umine" | sudo sh -c "echo 1 > /sys/bus/usb/devices/${slot}/authorized"`, { silent }).stdout

            await AsyncWait(5000)
            log.warn(`[USB] Restarting the service ...`)
            await AsyncWait(1000)

            process.exit(0)

        } catch (err: any) {

            log.error(`[USB] ${err.message}`)
            await AsyncWait(1000)

        }

    }

    const GSM = new Serial()
    let failure = 0
    let last = Date.now()

    GSM.start(path[0], Number(path[1]))

    GSM.onInfo = (t, { type, message }) => {

        if (t === 'error' && ++failure > 10) process.exit(0)
        if (t === 'error' && failure === 5) reload_usb()

        log.warn(`Serial[GSM]: [${t}:${type}] ${message} [fail:${failure}]`)

        publish('data_gsm', { state: t, type, message })

    }

    GSM.on((chunk: any) => Safe(() => {

        if (chunk[0] === '+') {

            log.res(`Serial[GSM]: ${chunk}`)
            const parsed = AT_BEAUTIFY(chunk)
            if (parsed && typeof parsed === 'object') {

                last = Date.now()
                failure = 0
                temp = { ...temp, ...parsed };
                publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: temp })

            }

        }

    }))

    let free = true
    Loop(() => free && Safe(async () => {

        try {

            free = false

            log.info(`STARTING AT COMMANDS [...]`)

            /** The service will restart if no data is received from the serial port for over 5 minutes [Not yet tested] **/
            if ((Date.now() - last) > (5 * 60 * 1000)) reload_usb()

            await AsyncWait(5000)
            await GSM.emit('AT+CSQ\r\n')

            await AsyncWait(5000)
            await GSM.emit('AT+COPS?\r\n')

            await AsyncWait(5000)
            await GSM.emit('AT+CPSI?\r\n')

        } catch (err) { } finally { free = true }

    }), 2500)

})