const { encodeENV } = require('utils')
const pkg = require('./package.json')

const env = encodeENV({

    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    me: 'SV01',
    proxy: process.env.MODE === 'development' ? 'http://localhost:8010' : 'http://139.59.115.158',
    replication_debug: true,
    sequelize_debug: true,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiU1YxMDEiLCJ0eXBlIjoidmVoaWNsZSIsInByb2plY3QiOiJWTVAiLCJleHBpcmVzSW4iOiIxODBkIiwiaWF0IjoxNjk3MTY2MDg5LCJleHAiOjE3MTI3MTgwODl9.VQwiGpUhM3A3yclra8KD3TEok3Eb1FXSAHywQJyZdJo',

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