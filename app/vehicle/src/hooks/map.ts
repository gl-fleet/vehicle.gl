import { React } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
const { useEffect, useState, useRef } = React

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
            ...conf,
        })

        ref.current.onReady(() => {

            setReady(true)

            /* Formats.osm('uhg.osm', (err: any, geojson: any) => {
                new maptalks.VectorLayer('osm', geojson).addTo(ref.current.map)
            }) */

            /* var imageLayer = new maptalks.ImageLayer('images', [
                {
                    url: 'map.jpg',
                    extent: [
                        105.4393104965784,
                        43.64676156188404,
                        105.58264774633426,
                        43.71038836371723,
                    ],
                    opacity: 0.5
                }
            ])

            ref.current.map.addLayer(imageLayer) */

        })

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(isDarkMode)

    }, [isDarkMode])

    return [isReady, ref.current]

}