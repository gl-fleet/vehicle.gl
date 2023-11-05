/*** *** *** @___ENV_FILE___ *** *** ***/

const whoami = `DR101`
const is_dev = process.env.MODE === 'development'
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRFIxMDEiLCJ0eXBlIjoiZHJpbGwiLCJwcm9qZWN0IjoiQ3VsbGluYW4iLCJleHBpcmVzSW4iOiIxODBkIiwiaWF0IjoxNjk4MDQ2Njk0LCJleHAiOjE3MTM1OTg2OTR9.ZGf4qbXkte4AfLH_gwUpkXy1GuMNvsZASN2BNxK0tWY"

module.exports = {

    /*** *** *** @___CORE___ *** *** ***/

    proxy: {
        me: whoami,
        port: 8443,
        secret: process.env.TOKEN_SECRET ?? ':(',
    },

    data: {
        me: whoami,
        proxy: is_dev ? 'http://localhost:8010' : 'http://139.59.115.158',
        replication_debug: true,
        sequelize_debug: true,
        token: ACCESS_TOKEN,
    },

    /*** *** *** @___API___ *** *** ***/

    gsm: {
        me: whoami,
        path: "/dev/ttyS0,115200"
    },

    ubx: {
        me: whoami,
        host: "143.198.198.77,2102",
        gps1: '/dev/uGPS1,115200,300',      /** | path | baud  | to_ground [cm] | **/
        gps2: '/dev/uGPS2,115200,300',      /** | path | baud  | to_ground [cm] | **/
        offset: '337.0,640,-115,0,0',       /** | gps_dist[cm] | to_front  [cm] | to_right[cm] | to_top[cm] | expand[cm]  **/
        threshold: '1000,2.5,0',            /** | acc_gps [cm] | move_detect[m] | ... | **/
    },

    tile: {
        me: whoami,
        persist: true,
        path: "./tiles"
    },

    /*** *** *** @___APP___ *** *** ***/

    tablet: {
        me: whoami,
        type: 'Drill',                      /** | Toyota | Drill | Dozer | -> GLTF type **/
        body: `55,0,0,0`,                   /** | size: 50 | x: 0 | y: 0 | z: 0 | -> GLTF transformation (default) **/
        tile: is_dev ? 'http://localhost:8443/tile/{z}/{x}/{y}.png' : 'http://10.3.141.1:8443/tile/{z}/{x}/{y}.png',
        webcam: false,
        screenshot: false,
    },

    board: {
        me: whoami,
    },

}