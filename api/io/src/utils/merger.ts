export const Chunk = {

    Split: (body: any, size = 1024 * 10) => { /** Splits the Large string into chunks at given size **/

        const str: string | any = typeof body === 'string' ? body : JSON.stringify(body)
        const numChunks = Math.ceil(str.length / size)
        const chunks = new Array(numChunks)
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) { chunks[i] = str.substr(o, size) }
        return chunks

    },

    Merge: (chunks: any) => { /** Merge and Parse array of chunks **/

        if (chunks && chunks.length > 0) {
            let strfy = ''
            for (const x of chunks) { strfy += x.data }
            return JSON.parse(strfy)
        }
        return null

    }

}