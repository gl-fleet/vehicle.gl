
export const DXF_GeoJson_Parser = (data: { features: any[] }) => {

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

export const CSV_GeoJson_Parser = (data: { features: any[] }): csvItems[] => {

    try {

        const { features } = data

        return features.map((e: any) => {
            const { field_1, field_2, field_3, field_4, field_5 } = e.properties
            return [field_1, Number(field_3), Number(field_2), Number(field_4), Number(field_5)]
        })

    } catch (err) {
        return []
    }


}