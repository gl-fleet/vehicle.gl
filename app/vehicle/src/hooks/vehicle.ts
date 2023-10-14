import { React } from 'uweb'
import { Vehicle, Toyota } from 'uweb/utils'
import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

const { useEffect, useState, useRef } = React

export const vehicleHook = (

    isMapReady: boolean, Maptalks: MapView,
    isThreeReady: boolean, Three: ThreeView

): [boolean, Vehicle] => {

    const [isReady, setReady] = useState(false)
    const ref: { current: Vehicle } = useRef(null)

    useEffect(() => {

        if (!isMapReady || !isThreeReady) return

        Toyota({ size: 55, x: 0, y: -100, z: 0 }).then((Truck) => {

            ref.current = new Vehicle({ Truck, Maptalks, Three })
            setReady(true)

        })

    }, [isMapReady, isThreeReady])

    return [isReady, ref.current]

}