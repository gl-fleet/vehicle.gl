import { Shell, Safe, Delay, decodeENV, log } from 'utils'

import { start_ublox } from './ublox'
import { start_unicore } from './unicore'

const { me, version, mode } = decodeENV()
const ublox = ['Prolific Technology, Inc. PL2303 Serial Port / Mobile Phone Data Cable', 'U-Blox AG u-blox GNSS receiver']
const unicore = ['QinHeng Electronics CH340 serial converter']

Delay(() => Safe(() => {

    const usb = (Shell.exec(`lsusb`, { silent: true }).stdout ?? '').split('\n')

    let module = mode === 'development' ? 'ublox' : ''

    for (const x of usb) {

        if (x.indexOf(ublox[0]) >= 0 || x.indexOf(ublox[1]) >= 0) module = 'ublox'
        if (x.indexOf(unicore[0]) >= 0) module = 'unicore'

    }

    log.info(`Starting "${module}"`)

    module === 'ublox' && start_ublox()
    module === 'unicore' && start_unicore()

}, 'GPS_Detection'), 2500)