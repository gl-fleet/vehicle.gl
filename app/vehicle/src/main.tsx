import { React, Row, Col } from 'uweb'
import { log, Delay, Safe } from 'utils/web'
import { Point } from 'uweb/utils'

import { mapHook } from './hooks/map'
import { threeHook } from './hooks/three'
import { vehicleHook } from './hooks/vehicle'

import { DeviceListView } from './views/device'
import { MiddleInfo } from './views/raycast'

const { useEffect, useState, useRef } = React

class Triangle {

    Three
    Maptalks
    GroupThree
    GroupMaptalks
    Raycaster

    constructor({ Three, Maptalks }) {
        this.Three = Three
        this.Maptalks = Maptalks
        this.GroupThree = new THREE.Group()
        this.GroupMaptalks = new THREE.Group()
        this.Raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 100)
    }

    ray = ({ MP, center /* direction */ }, cb) => {
        try {

            /**
             * FIND DIRECTION VECTOR FROM V1 -> V2
             * const direct = new THREE.Vector3()
             * direct.subVectors( v2, v1 ).normalize()
             */
            this.Raycaster.set(new THREE.Vector3(MP.x, MP.y, MP.z), new THREE.Vector3(0, 0, -1))
            const down = this.Raycaster.intersectObject(this.GroupThree)
            if (down && down.length > 0) { cb({ ...down[0], distance: down[0].distance }) } else {
                this.Raycaster.set(new THREE.Vector3(MP.x, MP.y, MP.z), new THREE.Vector3(0, 0, 1))
                const up = this.Raycaster.intersectObject(this.GroupThree)
                if (up && up.length > 0) { cb({ ...up[0], distance: -up[0].distance }) }
            }

        } catch (err) { console.log(`While X-RAY: ${err.message}`) }
    }

    add = (group, rows) => {
        try {

            const geometry = new THREE.BufferGeometry()
            const positions = []
            const normals = []

            const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3()
            const ab = new THREE.Vector3(), bb = new THREE.Vector3(), cb = new THREE.Vector3()

            for (const n of rows) {
                if (n.coords.length === 4) {

                    // Positioning

                    const j = n.coords, m = 10
                    const ax = j[0][0], ay = j[0][1], az = j[0][2]
                    const bx = j[1][0], by = j[1][1], bz = j[1][2]
                    const cx = j[2][0], cy = j[2][1], cz = j[2][2]

                    positions.push(ax, ay, az)
                    positions.push(bx, by, bz)
                    positions.push(cx, cy, cz)

                    // Flat face normals

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
            }

            const disposeArray = () => { this.array = null }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).onUpload(disposeArray))
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3).onUpload(disposeArray))
            geometry.computeBoundingSphere()

            const material = new THREE.MeshLambertMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
                color: "grey",
                // vertexColors: true,
            })

            group.add(new THREE.Mesh(geometry, material))

        } catch (err) { console.log(err) }
    }

    removeAll = () => {
        this.GroupThree.traverse((child) => { this.GroupThree.remove(child) })
        this.GroupMaptalks.traverse((child) => { this.GroupMaptalks.remove(child) })
    }

    updateAll = (rows) => {

        this.Three.scene.remove(this.GroupThree)
        this.Maptalks.threeLayer.removeMesh(this.GroupMaptalks)
        this.removeAll()

        this.add(this.GroupThree, rows)
        this.Three.scene.add(this.GroupThree)

    }

}

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })
    const [isThreeReady, Three] = threeHook({ containerId: 'render_1', isDarkMode, conf: {} })
    const [isVehicleReady, Vehicle] = vehicleHook(isMapReady, Maptalks, isThreeReady, Three)

    useEffect(() => {

        if (!isVehicleReady) return

        const point = new Point({ Maptalks, Three })

        event.on('GPS-calc', (arg: any) => {

            const { M, A, B, C, D, TL, TM, TR, BM, MP, camera } = arg

            Maptalks.view('TOP', arg)
            Three.view('TOP', arg)
            Vehicle.update(arg)

            point.update('left', 'red', [A.x, A.y, A.z])
            point.update('right', 'blue', [B.x, B.y, B.z])
            point.update('TL', 'orange', [TL.x, TL.y, TL.z])
            point.update('MP', 'green', [MP.x, MP.y, MP.z])
            point.update('TR', 'orange', [TR.x, TR.y, TR.z])

        })

    }, [isVehicleReady])

    return <Row id="main" style={{ height: '100%' }}>
        <DeviceListView {...cfg} />
        <MiddleInfo {...cfg} />
        <Col id='render_0' span={12} style={{ height: '100%' }} />
        <Col id='render_1' span={12} style={{ height: '100%' }} />
    </Row>

}