import { EventEmitter } from "events"
import { Connection } from 'unet/web'

declare global {

    type tPoint = { x: number, y: number, z: number }

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        proxy: string
        env: any
        api: Connection

    }

    interface iGPSCalc { }

    /**
     * GeoJson - Item
     */
    type tItem = {
        Layer: string
        SubClasses: string
        EntityHandle: string
        Coords: any[]
    }

}

export { }