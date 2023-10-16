const pkg = require('./package.json')
const { encodeENV } = require('utils')
const enj = require('../../env.js')

const env = encodeENV({
    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    ...enj[pkg.name],
})

module.exports = {
    apps: [
        env.u_mode === 'development' ? {

            name: env.u_name,
            script: "npm",
            args: "start",
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        } : {

            name: env.u_name,
            script: "./dist/run.js",
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        }
    ]
}