const _ = {
    ME: "DL430i",
    TOKEN_SECRET: "gearlink",
    ACCESS_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiREw0MzAiLCJ0eXBlIjoiZHJpbGwiLCJwcm9qZWN0IjoiRHJpbGxleCIsImV4cGlyZXNJbiI6IjE4MDBkIiwiaWF0IjoxNzgzMjQ0NzMwLCJleHAiOjE5Mzg3NjQ3MzB9.UbSh42YWCFYXf3HpZu-e-pSsinU1CMzfDZf-Ua5PikM",
    PROXY: process.env.MODE === "development" ? 'http://localhost:8010' : 'http://139.59.115.158',
    // REMOTE: undefined,
    REMOTE: "https://dl430-gantulgak.as2.pitunnel.com"
    // REMOTE: "https://hdm024-gantulgak.as2.pitunnel.com"
}

module.exports = {
    proxy: {
        me: _.ME,
        port: 8443,
        secret: _.TOKEN_SECRET,
    },
    data: {
        me: _.ME,
        proxy: _.PROXY,
        token: _.ACCESS_TOKEN,
        replication_debug: true,
        sequelize_debug: true,
    },
    gsm: {
        me: _.ME,
        interface: 'WLAN0',
        path: "/dev/uModem,115200",
    },
    iot: {
        me: _.ME,
        encoder: '0',
        clynder: '500',
        /** Tilt: x,y,z x & y **/
        // tilt: '0,0,0,-0.20,-0.20,-0.20,-0.20'
        tilt: '0,0,0,-0.1,-0.1,-0.1,-0.1'
    },
    gps: {
        me: _.ME,
        type: 'boom_drill,egm',
        virtually: _.REMOTE,
        threshold: '1000,2.5,0',
        host: "139.59.115.158,2103",
        /** Offset relateds **/
        gps1: '/dev/uGPS1,38400',
        gps2: '/dev/uGPS2,38400',
        /** From mid of 2 GPS -> Right Front Down ( CM ) **/
        dst: '87',
        ofs: '45,40',
        head: '604',
        bit: '915',
    },
    tablet: {
        me: _.ME,
        type: 'Drill',
        virtually: _.REMOTE,
        body: `55,0,0,0`,
        webcam: false,
        screenshot: false,
    }
}