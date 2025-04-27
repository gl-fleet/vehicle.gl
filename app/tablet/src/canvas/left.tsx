import { MapView } from 'uweb/maptalks'

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

    public can: MapView
    public ready = false
    public cb = (sms: string) => null

    constructor(id: string, cfg: iArgs) {

        const types = {
            'free': 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'topo': 'https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=l4hWJmvvmISSL7tpiPUZ',
            'satellite': 'https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
            'openstreet': 'https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
        }

        this.can = new MapView({
            zoom: 19.5,
            containerId: id,
            isDarkMode: cfg.isDarkMode,
            // animateDuration: 250,
            simulate: false,
            urlTemplate: types.free,
            // devicePixelRatio: 0.9,
            // fps: 30,
        })

        this.can.onReady(() => {

            cfg.event.on('mode', (isDark: boolean) => this.can.setMode(isDark))
            this.ready = true
            this.cb('ready')

        })


    }

    on = (cb: (sms: string) => any) => { this.cb = cb }

}