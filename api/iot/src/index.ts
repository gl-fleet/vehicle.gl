import { Host, NetServer, NetClient } from 'unet'
import { Shell, Safe, Jfy, Sfy, Loop, Delay, Now, decodeENV, env, log } from 'utils'

const cfg = decodeENV()
const { version, mode } = cfg

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)


Safe(() => {

    const API = new Host({ name: 'iot', port: 4099 })

    const ecd = Number(cfg.encoder)
    const cnd = Number(cfg.clynder)

    const [_x, _y, _z, _xi, _xd, _yi, _yd] = cfg.tilt.map((s: string) => Number(s))

    const expCurve = (n = 0, c = 2) => (Math.exp(c * Math.abs(n) / 70) - 1) / (Math.exp(c) - 1)
    const num = (n: number) => Number((n).toFixed(3))

    API.on('data', async (req: any) => {

        const { enc, tilt, prox1, prox2 } = req.body
        const { x, y, z } = tilt

        const fxd = {
            axis: {
                ok: tilt.ok,
                md: tilt.mode,
                x: num(y + _x),
                y: num(-x + _y),
                z: num(z + _z),
            },
            depth: {
                ok: enc.ok,
                n: enc.mm > 12000 || (enc.mm / 10 - ecd) < 0 ? 0 : Number((enc.mm / 10 - ecd).toFixed(1)),
            },
            pipe: { prox1, prox2, len: cnd }
        }

        /**
         * When y = [ 0 to +70 ] -> x should increase to "_xi" exponentially
         * When y = [ 0 to -70 ] -> x should increase to "_xd" exponentially
         **/
        const gen_x = fxd.axis.y >= 0 ? num(expCurve(fxd.axis.y, 4) * _xi) : num(expCurve(fxd.axis.y, 4) * _xd)
        /**
         * When x = [ 0 to +70 ] -> y should increase to "_yi" exponentially
         * When x = [ 0 to -70 ] -> y should increase to "_yd" exponentially
         **/
        const gen_y = fxd.axis.x >= 0 ? num(expCurve(fxd.axis.x, 4) * _yi) : num(expCurve(fxd.axis.x, 4) * _yd)

        // fxd.axis.x = num(fxd.axis.x + gen_x)
        // fxd.axis.y = num(fxd.axis.y + gen_y)

        console.log(fxd.axis)

        API.emit('sensors', fxd)

        return { status: 'ok' }

    })

}, '[IOT]')