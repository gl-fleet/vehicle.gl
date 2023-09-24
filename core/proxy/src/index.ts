import jwt from 'jsonwebtoken'
import { Core, Host } from 'unet'
import { Run, decodeENV, log } from 'utils'
import { Manage } from './pm2'

const { name, version, mode, port, secret } = decodeENV()
log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)
log.warn(`Secret: [${secret.slice(0, 8)}...]`)

Run({

    onStart: (_: any) => {

        /** Process Manage **/
        _.name = process.env.LERNA_PACKAGE_NAME
        _.manage = new Manage()
        _.proxy = new Core({
            port: Number(port),
            auth: (req: any, res: any, next: any) => {
                try {

                    const verify: any = jwt.verify(req.headers.authorization.split(' ')[1], secret)
                    if (typeof verify === 'object') req.headers = { ...req.headers, ...verify }
                    next()

                } catch (err: any) { next() }
            }
        })

        /** Process Manage **/
        const API = new Host({ name: 'proxy', timeout: 30 * 1000 })

        API.on('start', async ({ query }: any) => await _.manage.start(query.name))
        API.on('stop', async ({ query }: any) => await _.manage.stop(query.name))
        API.on('restart', async ({ query }: any) => await _.manage.restart(query.name))
        API.on('reload', async ({ query }: any) => await _.manage.reload(query.name)) /** NO-DOWNTIME 🚀 **/
        API.on('describe', async ({ query }: any) => await _.manage.describe(query.name))

        /** Authorization Token **/
        API.on('me', ({ headers }: any) => headers)
        API.on('sign', ({ query }: any) => jwt.sign(query, secret, { expiresIn: query.expiresIn ?? "14d" }))
        API.on('verify', ({ query }: any) => jwt.verify(query.token, secret))

        _.exit = () => {
            _.proxy.stop()
            log.warn(`<<< "${_.name}" server stopped >>>`) && process.exit(0)
        }

    },

    onExit: (_: any) => _.exit(),
    onError: (_: any, message: string) => log.error(message),

})