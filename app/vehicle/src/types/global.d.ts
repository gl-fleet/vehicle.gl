import { EventEmitter } from "events"
import { Connection } from 'unet/web'

declare global {

    type tPoint = { x: number, y: number, z: number }

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        proxy: string
        io: {
            proxy: Connection
            gsm: Connection
            ubx: Connection
            io: Connection
        }

    }

    interface iGPSCalc { }

}

export { }