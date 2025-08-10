import { start_ublox } from './ublox'
import { start_unicore } from './unicore'

import { Shell, Safe, Loop, decodeENV, log, env } from 'utils'

Safe(() => {

    const power = Shell.exec(`lsusb`, { silent: true }).stdout
    //

}, 'GPS_Detection')