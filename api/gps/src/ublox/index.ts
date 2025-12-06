import { Shell, Safe, Loop, decodeENV, log, env, AsyncWait } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser, NMEA, UTM } from 'ucan'

import { Calculus } from './calculus'
import { BoomDrill } from './calculus2'
import { ProcessActivity } from './process'

const simulation_testing = (me: any, publish: any, GPS: any) => {

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
    Safe(() => me === 'DR101' && (new Connection({ name: 'data', proxy: 'https://dr101-gantulgak.as1.pitunnel.com/', rejectUnauthorized: false })).on('stream', Simulationhandler), 'Simulate')
    Safe(() => me === 'SV102' && (new Connection({ name: 'data', proxy: 'https://sv102-gantulgak.eu1.pitunnel.com/', rejectUnauthorized: false })).on('stream', Simulationhandler), 'Simulate')

}

const offline_testing = (gps = 1, cb: any) => {

    return null

    log.info(`Offline-testing: ${gps}`)
    let i = 0

    /* let g1 = `43.67266, 105.537283
   43.672656, 105.536959
   43.672683, 105.536599
   43.672902, 105.536487
   43.673145, 105.536551
   43.673178, 105.536969
   43.673174, 105.537221
   43.673073, 105.537358
   43.672916, 105.537364`
       let g2 = `43.672757, 105.537294
   43.672757, 105.536953
   43.672782, 105.536631
   43.672929, 105.536594
   43.67309, 105.536637
   43.673098, 105.536937
   43.673094, 105.537197
   43.673021, 105.537232
   43.672823, 105.537235` */

    let g1 = [
        [43.673630, 105.537240],
        [43.673630, 105.537240],
        [43.673630, 105.537240],
    ]

    let g2 = [
        [43.673640, 105.537250],
        [43.673650, 105.537250],
        [43.673660, 105.537250],
    ]

    let s = (gps === 1 ? g1 : g2)
    let g = []
    for (const x of s) {
        const [_x, _y] = x
        const { Easting: e, Northing: n } = UTM.convertLatLngToUtm(_x, _y, 2)
        g.push({ es: Number(e), nr: Number(n), el: gps === 1 ? 1540 : 1544 })
    }

    const len = g.length

    Loop(async () => {

        let p = g[(i++) % len]
        let s = { "time": i, "lat": 43.6, "lon": 105.4, "est": p.es, "nrt": p.nr, "ele": p.el, "fix": "rtk", "alt": 1580.8, "geo": -38.8, "spd": 0.011, "deg": 151.18, "vac": 1, "hac": 1.4, "sat": 27, "vco": "#52c41a", "hco": "#52c41a" }
        cb(s)

    }, 5000)

}

export const start_ublox = () => {

    const cf = decodeENV()
    const { me, version, mode, type } = decodeENV()
    log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)
    console.log(cf)
    console.log(type === 'boom_drill' ? 'YES' : 'NO')

    const API_DATA = new Connection({ name: 'data', timeout: 500 })
    const GPS: any = { gps1: {}, gps2: {} } /** Temporary GPS data store **/
    const Calculate = type === 'boom_drill' ? new BoomDrill(cf) : new Calculus(cf)
    const Process = new ProcessActivity({})
    const LOG: any = log
    const DEV = cf.mode === 'development', PROD = !DEV
    const VAC = DEV ? 100000 : Number(cf.threshold[0])     /** Bad GPS Threshold (cm) **/

    const publish = (channel: string, data: any) => Safe(async () => {

        console.log(channel)
        await API_DATA.set(channel, data)

    }, `[${channel}]`)

    /** For testing purpose **/
    // DEV && simulation_testing(me, publish, GPS)

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
        DEV && offline_testing(1, (parsed: any) => {
            publish('data_gps1', { state: 'success', type: 'success', message: 'GPS1 connected!', data: parsed })
            GPS.gps1 = parsed
        })

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
        DEV && offline_testing(2, (parsed: any) => {
            publish('data_gps2', { state: 'success', type: 'success', message: 'GPS2 connected!', data: parsed })
            GPS.gps2 = parsed
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

            if (!gps1?.fix || !gps2?.fix) return 0
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

}