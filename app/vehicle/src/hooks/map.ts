import { React } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { Formats } from 'maptalks.formats'
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
            animateDuration: 250,
            // urlTemplate: 'http://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            urlTemplate: 'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            ...conf,
        })

        ref.current.onReady(() => {

            setReady(true)

            /* Formats.osm('map.osm', (err: any, geojson: any) => {
                new maptalks.VectorLayer('osm', geojson).addTo(ref.current.map)
            }) */

            /* var imageLayer = new maptalks.ImageLayer('images', [
                {
                    url: 'map.png',
                    extent: [
                        105.44454645247312,
                        43.64793879136907,
                        105.58788370222896,
                        43.70467742127167,
                    ],
                    opacity: 0.5
                }
            ])

            imageLayer.setZIndex(-1)

            ref.current.map.addLayer(imageLayer) */

        })

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(isDarkMode)

    }, [isDarkMode])

    return [isReady, ref.current]

}