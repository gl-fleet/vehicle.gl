import { MapView } from 'uweb/maptalks'
import { Win } from 'utils/web'

export const CanvasFixer = () => {

    const cv: any = document.querySelector('.maptalks-canvas-layer > canvas')
    const ct: any = cv.getContext('2d')

    if (ct) {

        setInterval(() => {

            try {

                const p = ct.getImageData(0, 0, 1, 1).data

                if (p[0] === 255 || p[0] === 0) {
                    console.log('[Blank_Fixer]', p)
                }

            } catch (err) {
                console.log('[Blank_Fixer]', err)
            }

        }, 15 * 1000)

    }

}

export class Left {

    // public base = maptalks
    public can: MapView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, cfg: iArgs) {

        this.can = new MapView({
            containerId: id,
            isDarkMode: cfg.isDarkMode,
            animateDuration: 250,
            urlTemplate: Win.env.tile,
            simulate: false,
            devicePixelRatio: 0.8,
            fps: 30,
        })

        this.can.onReady(() => {

            cfg.event.on('mode', (isDark: boolean) => this.can.setMode(isDark))

            this.ready = true
            this.cb('ready')

        })


    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}