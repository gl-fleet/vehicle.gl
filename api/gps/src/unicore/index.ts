import { Shell, Safe, Loop, decodeENV, log, env } from 'utils'
import { Connection, NetClient } from 'unet'
import { Serial, F9P_Parser } from 'ucan'

const utmObj = require('utm-latlng')
export const NMEA = require('nmea-simple')
export const UTM = new utmObj('WGS 84')

type ParsedNMEA = {
    time: string
    latitude: number
    longitude: number
    fixQuality: number
    numSatellites: number
    hdop: number
    altitude: number
    heading: number
    pitch: number
    roll: number
    status: string
    hprSatellites: number
    speed: number
    deviceId: string
}

const parseNMEASentences = (gngga: string, gnhpr: string): ParsedNMEA => {

    const parseLatLng = (value: string, direction: string): number => {
        const deg = parseInt(value.slice(0, 2), 10)
        const min = parseFloat(value.slice(2))
        let dec = deg + min / 60
        if (direction === 'S' || direction === 'W') dec = -dec
        return dec
    }

    const gnggaParts = gngga.split(',')
    if (gnggaParts[0].slice(3) !== 'GGA') throw new Error('Not a GNGGA sentence')

    const time = gnggaParts[1]
    const latitude = parseLatLng(gnggaParts[2], gnggaParts[3])
    const longitude = parseLatLng(gnggaParts[4], gnggaParts[5])
    const fixQuality = parseInt(gnggaParts[6], 10)
    const numSatellites = parseInt(gnggaParts[7], 10)
    const hdop = parseFloat(gnggaParts[8])
    const altitude = parseFloat(gnggaParts[9])

    const gnhprParts = gnhpr.split(',')
    if (gnhprParts[0].slice(3) !== 'HPR') throw new Error('Not a GNHPR sentence')

    const hprTime = gnhprParts[1]
    const heading = parseFloat(gnhprParts[2])
    const pitch = parseFloat(gnhprParts[3])
    const roll = parseFloat(gnhprParts[4])
    const status = gnhprParts[5]
    const hprSatellites = parseInt(gnhprParts[6], 10)
    const speed = parseFloat(gnhprParts[7])
    const deviceId = gnhprParts[8].split('*')[0]

    return {
        time,
        latitude,
        longitude,
        fixQuality,
        numSatellites,
        hdop,
        altitude,
        heading,
        pitch,
        roll,
        status,
        hprSatellites,
        speed,
        deviceId
    }
}

export const start_unicore = () => {

    const { version, mode } = decodeENV()

    log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

    const GPS = new Serial()

    GPS.start('/dev/ttyUSB0', 115200)

    const RTCM = new NetClient({ host: '139.59.115.158', port: 2101 }, (client) => {

        client.on('data', (chunk: any) => {

            RTCM.last = Date.now()
            GPS.emit(chunk)

        })

    })

    RTCM.onInfo = (t, { type, message }) => {

        console.log(t)
        console.log(type, message)

    }

    let gngga: any = ''
    let gnhpr: any = ''

    let is_gngga = ''
    let is_gnhpr = ''

    GPS.onInfo = (t, { type, message }) => {

        console.log(t)
        console.log(type, message)

    }

    GPS.on((chunk: String) => {

        log.res(`Serial[GPS]: Message size ${chunk.length}`)

        console.log(chunk)

        const message = chunk.split(',')
        const mtype = message[0].slice(3)

        if (mtype === 'GGA') {
            gngga = chunk
            is_gngga = message[1]
        }

        if (mtype === 'HPR') {
            gnhpr = chunk
            is_gnhpr = message[1]
        }

        if (is_gngga && is_gnhpr && is_gngga === is_gnhpr) {

            is_gngga = ''
            is_gnhpr = ''

            try {

                const _gga = NMEA.parseNmeaSentence(gngga)
                const _hpr = NMEA.parseNmeaSentence(gnhpr)

                console.log(_gga)
                console.log(_hpr)

            } catch (err) { }

            const result = parseNMEASentences(gngga, gnhpr)

            gngga = ''
            gnhpr = ''

            console.log(`${is_gngga} === ${is_gnhpr}`)
            console.log(result)

        }

    })

}