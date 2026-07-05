import { Host, NetServer, NetClient } from 'unet'
import { Shell, Safe, Jfy, Sfy, Loop, Delay, Now, decodeENV, env, log } from 'utils'

const cfg = decodeENV()
const { version, mode } = cfg

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name: 'iot', port: 4099 })
    console.log(cfg)

    const [x, y, z] = cfg.tilt.map((n: string) => Number(n))
    const ecd = Number(cfg.encoder)
    const cnd = Number(cfg.clynder)

    console.log(`Tilt`, x, y, z)

    API.on('data', async (req: any) => {

        const { enc, tilt, prox1, prox2 } = req.body

        const fxd = {
            axis: {
                ok: tilt.ok,
                x: Number(tilt.x) + x,
                y: Number(tilt.y) + y,
                z: Number(tilt.z) + z,
            },
            depth: {
                ok: enc.ok,
                n: enc.mm > 12000 || (enc.mm / 10 - ecd) < 0 ? 0 : Number((enc.mm / 10 - ecd).toFixed(1)),
            },
            pipe: { prox1, prox2, len: cnd }
        }

        console.log(fxd)

        API.emit('sensors', fxd)
        return { status: 'ok' }

    })

}, '[IOT]')