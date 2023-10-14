const pkg = require('./package.json')
const { encodeENV } = require('utils')

const env = encodeENV({
    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    tile: `${process.env.MODE === 'development' ?
        'http://localhost:8443/tile/{z}/{x}/{y}.png' :
        'http://10.3.141.1:8443/tile/{z}/{x}/{y}.png'}`
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