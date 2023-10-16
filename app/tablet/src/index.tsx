import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Win, log } from 'utils/web'

import Main from './views/main'
import Settings from './views/setting'

const { name, version, mode } = Win.env

log.success(`${mode}: ${name} ${version}`)

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy: Win.location.origin,
    env: Win.env,
    api: new Connection({ name: 'data' }),
}

let i = 0; cfg.api.on('stream', (args: any) => {
    (++i % 10 === 0) && console.log(args)
    cfg.event.emit('stream', args)
})

Render(
    ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />,
    ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />,
    { maxWidth: '100%' },
)