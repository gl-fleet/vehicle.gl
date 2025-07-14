import { Connection } from 'unet'
import { AsyncWait, decodeENV, Safe, Loop, env, log, Shell } from 'utils'

const { version, mode } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const DEV = mode === 'development', PROD = !DEV, source = 'USB'
const API_DATA = new Connection({ name: 'data', timeout: 5000 })
const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data))

/** Calculate UP & DOWN bytes **/
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
                await AsyncWait(2500)

                const pw = (power || '?').split('\n')[0]
                const pr = start.split('\n')
                const nr = end.split('\n')

                const [arx, atx] = [Number(pr[0]), Number(pr[1])]
                const [brx, btx] = [Number(nr[0]), Number(nr[1])]

                log.info(`arx: ${arx} atx: ${atx} / brx: ${brx} btx: ${btx}`)

                const rx = Number((((brx - arx) / 5) / 1024).toFixed(2))
                const tx = Number((((btx - atx) / 5) / 1024).toFixed(2))

                const note = `RX: ${rx} kbps TX: ${tx} kbps`

                log.info(`Network usage: ${note} / Throttled: ${pw}`)

                if (typeof rx === 'number' && typeof tx === 'number') {

                    await API_DATA.set('value', { rx, tx, pw: `${pw}` })

                    publish('data_gsm', { state: 'success', type: 'success', message: `Network connected!`, data: { operator: 'Point-to-Point Protocol', quality: (rx + tx) >= 4 ? 99 : ((rx + tx) * 100 / 4) } })

                }

            } catch (err) { } finally { free = true }

        }, '[NETWORK_USAGE]')

    }, 1000)

})