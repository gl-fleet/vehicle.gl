import type { MapView } from 'uweb/maptalks'
import type { ThreeView } from 'uweb/three'
import { Vehicle, Toyota, Drill, Dozer, LoadRequiredFiles } from 'uweb/utils'
import { Win } from 'utils/web'

export class Vehicles {

    public can: Vehicle | undefined
    public ready = false
    public cb = (sms: string) => null

    constructor(Maptalks: MapView, Three: ThreeView) {

        console.log(Win.env)

        const { type, body } = Win.env

        let GLTF: any = null

        GLTF = type === 'Toyota' ? Toyota : GLTF
        GLTF = type === 'Drill' ? Drill : GLTF
        GLTF = type === 'Dozer' ? Dozer : GLTF

        const args: any = {
            size: Number(body[0]) ?? null,
            x: Number(body[1]) ?? null,
            y: Number(body[2]) ?? null,
            z: Number(body[3]) ?? null,
        }

        const style: any = {
            opacity: 0.25
        }

        LoadRequiredFiles(() => {

            GLTF !== null && GLTF(args, style).then((Truck: any) => {

                this.can = new Vehicle({ Truck, Maptalks, Three, fps: 0, buffer: false })
                this.can.animate("Take 001", { loop: true, speed: 0.5 })

                this.ready = true
                this.cb('ready')

            })

        })

    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}