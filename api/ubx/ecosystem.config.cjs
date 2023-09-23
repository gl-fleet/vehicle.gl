const { encodeENV } = require('utils')
const pkg = require('./package.json')

const env = encodeENV({
    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    host: "143.198.198.77,2101",
    gps1: '/dev/uGPS1,115200,180', /** | path | baud | to_ground[cm] | **/
    gps2: '/dev/uGPS2,115200,180', /** | path | baud | to_ground[cm] | **/
    offset: '300,250,10,0',        /** | gps_dist[cm] | to_front[cm] | to_right[cm] | to_top[cm] | **/
    threshold: '500,2.5,0',        /** | bad_gps[cm] | move_detect[m] | ... | **/
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
            exec_mode: "cluster",
            nstances: 1,
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        }
    ]
}