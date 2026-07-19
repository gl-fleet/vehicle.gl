import { Shell, Safe, Loop, decodeENV, log, env, AsyncWait } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser, NMEA, UTM } from 'ucan'
const fs = require('node:fs')

import { ProcessActivity } from './process'

import { Calculus as Default_Drill } from './calculus'
import { Calculus as Boom_Drill } from './boom_drill'
import { Calculus as Boom_Drill_V3 } from './boom_drill_v3'
import { Calculus as Boom_Drill_V4 } from './boom_drill_v4'

const simulation_testing = (me: any, publish: any, GPS: any, cf: any) => {

    log.success(`[Simulation]: Simulating GPS data for ${me} ...`)

    const Simulationhandler = (args: any) => {

        // fs.writeFile(`./test.txt`, JSON.stringify(args), (err: any) => {})

        const { data_gps1, data_gps2, data_gsm, value, data_rtcm } = args

        const time = Date.now()
        data_gps1.data.time = `${time}`
        data_gps2.data.time = `${time}`

        publish('data_gps1', data_gps1)
        publish('data_gps2', data_gps2)
        publish('data_gsm', { ...data_gsm, data: data_gsm })
        publish('data_rtcm', data_rtcm)
        publish('value', value)

        GPS.gps1 = data_gps1.data
        GPS.gps2 = data_gps2.data

    }

    Loop(() => {

        const arg = { "data_gps1": { "state": "success", "type": "success", "message": "GPS1 connected!", "data": { "time": "125201.50", "lat": 43.67109466666667, "lon": 105.49115783333333, "est": 539595.05, "nrt": 4835460.29, "fix": "rtk", "alt": 1419.9, "geo": -38.8, "ele": 1381.14, "spd": 0.008, "deg": 8.72, "vac": 1.2, "hac": 1.4, "sat": 31, "vco": "#52c41a", "hco": "#52c41a" } }, "data_gps2": { "state": "success", "type": "success", "message": "GPS2 connected!", "data": { "time": "125202.00", "lat": 43.671080333333336, "lon": 105.4911205, "est": 539592.05, "nrt": 4835458.69, "fix": "rtk", "alt": 1419.9, "geo": -38.8, "ele": 1381.16, "spd": 0.024, "deg": 350, "vac": 1.4, "hac": 1.4, "sat": 31, "vco": "#52c41a", "hco": "#52c41a" } }, "data_gps": { "R": 3.6315499797468442, "G": [43.67104123660685, 105.49118858541097, 1378.14], "A": [539597.560882369, 4835454.37580393, 1378.14], "B": [539596.5461940416, 4835453.834636822, 1378.150051901763], "C": [539594.5491176627, 4835460.022862753, 1378.143287312919], "status": { "dist_tar": 340, "dist_act": 340.01, "zoneNumber": 48, "zoneLetter": "T", "rtcm": "139.59.115.158:2101" }, "shapes": { "points": [[539595.05, 4835460.29, 1381.14], [539592.05, 4835458.69, 1381.16], [539593.55, 4835459.49, 1381.15], [539597.560882369, 4835454.37580393, 1378.14]], "colored": { "green": [[539595.05, 4835460.29, 1381.14], [539592.05, 4835458.69, 1381.16]], "red": [[539593.55, 4835459.49, 1381.15], [539597.560882369, 4835454.37580393, 1378.14]] }, "lines": [[[539595.05, 4835460.29, 1381.14], [539592.05, 4835458.69, 1381.16]], [[539593.55, 4835459.49, 1381.15], [539593.5344293353, 4835459.4816956455, 1378.1500519017682]], [[539593.5344293353, 4835459.4816956455, 1378.1500519017682], [539596.5461940416, 4835453.834636822, 1378.150051901763]], [[539596.5461940416, 4835453.834636822, 1378.150051901763], [539597.560882369, 4835454.37580393, 1378.1432873129143]], [[539597.560882369, 4835454.37580393, 1378.1432873129143], [539597.560882369, 4835454.37580393, 1378.14]]] }, "camera": { "TL": { "x": 539598.0461680903, "y": 4835454.634622983, "z": 1378.140052074769 }, "TM": { "x": 539596.5461940416, "y": 4835453.834636822, "z": 1378.150051901763 }, "TR": { "x": 539595.0462199923, "y": 4835453.034650663, "z": 1378.1600517287573 }, "BL": { "x": 539595.034403384, "y": 4835460.281681806, "z": 1378.1400520747734 }, "BM": { "x": 539593.5344293353, "y": 4835459.4816956455, "z": 1378.1500519017682 }, "BR": { "x": 539592.034455286, "y": 4835458.681709486, "z": 1378.1600517287632 } } }, "data_gsm": { "state": "success", "message": "Network connected!", "quality": 99, "operator": "Point-to-Point Protocol" }, "data_rtcm": { "state": "success", "message": "RTCM [139.59.115.158:2101]: Message size 798 bytes" }, "value": { "screen": 3, "shot_plan": { "d2": 0.15, "d3": 0.47, "dir": "E20" }, "rx": 2.06, "tx": 3.22, "pw": "throttled=0xe0000" }, "inj_clients": ["http://10.42.0.1:8443"] }
        Simulationhandler(arg)

    }, 500)

    cf.virtually && Safe(() => {

        log.success(`Connecting to ${cf.virtually}`)
        const remote = new Connection({ name: 'data', proxy: cf.virtually, rejectUnauthorized: false })
        remote.on('stream', Simulationhandler)

    }, `Simulate: ${cf.virtually}`)

}

export const start_ublox = (module: string) => {

    const cf = decodeENV()
    const { me, version, mode, type = [] } = cf
    log.success(`"${env.npm_package_name}"."${module}" <${version}> module is running on "${process.pid}" / [${mode}] [${me}] 🚀🚀🚀\n`)

    const DEV = cf.mode === 'development', PROD = !DEV
    const API_DATA = new Connection({ name: 'data', timeout: 500 })
    const GPS: any = { gps1: {}, gps2: {} } /** Temporary GPS data store **/
    const Calculate = type[0] === 'boom_drill' ? new Boom_Drill_V3(cf) : new Default_Drill(cf)
    const Process = new ProcessActivity({})
    const LOG: any = log
    const VAC = DEV ? 100000 : Number(cf.threshold[0])     /** Bad GPS Threshold (cm) **/

    const publish = (channel: string, data: any) => Safe(async () => await API_DATA.set(channel, data), `[${channel}]`)

    /** For testing purpose **/
    DEV && simulation_testing(me, publish, GPS, cf)

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