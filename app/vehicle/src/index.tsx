import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Safe, Loop, Win, Doc, KeyValue, log } from 'utils/web'

import Main from './main'
import Settings from './settings'

const { name, version, mode } = Win.env
const proxy = Win.location.origin

log.success(`${mode}: ${name} ${version}`)

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy,
    env: Win.env,
    api: new Connection({ name: 'data', proxy }),
}

let i = 0
cfg.api.on('stream', (args: any) => {
    (++i % 10 === 0) && console.log(args)
    cfg.event.emit('stream', args)
})

const main = ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />
const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })