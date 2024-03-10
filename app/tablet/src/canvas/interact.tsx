import type { MapView } from 'uweb/maptalks'
import type { ThreeView } from 'uweb/three'
import { Tick } from 'uweb/utils'

export class Interact {

    public cb = (sms: string) => null
    public is_left_ok = () => true
    public is_right_ok = () => true

    constructor(Maptalks: MapView, Three: ThreeView, cfg: iArgs) {

        /** MAPTALKS **/
        const tick = new Tick()
        tick.on((s: number) => cfg.event.emit('alert', { key: 'tick_map', message: s > 0 ? `Will automatically reposition camera in ${s} seconds` : '', onclose: 'tick-back' }))
        this.is_left_ok = tick.can
        Maptalks.map.on('moving', (n: any) => {
            if (Maptalks.map.isInteracting()) tick.set(10)
        })

        /** THREEJS **/
        Three.on('tick', (s: any) => cfg.event.emit('alert', { key: 'tick_three', message: s, onclose: 'tick-back' }))

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}