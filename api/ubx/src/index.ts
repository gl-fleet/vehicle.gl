import { Safe, Jfy, Sfy, Loop, Delay, decodeENV, log, env } from 'utils'
import { Host, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'
import { Calculus } from './calculus'
import { MoveDetect } from './movement'

log.success(``) && log.success(`"${env.npm_package_name}" module is running on "${process.pid}" 🚀🚀🚀`)

const cf = decodeENV()
const GPS: any = { gps1: {}, gps2: {} } /** Temporary GPS data store **/
const VAC = Number(cf.threshold[0])     /** Bad GPS Threshold (cm) **/
const LOG: any = log                    /** Making log as any:type **/

const Calculate = new Calculus(cf)
const Movement = new MoveDetect(Number(cf.threshold[1]))
const API = new Host({ name: cf.name }) /** Exposing data **/

Safe(() => {

    /** GPS-1-Initialize **/
    const GPS1 = new Serial()
    const Parser_1 = new F9P_Parser()
    GPS1.start(cf.gps1[0], Number(cf.gps1[1]))
    GPS1.onInfo = (t, { type, message }) => LOG[type](message) && API.emit('GPS1', { state: t, type, message })
    GPS1.on((chunk: any) => {

        log.res(`Serial[GPS1]: Message size ${chunk.length}`)
        log.info(`GPS1 -> ${chunk}`)
        const parsed = Parser_1.parse(chunk)
        if (parsed) {
            API.emit('GPS1', { state: 'success', type: 'success', message: 'GPS1 connected!', data: parsed })
            GPS.gps1 = parsed
        }
    })

    /** GPS-2-Initialize **/
    const GPS2 = new Serial()
    const Parser_2 = new F9P_Parser()
    GPS2.start(cf.gps2[0], Number(cf.gps2[1]))
    GPS2.onInfo = (t, { type, message }) => LOG[type](message) && API.emit('GPS2', { state: t, type, message })
    GPS2.on((chunk: any) => {

        log.res(`Serial[GPS2]: Message size ${chunk.length}`)
        const parsed = Parser_2.parse(chunk)
        if (parsed) {
            API.emit('GPS2', { state: 'success', type: 'success', message: 'GPS2 connected!', data: parsed })
            GPS.gps2 = parsed
        }

    })

    /** RTCM-Initialize **/
    const base = { host: cf.host[0], port: Number(cf.host[1]), lastMessage: 0, reconnect: 0 }
    const RTCM = new NetClient(base, (client) => {

        ++base.reconnect && client.on('data', (chunk: any) => {
            RTCM.last = base.lastMessage = Date.now()
            log.res(`TCP_Client<${base.host}:${base.port}> Message size ${chunk.length}`)
            API.emit('RTCM', { state: 'success', type: 'success', message: `RTCM [${base.host}:${base.port}]: Message size ${chunk.length} bytes`, data: chunk })
            GPS1.emit(chunk)
            GPS2.emit(chunk)
        })

    })
    RTCM.onInfo = (t, { type, message }) => LOG[type](message) && API.emit('RTCM', { state: t, type, message })

    /** GPS-Parser-Initialize **/
    Loop(() => {

        let { gps1, gps2 } = GPS

        if (!gps1.fix || !gps2.fix) { return 0 }

        log.info(`GPS(1): ${gps1.fix} ${gps1.ele} ${gps1.vac} ${gps1.hac} `)
        log.info(`GPS(2): ${gps2.fix} ${gps2.ele} ${gps2.vac} ${gps2.hac} `)

        API.emit('live-raw', GPS)

        const calculated = Calculate.calculate(GPS)
        const isMoved = calculated && Movement.check(calculated)

        isMoved && API.emit('GPS-moved-raw', { gps1, gps2 })

        if (gps1.vac <= VAC && gps2.vac <= VAC) {

            calculated && API.emit('GPS-calc', calculated)
            isMoved && API.emit('GPS-moved-calc', calculated)

        }

    }, 750)

})