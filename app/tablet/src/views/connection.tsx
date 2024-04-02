import { React, Result, Typography } from 'uweb'
import { createGlobalStyle } from 'styled-components'

const { useEffect, useState } = React

const Disconnect = createGlobalStyle`
    #root {
        filter: blur(0px) grayscale(1);
    }
    #connection {
        position: fixed;
        z-index: 999;
        margin: auto;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
        width: 480px;
        height: 256px;
        background: #000;
        border-radius: 8px;
    }
    .ant-result-title {
        color: #fff !important;
    }
`

const Connect = createGlobalStyle`
    #root {
        filter: blur(0px) grayscale(0);
    }
`

export default (cfg: iArgs) => {

    const [state, setState] = useState(false)

    useEffect(() => {

        const { api } = cfg

        api.on('connect', () => setState(true))
        api.on('disconnect', () => setState(false))
        api.on('connect_error', () => setState(false))

    }, [])

    if (state) return <Connect />
    else return <div id="connection">
        <Disconnect />
        <Result
            status="error"
            title="Your tablet is disconnected from the HUB computer!"
        />
    </div>

}