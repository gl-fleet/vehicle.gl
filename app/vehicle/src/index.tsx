import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { UTM } from 'uweb/utils'
import { Safe, Loop, Win, Doc, KeyValue, log } from 'utils/web'

import Main from './main'
import Settings from './settings'

import { EventEmitter } from "events"

const proxy = Win.location.origin
const remote = 'https://u002-gantulgak.as1.pitunnel.com/'
const debug = true

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy,
    io: {
        proxy: new Connection({ name: 'proxy', proxy }),
        io: new Connection({ name: 'io', proxy }),
        gsm: new Connection({ name: 'gsm', proxy: debug ? remote : proxy }),
        ubx: new Connection({ name: 'ubx', proxy: debug ? remote : proxy }),
    },
}

cfg.io.ubx.on('GPS1', (args: any) => cfg.event.emit('GPS1', args))
cfg.io.ubx.on('GPS2', (args: any) => cfg.event.emit('GPS2', args))
cfg.io.gsm.on('GSM', (args: any) => cfg.event.emit('GSM', args))
cfg.io.ubx.on('RTCM', (args: any) => cfg.event.emit('RTCM', args))

cfg.io.ubx.on('GPS-calc', (arg: any) => cfg.event.emit('GPS-calc', arg))

/* Loop(() => {

    const utm = [541117.5903320312, 4837981.773193359, 1548.672485351562]
    const ll = UTM.convertUtmToLatLng(utm[0], utm[1], "48", "T")
    cfg.event.emit('GPS-calc', {
        MP: { x: utm[0], y: utm[1], z: utm[2] },
        camera: { top: { x: utm[0], y: utm[1], z: utm[2] + 100 } },
        coords: { front: [ll.lat, ll.lng, 0] },
        map: [ll.lat, ll.lng, 0],
        rotate: [0, 0, 0],
    })

}, 500) */

cfg.io.ubx.on('connect', () => { log.success('[Connected]') })
cfg.io.ubx.on('disconnect', () => { log.warn('[Disconnected]') })
cfg.io.ubx.on('connect_error', () => { log.error('[Connection:Error]') })

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    return <Main {...cfg} isDarkMode={isDarkMode} />

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => {

    return <Settings {...cfg} isDarkMode={isDarkMode} />

}

Render(main, settings, { maxWidth: '100%' })