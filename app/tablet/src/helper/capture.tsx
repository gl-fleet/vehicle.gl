import { React } from 'uweb'
import { Safe, Delay, Loop, log } from 'utils/web'

const { useState, useEffect, useRef } = React

export const useWebcam = ({ loop, size, src }: {
    loop: number,
    size: [number, number],
    src?: string, /**  **/
}): [string, any] => {

    const [imgUrl, setImgUrl] = useState('')
    const execCapture = useRef(() => { })

    useEffect(() => {

        log.warn(`[useWebcam] Starting ...`)
        const video = document.createElement("video")
        const canvas = document.createElement("canvas")
        canvas.width = size[0]
        canvas.height = size[1]
        const context = canvas.getContext("2d")
        const constraints = { audio: false, video: { width: size[0], height: size[1] } }

        navigator.mediaDevices.getUserMedia && navigator.mediaDevices.getUserMedia(constraints).then((stream) => {

            Safe(() => {

                video.srcObject = stream
                video.play()

                const capture = () => {

                    if (context) {
                        context.drawImage(video, 0, 0, size[0], size[1])
                        setImgUrl(canvas.toDataURL())
                    } else {
                        log.warn(`[useWebcam] No context!`)
                        setImgUrl('')
                    }

                }

                if (loop > 0) Loop(() => capture(), loop)
                else execCapture.current = capture

            }, '[useWebcam]')

        }).catch((err) => log.error(`[useWebcam] ${err.message}`))

    }, [])

    return [imgUrl, execCapture.current]

}

export const useScreenshot = ({ loop, size, src }: {
    loop: number,
    size: [number, number],
    src?: string,
}): [string, any] => {

    const [imgUrl, setImgUrl] = useState('')
    const execCapture = useRef(() => { })

    useEffect(() => {

        log.warn(`[useWebcam] Starting ...`)
        const video = document.createElement("video")
        const canvas = document.createElement("canvas")
        canvas.width = size[0]
        canvas.height = size[1]

        const capture = () => {
            const map: any = document.querySelector("#render_0 canvas")
        }

        if (loop > 0) Loop(() => capture(), loop)
        else execCapture.current = capture

    }, [])

    return [imgUrl, execCapture.current]

}

const get_screen = () => {

    const img: any = document.querySelector("#view_1")

    Delay(() => Safe(() => {

        const map: any = document.querySelector("#render_0 canvas")
        Loop(() => { img.src = map.toDataURL() }, 2500)

    }), 2500)

}