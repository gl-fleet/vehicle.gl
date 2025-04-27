import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { log } from 'utils/web'
import { Coordinate } from 'uweb/utils'

import TextSprite from '@seregpie/three.text-sprite' /** WARNING: Multiple instances of Three.js being imported. */

export class Clynder {

    Three
    Maptalks
    GroupThree = new THREE.Group()
    GroupMaptalks = new THREE.Group()
    hidetext = false

    constructor({ Maptalks, Three, hideText = false }: { Maptalks?: MapView, Three?: ThreeView, hideText?: boolean }) {

        this.Three = Three
        this.Maptalks = Maptalks
        this.hidetext = hideText

    }

    nearest = ([x, y, z]: number[], m: number = 500) => {

        let v = { d2: m, d3: m, v: [0, 0, 0], n: '*' }

        const dist = (A: any, B: any) => { try { return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2)) } catch (error) { return -1 } }

        this.GroupThree.traverse((child: any) => {
            if (child.hasOwnProperty('z')) {

                const d3 = dist({ x, y, z }, { ...child.position, z: child.z ?? 0 })
                const d2 = dist({ x, y, z: 0 }, { ...child.position, z: 0 })
                if (d3 < v.d3) {
                    v.d3 = d3
                    v.d2 = d2
                    v.v = [child.position.x, child.position.y, child.z ?? 0]
                    v.n = child.name
                }

            }
        })

        return v

    }

    get = (name: string, height: number) => {

        const div = 50
        const color = '#1668dc'
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, height, 32, 1, false)
        const material = new THREE.MeshBasicMaterial({ color })
        const cylinder = new THREE.Mesh(geometry, material)
        cylinder.rotateX(Math.PI / 2)
        cylinder.name = name
        return cylinder

    }

    add = (rows: csvItems[]) => {

        try {

            const add_one = ([n, x, y, z, h]: csvItems) => {

                const [aU, aL, oU, oL]: any = Coordinate(x, y, z - (h / 2))
                const div = 50
                const color = '#1668dc'

                if (this.Three) {

                    const geometry = new THREE.CylinderGeometry(0.2, 0.2, h, 32, 1, false)
                    const material = new THREE.MeshBasicMaterial({ color })
                    const cylinder = new THREE.Mesh(geometry, material)
                    cylinder.rotateX(Math.PI / 2)
                    cylinder.name = n
                    cylinder.z = z
                    cylinder.position.set(...aU)
                    this.GroupThree.add(cylinder)

                    if (!this.hidetext) {
                        const text: any = new TextSprite({ text: n, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 1, color: '#ffffffbf', padding: 0, fontWeight: 'bold' })
                        text.position.set(aU[0], aU[1], aU[2] + (h / 2))
                        this.GroupThree.add(text)
                    }

                }

                if (this.Maptalks) {

                    const geometry = new THREE.CylinderGeometry(0.175 / div, 0.175 / div, 0.002 /** ~10cm **/, 8, 1)
                    const material = new THREE.MeshBasicMaterial({ color })
                    const cylinder = new THREE.Mesh(geometry, material)
                    cylinder.rotateX(Math.PI / 2)
                    cylinder.name = n
                    cylinder.z = z
                    const f = this.Maptalks.threeLayer.coordinateToVector3(<any>{ x: oL.x, y: oL.y, z: oL.z }, 0)
                    cylinder.position.set(f.x, f.y, 0)
                    this.GroupMaptalks.add(cylinder)

                }

            }

            rows.map((e) => add_one(e))

        } catch (err: any) { log.error(`[Clynder.add()]: ${err.message}`) }

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
            log.error(`[Clynder]: RemoveAll / ${err.message} [${typeof this.GroupThree},${typeof this.GroupMaptalks}]`)
        }

    }

    updateAll = (rows: csvItems[]) => {

        this.removeAll()

        this.Three && this.Three.scene.remove(this.GroupThree)
        this.Maptalks && this.Maptalks.threeLayer.removeMesh(this.GroupMaptalks)

        this.add(rows)
        this.Three && this.Three.scene.add(this.GroupThree)
        this.Maptalks && this.Maptalks.threeLayer.addMesh(this.GroupMaptalks)

    }

}