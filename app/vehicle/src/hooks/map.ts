import { React } from 'uweb'
import { Win } from 'utils/web'
import { MapView, maptalks } from 'uweb/maptalks'
const { useEffect, useState, useRef } = React

const { tile } = Win.env

export const mapHook = ({ containerId, isDarkMode, conf }: {
    containerId: string,
    isDarkMode: boolean,
    conf: any,
}): [boolean, MapView] => {

    const [isReady, setReady] = useState(false)
    const ref: { current: MapView } = useRef(null)

    useEffect(() => {

        ref.current = new MapView({
            containerId,
            isDarkMode,
            simulate: false,
            animateDuration: 250,
            urlTemplate: tile,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(isDarkMode)

    }, [isDarkMode])

    return [isReady, ref.current]

}