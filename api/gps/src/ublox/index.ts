import { Shell, Safe, Loop, decodeENV, log, env, AsyncWait } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser, NMEA, UTM } from 'ucan'

import { ProcessActivity } from './process'

import { Calculus as Default_Drill } from './calculus'
import { Calculus as Boom_Drill } from './boom_drill'
import { Calculus as Boom_Drill_V2 } from './boom_drill_v2'

const simulation_testing = (me: any, publish: any, GPS: any) => {

    log.success(`[Simulation]: Simulating GPS data for ${me} ...`)

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

    me === 'HDM036i' && Safe(() => {

        const remote = new Connection({ name: 'data', proxy: 'https://hdm036-gantulgak.as2.pitunnel.com', rejectUnauthorized: false })
        remote.on('stream', Simulationhandler)

    }, 'Simulate')


    me === 'D65i' && Safe(() => {

        const remote = new Connection({ name: 'data', proxy: 'https://d65-gantulgak.as2.pitunnel.com', rejectUnauthorized: false })
        remote.on('stream', Simulationhandler)

    }, 'Simulate')

}

export const start_ublox = (module: string) => {

    const cf = decodeENV()
    const { me, version, mode, type = [] } = cf
    log.success(`"${env.npm_package_name}"."${module}" <${version}> module is running on "${process.pid}" / [${mode}] [${me}] 🚀🚀🚀\n`)

    const API_DATA = new Connection({ name: 'data', timeout: 500 })
    const GPS: any = { gps1: {}, gps2: {} } /** Temporary GPS data store **/
    const Calculate = type[0] === 'boom_drill' ? new Boom_Drill(cf) : new Default_Drill(cf)
    const Process = new ProcessActivity({})
    const LOG: any = log
    const DEV = cf.mode === 'development', PROD = !DEV
    const VAC = DEV ? 100000 : Number(cf.threshold[0])     /** Bad GPS Threshold (cm) **/

    const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data), `[${channel}]`)

    /** For testing purpose **/
    DEV && simulation_testing(me, publish, GPS)

    Safe(() => {

        /** GPS-1-Initialize **/
        const GPS1 = new Serial()
        const Parser_1 = new F9P_Parser()
        GPS1.start(cf.gps1[0], Number(cf.gps1[1]))
        GPS1.onInfo = PROD ? (t, { type, message }) => LOG[type](message) && publish('data_gps1', { state: t, type, message }) : () => { }
        const ParseGPS1 = (chunk: any) => {
            log.res(`Serial[GPS1]: Message size ${chunk.length}`)
            const parsed = Parser_1.parse(chunk)
            if (parsed) {
                publish('data_gps1', { state: 'success', type: 'success', message: 'GPS1 connected!', data: parsed })
                GPS.gps1 = parsed
            }
        }
        GPS1.on((chunk: any) => ParseGPS1(chunk))
        // DEV && offline_testing(1, (parsed: any) => { publish('data_gps1', { state: 'success', type: 'success', message: 'GPS1 connected!', data: parsed }); GPS.gps1 = parsed; })

        /** GPS-2-Initialize **/
        const GPS2 = new Serial()
        const Parser_2 = new F9P_Parser()
        GPS2.start(cf.gps2[0], Number(cf.gps2[1]))
        GPS2.onInfo = PROD ? (t, { type, message }) => LOG[type](message) && publish('data_gps2', { state: t, type, message }) : () => { }
        const ParseGPS2 = (chunk: any) => {
            log.res(`Serial[GPS2]: Message size ${chunk.length}`)
            const parsed = Parser_2.parse(chunk)
            if (parsed) {
                publish('data_gps2', { state: 'success', type: 'success', message: 'GPS2 connected!', data: parsed })
                GPS.gps2 = parsed
            }
        }
        GPS2.on((chunk: any) => ParseGPS2(chunk))
        // DEV && offline_testing(2, (parsed: any) => { publish('data_gps2', { state: 'success', type: 'success', message: 'GPS2 connected!', data: parsed }); GPS.gps2 = parsed; })

        /** RTCM-Initialize **/
        const base = { host: cf.host[0], port: Number(cf.host[1]), lastMessage: 0, reconnect: 0 }
        const RTCM = new NetClient(base, (client) => {

            ++base.reconnect && client.on('data', (chunk: any) => {
                RTCM.last = base.lastMessage = Date.now()
                if (Date.now() % 10000 / 1000 === 5) log.res(`TCP_Client<${base.host}:${base.port}> Message size ${chunk.length}`)
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

            if (!gps1?.fix || !gps2?.fix) return 0
            if (gps1.time === gps2.time && gps1.time !== prev) { prev = gps1.time }
            else { return 0 }

            if (Date.now() % 5000 <= 1000) {
                log.success(`GPS(1): ${gps1.fix} ${gps1.est} ${gps1.nrt} ${gps1.ele}:${gps1.alt} ${gps1.vac} ${gps1.hac}`)
                log.success(`GPS(2): ${gps2.fix} ${gps2.est} ${gps2.nrt} ${gps2.ele}:${gps2.alt} ${gps2.vac} ${gps2.hac}`)
            }

            const calculated = Calculate.calculate(GPS)
            if (calculated && gps1.vac <= VAC && gps2.vac <= VAC) publish('data_gps', calculated)

        }, 250)

        Safe(() => {

            if (process.pid && Shell.which('renice')) {

                Shell.exec(`echo '${mode === 'development' ? 'tulgaew' : 'umine'}' | sudo -S renice -n -20 -p ${process.pid}`)
                log.success(`Renice: Process re-niced ${process.pid}`)

            } else log.error(`Renice: Couldn't start`)

        }, 'Renice')

    }, 'Initialize')

}