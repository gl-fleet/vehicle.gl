import { Point, UTM, colorize } from 'uweb/utils'
import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Delay, log } from 'utils/web'

export class Triangle {

    isM = false
    isT = false

    Three
    Maptalks
    GroupThree = new THREE.Group()
    GroupMaptalks = new THREE.Group()
    Raycaster
    Point

    constructor({ Maptalks, Three }: { Maptalks: MapView, Three: ThreeView }) {

        this.Maptalks = Maptalks
        this.Three = Three
        this.Point = new Point({ Maptalks, Three })
        this.Raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 100)

    }

    ray = ([x, y, z]: number[], cb: any) => {
        try {

            /**
             * FIND DIRECTION VECTOR FROM V1 -> V2
             * const direct = new THREE.Vector3()
             * direct.subVectors( v2, v1 ).normalize()
             */

            this.Point.update('from', 'red', [x, y, z])
            this.Raycaster.set(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1))
            const down = this.Raycaster.intersectObject(this.GroupThree)

            if (down && down.length > 0) {

                const r = { ...down[0], distance: down[0].distance }
                this.Point.update('to', 'blue', [r.point.x, r.point.y, r.point.z])
                cb(r)

            } else {

                this.Raycaster.set(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, 1))
                const up = this.Raycaster.intersectObject(this.GroupThree)
                if (up && up.length > 0) {
                    const r = { ...up[0], distance: -up[0].distance }
                    this.Point.update('to', 'blue', [r.point.x, r.point.y, r.point.z])
                    cb(r)
                }

            }

        } catch (err: any) { console.log(`While X-RAY: ${err.message}`) }
    }

    add = (group: any, rows: tItem[]) => {
        try {

            const geometry = new THREE.BufferGeometry()
            const positions = []
            const normals = []

            const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3()
            const ab = new THREE.Vector3(), bb = new THREE.Vector3(), cb = new THREE.Vector3()

            for (const n of rows) {

                const j = n.Coords[0]
                const ax = j[0][0], ay = j[0][1], az = j[0][2]
                const bx = j[1][0], by = j[1][1], bz = j[1][2]
                const cx = j[2][0], cy = j[2][1], cz = j[2][2]

                positions.push(ax, ay, az)
                positions.push(bx, by, bz)
                positions.push(cx, cy, cz)

                pA.set(ax, ay, az)
                pB.set(bx, by, bz)
                pC.set(cx, cy, cz)

                cb.subVectors(pC, pB)
                ab.subVectors(pA, pB)
                cb.cross(ab)

                cb.normalize()

                const nx = cb.x
                const ny = cb.y
                const nz = cb.z

                normals.push(nx, ny, nz)
                normals.push(nx, ny, nz)
                normals.push(nx, ny, nz)

            }

            const disposeArray = () => { }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).onUpload(disposeArray))
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3).onUpload(disposeArray))
            geometry.computeBoundingSphere()

            const material = new THREE.MeshLambertMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
                color: "orange",
            })

            group.add(new THREE.Mesh(geometry, material))

        } catch (err: any) { log.error(`[Triangle.add()]: ${err.message}`) }
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
            log.error(`[Triangle]: RemoveAll / ${err.message}`)
        }

    }

    updateAll = (rows: tItem[]) => {

        this.Three.scene.remove(this.GroupThree)
        this.Maptalks.threeLayer.removeMesh(this.GroupMaptalks)

        this.removeAll()

        this.add(this.GroupThree, rows)
        this.Three.scene.add(this.GroupThree)

    }

}