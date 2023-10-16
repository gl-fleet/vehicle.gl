import { React } from 'uweb'
import { MapView } from 'uweb/maptalks'
import { ThreeView } from 'uweb/three'

const { useEffect, useState, useRef } = React

export const leave_point = (

    cfg: iArgs,
    Ready: boolean,
    Maptalks: MapView,
    Three: ThreeView

): [boolean, string] => {

    const [state, setState] = useState([false, ''])

    useEffect(() => {

        const { event, api } = cfg
        event.on('leave_point', () => {

            // const prev = camera.camera_config()
            // camera.camera_set('4', '10')

        })

    }, [])

    useEffect(() => {

        //

    }, [Ready])

    return state

}

const ok = () => {

    const conf = {}

    /** Three / Maptalks **/

    class three_camera {
        constructor() { }
        update = () => { }
    }

    class all_render_triangle {
        constructor() { }
        update = () => { }
    }

    class three_put_point {
        constructor() { }
        update = () => { }
        on = () => { }
    }

    const control: any = {
        camera: new three_camera(),
        geo_leave_point: new three_put_point(),
        geo_triangle: new all_render_triangle(),
    }

    const event = (key: string, value: {}) => {
        const l = key.split('.')
        return control[l[0]][l[1]](value)
    }

    /** React views **/

    const center = () => null
    const buttons = () => null
    const top_right = () => null
    const bot_right = () => null
    const settings = () => null

}