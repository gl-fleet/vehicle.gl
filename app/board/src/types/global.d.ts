import { EventEmitter } from "events"
import { Connection } from 'unet/web'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        proxy: string
        env: any
        api: Connection

    }

}

export { }