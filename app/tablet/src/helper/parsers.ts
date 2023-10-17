
export const GeojsonParser = (data: { features: any[] }) => {

    const { features } = data

    const points: tItem[] = []
    const polygons: tItem[] = []
    const linestrings: tItem[] = []

    for (const x of features) {

        const { geometry, properties } = x
        const { type, coordinates } = geometry
        /* const { Layer, SubClasses, EntityHandle } = properties */

        type === 'LineString' && linestrings.push({ ...properties, Coords: coordinates })
        type === 'Polygon' && polygons.push({ ...properties, Coords: coordinates })
        type === 'Point' && points.push({ ...properties, Coords: coordinates })

    }

    return {
        points,
        polygons,
        linestrings,
    }

}