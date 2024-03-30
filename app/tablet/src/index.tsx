import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Win, log } from 'utils/web'

import Main from './views/main'
import Settings from './views/setting'

const { name, version, mode } = Win.env

log.success(`${mode}: ${name} ${version}`)

if (true) {

    const low = document.documentElement.clientWidth < 1440 ? '0.75' : '1'
    const meta = document.createElement('meta')
    meta.name = "viewport"
    meta.content = `width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=${low}, minimum-scale=${low}`
    document.getElementsByTagName('head')[0].appendChild(meta)

}

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy: Win.location.origin,
    env: Win.env,
    api: new Connection({ name: 'data' }),
}

cfg.api.on('stream', (args: any) => {

    Date.now() % 5000 <= 1000 && console.log(args)
    cfg.event.emit('stream', args)

})

Render(

    ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />,
    ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />,
    { maxWidth: '100%' },

)