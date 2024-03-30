import { Shell, Safe, Loop, decodeENV, log, env } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'

import { Calculus } from './calculus'
import { ProcessActivity } from './process'

const cf = decodeENV()
const { me, version, mode } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const API_DATA = new Connection({ name: 'data', timeout: 500 })
const GPS: any = { gps1: {}, gps2: {} } /** Temporary GPS data store **/
const Calculate = new Calculus(cf)
const Process = new ProcessActivity({})
const LOG: any = log
const DEV = cf.mode === 'development', PROD = !DEV
const VAC = DEV ? 100000 : Number(cf.threshold[0])     /** Bad GPS Threshold (cm) **/

const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data), `[${channel}]`)

const Simulationhandler = (args: any) => {

    const { data_gps1, data_gps2, data_gsm, value, data_rtcm } = args

    publish('data_gps1', data_gps1)
    publish('data_gps2', data_gps2)
    publish('data_gsm', { ...data_gsm, data: data_gsm })
    publish('data_rtcm', data_rtcm)
    publish('value', value)

    GPS.gps1 = data_gps1.data
    GPS.gps2 = data_gps2.data

}

/** Simulate from DR101 **/
DEV && Safe(() => me === 'DR101' && (new Connection({ name: 'data', proxy: 'https://u001-gantulgak.pitunnel.com/', rejectUnauthorized: false })).on('stream', Simulationhandler), 'Simulate')

/** Simulate from SV101 **/
DEV && Safe(() => me === 'SV101' && (new Connection({ name: 'data', proxy: 'https://u002-gantulgak.as1.pitunnel.com/', rejectUnauthorized: false })).on('stream', Simulationhandler), 'Simulate')

/** Simulate from SV102 **/
DEV && Safe(() => me === 'SV102' && (new Connection({ name: 'data', proxy: 'https://sv102-gantulgak.eu1.pitunnel.com/', rejectUnauthorized: false })).on('stream', Simulationhandler), 'Simulate')

Safe(() => {

    /** GPS-1-Initialize **/
    const GPS1 = new Serial()
    const Parser_1 = new F9P_Parser()
    GPS1.start(cf.gps1[0], Number(cf.gps1[1]))
    GPS1.onInfo = PROD ? (t, { type, message }) => LOG[type](message) && publish('data_gps1', { state: t, type, message }) : () => { }
    GPS1.on((chunk: any) => {

        log.res(`Serial[GPS1]: Message size ${chunk.length}`)
        log.info(`GPS1 -> ${chunk}`)
        const parsed = Parser_1.parse(chunk)
        if (parsed) {
            publish('data_gps1', { state: 'success', type: 'success', message: 'GPS1 connected!', data: parsed })
            GPS.gps1 = parsed
        }

    })

    /** GPS-2-Initialize **/
    const GPS2 = new Serial()
    const Parser_2 = new F9P_Parser()
    GPS2.start(cf.gps2[0], Number(cf.gps2[1]))
    GPS2.onInfo = PROD ? (t, { type, message }) => LOG[type](message) && publish('data_gps2', { state: t, type, message }) : () => { }
    GPS2.on((chunk: any) => {

        log.res(`Serial[GPS2]: Message size ${chunk.length}`)
        const parsed = Parser_2.parse(chunk)
        if (parsed) {
            publish('data_gps2', { state: 'success', type: 'success', message: 'GPS2 connected!', data: parsed })
            GPS.gps2 = parsed
        }

    })

    /** RTCM-Initialize **/
    const base = { host: cf.host[0], port: Number(cf.host[1]), lastMessage: 0, reconnect: 0 }
    const RTCM = new NetClient(base, (client) => {

        ++base.reconnect && client.on('data', (chunk: any) => {
            RTCM.last = base.lastMessage = Date.now()
            log.res(`TCP_Client<${base.host}:${base.port}> Message size ${chunk.length}`)
            publish('data_rtcm', { state: 'success', type: 'success', message: `RTCM [${base.host}:${base.port}]: Message size ${chunk.length} bytes`, data: chunk })
            GPS1.emit(chunk)
            GPS2.emit(chunk)
        })

    })
    RTCM.onInfo = (t, { type, message }) => LOG[type](message) && publish('data_rtcm', { state: t, type, message })

    /** Initialize-Addons **/
    Process.on('update', (data: any) => publish('data_activity', data))

    /** GPS-Parser-Initialize **/
    let prev = 0; Loop(() => {

        let { gps1, gps2 } = GPS

        // if (!gps1 || !gps2) return 0
        if (!gps1?.fix || !gps2?.fix) return 0 // Need to check whether GPS undefined ???
        if (gps1.time === gps2.time && gps1.time !== prev) { prev = gps1.time }
        else { return 0 }

        (Date.now() % 5000 <= 1000) && log.success(`GPS(1): ${gps1.fix} ${gps1.ele} ${gps1.vac} ${gps1.hac} | GPS(2): ${gps2.fix} ${gps2.ele} ${gps2.vac} ${gps2.hac} `)

        Process.add(gps1)

        const calculated = Calculate.calculate(GPS)

        if (calculated && gps1.vac <= VAC && gps2.vac <= VAC) publish('data_gps', calculated)

    }, 250)

    Safe(() => {

        if (process.pid && Shell.which('renice')) {

            Shell.exec(`echo '${mode === 'development' ? 'tulgaew' : 'umine'}' | sudo -S renice -n -20 -p ${process.pid}`)
            log.success(`Renice: Process re-niced ${process.pid}`)

        } else log.error(`Renice: Couldn't start`)

    }, 'Renice')

})