import { React } from 'uweb'
import { ThreeView } from 'uweb/three'
const { useEffect, useState, useRef } = React

export const threeHook = ({ containerId, isDarkMode, conf }: {
    containerId: string,
    isDarkMode: boolean,
    conf: any,
}): [boolean, ThreeView] => {

    const [isReady, setReady] = useState(false)
    const ref: { current: ThreeView } = useRef(null)

    useEffect(() => {

        ref.current = new ThreeView({
            containerId,
            isDarkMode,
            simulate: false,
            axesHelper: true,
            polrHelper: true,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(isDarkMode)

    }, [isDarkMode])

    return [isReady, ref.current]

}