import { Host, NetServer, NetClient } from 'unet'
import { Shell, Safe, Jfy, Sfy, Loop, Delay, Now, decodeENV, env, log } from 'utils'

const cfg = decodeENV()
const { version, mode } = cfg

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const num = (n: number) => Number((n).toFixed(3))
const expCurve = (n = 0, c = 2) => (Math.exp(c * Math.abs(n) / 70) - 1) / (Math.exp(c) - 1)

const tiltFromQuat = ({ q0, q1, q2, q3 }: any) => {
    // gravity direction in the sensor frame (no euler -> no coupling)
    const ux = 2 * (q1 * q3 - q0 * q2)
    const uy = 2 * (q2 * q3 + q0 * q1)
    const cl = (v: any) => Math.max(-1, Math.min(1, v))
    const deg = 180 / Math.PI
    return {
        qx: num(Math.asin(cl(-ux)) * deg), // tilt about X, decoupled from Y
        qy: num(Math.asin(cl(-uy)) * deg),  // tilt about Y, decoupled from X
    }
}

Safe(() => {

    const API = new Host({ name: 'iot', port: 4099 })

    const ecd = Number(cfg.encoder)
    const cnd = Number(cfg.clynder)

    let [_x, _y, _z, _xi, _xd, _yi, _yd] = cfg.tilt.map((s: string) => Number(s))

    API.on('data', async (req: any) => {

        const { enc, tilt, prox1, prox2 } = req.body
        const { x, y, z } = tilt
        const { qx, qy } = tiltFromQuat(tilt)

        const fxd = {
            axis: {
                ok: tilt.ok,
                md: tilt.mode,
                qx: qx + _x,
                qy: qy + _y,
                cx: 0,
                cy: 0,
                x: num(y + _x),
                y: num(-x + _y),
                z: num(z + _z),
                q: [tilt.q0, tilt.q1, tilt.q2, tilt.q3]
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
        const cx = fxd.axis.qy >= 0 ? num(expCurve(fxd.axis.qy, 4) * _xi) : num(expCurve(fxd.axis.qy, 4) * _xd)
        /**
         * When x = [ 0 to +70 ] -> y should increase to "_yi" exponentially
         * When x = [ 0 to -70 ] -> y should increase to "_yd" exponentially
         **/
        const cy = fxd.axis.qx >= 0 ? num(expCurve(fxd.axis.qx, 4) * _yi) : num(expCurve(fxd.axis.qx, 4) * _yd)

        // fxd.axis.x = num(fxd.axis.x + gen_x)
        // fxd.axis.y = num(fxd.axis.y + gen_y)

        fxd.axis.cx = num(fxd.axis.qx + cx)
        fxd.axis.cy = num(fxd.axis.qy + cy)

        console.log(fxd)

        console.log(`R ${fxd.axis.x} ${fxd.axis.y}`)
        console.log(`Q ${fxd.axis.qx} ${fxd.axis.qy}`)
        console.log(`C ${fxd.axis.cx} ${fxd.axis.cy}`)

        API.emit('sensors', fxd)

        return { status: 'ok' }

    })

}, '[IOT]')