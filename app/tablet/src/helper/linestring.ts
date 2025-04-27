import { Point, UTM, colorize } from 'uweb/utils'
import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Delay, log } from 'utils/web'

const stringToColour = (str: string) => {
    let hash = 0;
    str.split('').forEach(char => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff
        colour += value.toString(16).padStart(2, '0')
    }
    return colour
}

export class LineString {

    Three
    Maptalks
    GroupThree = new THREE.Group()
    GroupMaptalks = new THREE.Group()

    constructor({ Maptalks, Three }: { Maptalks: MapView, Three: ThreeView }) {
        this.Three = Three
        this.Maptalks = Maptalks
    }

    add = (rows: tItem[]) => {
        const is = (m: any[]) => isNaN(m[0]) || isNaN(m[1]) || isNaN(m[2]) ? false : true
        try {

            for (const n of rows) {

                const { Coords, EntityHandle } = n
                const color = stringToColour(EntityHandle)
                const points = [], fpoints = []

                const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2, linecap: 'round', linejoin: 'round' })

                if (this.Three) {

                    for (const x of Coords) { is(x) && points.push(new THREE.Vector3(x[0], x[1], x[2])) }
                    const geometry = new THREE.BufferGeometry().setFromPoints(points)
                    const line = new THREE.Line(geometry, material)
                    line.computeLineDistances()
                    this.GroupThree.add(line)

                }

                if (this.Maptalks) {

                    for (const x of Coords) if (is(x)) {
                        const ll = UTM.convertUtmToLatLng(x[0], x[1], "48", "T")
                        const f = this.Maptalks.threeLayer.coordinateToVector3(<any>{ x: ll.lng, y: ll.lat, z: 0 }, 0)
                        fpoints.push(new THREE.Vector3(f.x, f.y, 0))
                    }
                    const fgeometry = new THREE.BufferGeometry().setFromPoints(fpoints)
                    const fline = new THREE.Line(fgeometry, material)
                    fline.computeLineDistances()
                    this.GroupMaptalks.add(fline)

                }

            }

        } catch (err: any) { log.error(`[LineString.add()]: ${err.message}`) }
    }

    removeAll = () => {

        try {

            const tNodes: any = []
            const mNodes: any = []

            this.GroupThree.traverse((child: any) => { tNodes.push(child) })
            tNodes.forEach((node: any) => { node.removeFromParent() })

            this.GroupMaptalks.traverse((child: any) => { mNodes.push(child) })
            mNodes.forEach((node: any) => { node.removeFromParent() })

        } catch (err: any) {
            log.error(`[LineString]: RemoveAll / ${err.message} [${typeof this.GroupThree},${typeof this.GroupMaptalks}]`)
        }

    }

    updateAll = (rows: tItem[]) => {

        this.removeAll()

        this.Three && this.Three.scene.remove(this.GroupThree)
        this.Maptalks && this.Maptalks.threeLayer.removeMesh(this.GroupMaptalks)

        this.add(rows)
        this.Three && this.Three.scene.add(this.GroupThree)
        this.Maptalks && this.Maptalks.threeLayer.addMesh(this.GroupMaptalks)

    }

}