import { React } from 'uweb'
import { Vehicle, Toyota, Drill, Dozer } from 'uweb/utils'
import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

import { Win, Sfy, log } from 'utils/web'

const { name, version, mode, type, body } = Win.env
const { useEffect, useState, useRef } = React

export const vehicleHook = (

    isMapReady: boolean, Maptalks: MapView,
    isThreeReady: boolean, Three: ThreeView

): [boolean, Vehicle] => {

    const [isReady, setReady] = useState(false)
    const ref: { current: Vehicle } = useRef(null)

    useEffect(() => {

        if (!isMapReady || !isThreeReady) return

        log.success(`Vehicle.Type: ${Sfy({ type })}`)
        log.success(`Vehicle.Body: ${Sfy({ body })}`)

        let GLTF: any = null
        GLTF = type === 'Toyota' ? Toyota : GLTF
        GLTF = type === 'Drill' ? Drill : GLTF
        GLTF = type === 'Dozer' ? Dozer : GLTF

        const args: any = {
            size: Number(body[0]) ?? null,
            x: Number(body[1]) ?? null,
            y: Number(body[2]) ?? null,
            z: Number(body[3]) ?? null,
        }

        GLTF !== null && GLTF(args).then((Truck: any) => {

            ref.current = new Vehicle({ Truck, Maptalks, Three })
            setReady(true)

        })

    }, [isMapReady, isThreeReady])

    return [isReady, ref.current]

}