const is_dev = process.env.MODE === 'development'
const host = 'http://10.3.141.1'
const client = 'http://10.3.141.55'

module.exports = {

    /*** *** *** @___CORE___ *** *** ***/
    proxy: {
        port: 8443,
        secret: process.env.TOKEN_SECRET ?? ':(',
        host,
        client,
    },

    data: {
        me: 'SV101',
        proxy: is_dev ? 'http://localhost:8010' : 'http://139.59.115.158',
        replication_debug: true,
        sequelize_debug: true,
        token: process.env.ACCESS_TOKEN ?? ':(',
    },

    /*** *** *** @___API___ *** *** ***/
    gsm: {
        path: "/dev/ttyS0,115200"
    },

    tile: {
        persist: true,
        path: "./tiles"
    },

    ubx: {
        host: "143.198.198.77,2101",
        gps1: '/dev/uGPS1,115200,230',      /** | path | baud  | to_ground [cm] | **/
        gps2: '/dev/uGPS2,115200,230',      /** | path | baud  | to_ground [cm] | **/
        offset: '116.3,50,0,0',             /** | gps_dist[cm] | to_front  [cm] | to_right[cm] | to_top[cm] | **/
        // offset: '337.0,640,-115,0',      /** | gps_dist[cm] | to_front  [cm] | to_right[cm] | to_top[cm] | **/
        threshold: '1000,2.5,0',            /** | bad_gps [cm] | move_detect[m] | ... | **/
    },

    /*** *** *** @___APP___ *** *** ***/
    vehicle: {
        type: 'Toyota',                     /** | Toyota | Drill | Dozer | -> GLTF type **/
        body: `55,0,-100,0`,                /** | size: 50 | x: 0 | y: 0 | z: 0 | -> GLTF transformation (default) **/
        tile: is_dev ? 'http://localhost:8443/tile/{z}/{x}/{y}.png' : 'http://10.3.141.1:8443/tile/{z}/{x}/{y}.png'
    },

    tablet: {
        type: 'Toyota',                      /** | Toyota | Drill | Dozer | -> GLTF type **/
        body: `55,0,-100,0`,                /** | size: 50 | x: 0 | y: 0 | z: 0 | -> GLTF transformation (default) **/
        tile: is_dev ? 'http://localhost:8443/tile/{z}/{x}/{y}.png' : 'http://10.3.141.1:8443/tile/{z}/{x}/{y}.png'
    },

}