import { KeyValue } from 'utils/web'

/** Generate common constants from Events **/
export const generateComonAndPersist = (args: any = {}) => {

    // Parse GPS data
    const gps: any = []
    let is_all_ok = true
    for (let i = 1; i <= 5; i++) {
        const key = `data_gps${i}`
        if (args.hasOwnProperty(key)) {
            const { fix, sat, vac, hac } = args[key]?.data ?? {}
            const ok = fix === 'rtk' && sat >= 5 && vac <= 2 && hac <= 2
            if (ok === false) is_all_ok = false
            gps.push({ key, fix, sat, vac, hac, ok })
        }
    }

    if (is_all_ok && args?.data_gps?.status) {

        const { A, B, C, G, R, T, status } = args.data_gps
        const { zoneNumber, zoneLetter } = status
        gps.push({ key: 'data_gps', A, B, C, G, R, T })
        if (zoneNumber && zoneLetter) KeyValue('common_gps', JSON.stringify({ zoneNumber, zoneLetter, gps }))
        KeyValue('status', JSON.stringify(status))

    }

}