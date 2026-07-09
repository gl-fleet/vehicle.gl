const ME = "DL430i"
const TOKEN_SECRET = "gearlink"
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiREw0MjkiLCJ0eXBlIjoiZHJpbGwiLCJwcm9qZWN0IjoiRHJpbGxleCIsImV4cGlyZXNJbiI6IjE4MDBkIiwiaWF0IjoxNzgzNDQzMDYxLCJleHAiOjE5Mzg5NjMwNjF9.f8Ms0AOFfhKWxTXXyLvOsPZVPblzuk-DgFPjPBaAF1w"

const is_dev = process.env.MODE === "development"
const tile = is_dev ? 'http://localhost:8443/tile/{z}/{x}/{y}.png' : 'http://10.42.0.1:8443/tile/{z}/{x}/{y}.png'
const proxy = is_dev ? 'http://localhost:8010' : 'http://139.59.115.158'
const virtually = "https://dl430-gantulgak.as2.pitunnel.com"

console.log(` --- ${ME} ---`)

module.exports = {
    proxy: {
        me: ME,
        port: 8443,
        secret: TOKEN_SECRET,
    },
    data: {
        me: ME,
        proxy: proxy,
        token: ACCESS_TOKEN,
        replication_debug: true,
        sequelize_debug: true,
    },
    gsm: {
        me: ME,
        path: "/dev/uModem,115200",
    },
    gps: {
        me: ME,
        type: 'boom_drill,egm',
        virtually,
        threshold: '1000,2.5,0',
        host: "139.59.115.158,2103",
        gps1: '/dev/uGPS1,38400,350',
        gps2: '/dev/uGPS2,38400,350',
        dst: '88',
        ofs: '0,0',
        head: '400',
        bit: '936',
        tilt: '2,-0.9,0',
    },
    iot: {
        me: ME,
        encoder: '70',
        clynder: '450',
    },
    tablet: {
        me: ME,
        type: 'Drill',
        virtually,
        body: `55,0,0,0`,
        tile: tile,
        webcam: false,
        screenshot: false,
    }
}