import { KeyValue } from 'utils/web'

/** Calculate distance */
export const distance3D = (A: tPoint, B: tPoint) => {
    try {
        return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2))
    } catch (error) {
        return 0
    }
}

/** Find point at given distance on AB vector */
export const findPointInVector = (A: tPoint, B: tPoint, r: number) => {

    try {

        const d = distance3D(A, B)
        return {
            x: (A.x + ((B.x - A.x) / d) * r),
            y: (A.y + ((B.y - A.y) / d) * r),
            z: (A.z + ((B.z - A.z) / d) * r)
        }

    } catch (err: any) {
        console.log(err.message)
        return { x: 0, y: 0, z: 0 }
    }

}

const camera_angles: any = {

    front_right_top: (far: number = 10, arg: any) => {

        const { TM, TR, BM, BR } = arg
        const f_r = findPointInVector(TM, TR, far)
        const b_r = findPointInVector(BM, BR, far)
        const b_f = findPointInVector(b_r, f_r, far)
        const r_f_t = findPointInVector(b_f, { ...b_f, z: b_f.z + far }, far)

        return r_f_t

    },

    front_left_top: (far: number = 10, arg: any) => {

        const { TL, TM, BL, BM } = arg
        const f_l = findPointInVector(TM, TL, far)
        const b_l = findPointInVector(BM, BL, far)
        const b_f = findPointInVector(b_l, f_l, far)
        const l_f_t = findPointInVector(b_f, { ...b_f, z: b_f.z + far }, far)

        return l_f_t

    },

    from_back: (far: number = 25, arg: any) => {

        const { TM, BM } = arg
        return findPointInVector(TM, BM, far)

    },

    from_right: (far: number = 25, arg: any) => {

        const { TM, TR } = arg
        return findPointInVector(TM, TR, far)

    },

    from_top: (far: number = 25, arg: any) => {

        const { TM, BM, utm } = arg
        const MP = { x: utm[0], y: utm[1], z: utm[2] }
        const P = findPointInVector(MP, BM, 1)
        P.z += far
        return { ...P }

    }

}

const views = [
    'front_right_top',
    'front_left_top',
    'from_back',
    'from_right',
    'from_top',
]

export const camera_toggle = () => {

    const { type } = camera_config()
    const next_type = (type + 1) % views.length
    KeyValue('camera_type', `${next_type}`)

}

export const camera_zoom_in = () => {

    const { far } = camera_config()
    const threshold = Math.ceil(far / 50) * 5
    far > 5 && KeyValue('camera_far', `${far - threshold}`)

}

export const camera_zoom_out = () => {

    const { far } = camera_config()
    const threshold = Math.ceil(far / 50) * 5
    far < 250 && KeyValue('camera_far', `${far + threshold}`)

}

export const camera_config = () => {

    const type = Number(KeyValue('camera_type') || '0')
    const far = Number(KeyValue('camera_far') || '25')
    return { type, far }

}

export const camera_set = (type: string, far: string) => {

    KeyValue('camera_type', type)
    KeyValue('camera_far', far)

}

export const camera_angle = (arg: {

    TL: number[], TM: number[], TR: number[],
    BL: number[], BM: number[], BR: number[],

}, asArray = false) => {

    const { type, far } = camera_config()
    const c = camera_angles[views[type]](far, arg)
    if (asArray) return [c.x, c.y, c.z]
    else return c

}