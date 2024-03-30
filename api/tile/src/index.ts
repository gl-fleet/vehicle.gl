import { Host, NetServer, NetClient } from 'unet'
import { decodeENV, Safe, Jfy, Sfy, Loop, Delay, Now, env, log } from 'utils'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import axios from 'axios'
import https from 'https'

const { name, version, mode, path, persist } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const defImg = readFileSync(`${path}/path.png`)

const mkdir = (dir: string) => existsSync(dir) ? true : mkdirSync(dir)

const tileImageFetch = (url: string) => new Promise((resolve) => {

    try {

        const l = url.split('/') // [ '', 'tile', '19', '415781', '191299.png' ]
        const f = `${path}/${l[2]}/${l[3]}_${l[4]}`

        if (existsSync(f)) {
            log.success(`[Tile:Get] -> ${f}`)
            resolve(readFileSync(f))
        }
        else {

            log.warn(`[Tile:Get] -> ${f}`)

            axios.get(`https://c.tile-cyclosm.openstreetmap.fr/cyclosm/${l[2]}/${l[3]}/${l[4]}`, {
                httpsAgent,
                responseType: "text",
                responseEncoding: "base64",
                timeout: 5 * 1000,
            })
                .then(response => {

                    const base64 = Buffer.from(response.data, "base64")
                    log.res(`[Tile:Then] -> Image size ${base64.length} / ${f}`)
                    mkdir(`${path}/${l[2]}`)
                    writeFileSync(f, base64, 'base64')
                    resolve(readFileSync(f))

                })
                .catch((e: any) => { log.error(`[Tile:Catch:1] -> ${e.message}`) && resolve(defImg) })

        }

    } catch (e: any) { log.error(`[Tile:Catch:0] -> ${e.message}`) && resolve(defImg) }

})

Safe(() => {

    const API = new Host({ name: 'tile', port: 4091 })

    mkdir(`${path}`)

    API.on('*', async (req: any) => {
        return persist === 'true' ? await tileImageFetch(req.originalUrl) : defImg
    })

}, '[TILE]')