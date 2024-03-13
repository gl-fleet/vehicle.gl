import { Loop } from 'utils'

export type tEvent = 'pub_local' | 'pub_cloud' | 'update'

export const wr = (cb: any) => { try { return cb() } catch { return null } }

export const roughSizeOfObject = (object: any) => {

    var objectList = []
    var stack = [object]
    var bytes = 0

    while (stack.length) {

        var value = stack.pop()

        if (typeof value === 'boolean') {
            bytes += 4
        }
        else if (typeof value === 'string') {
            bytes += value.length * 2
        }
        else if (typeof value === 'number') {
            bytes += 8
        }
        else if
            (
            typeof value === 'object'
            && objectList.indexOf(value) === -1
        ) {
            objectList.push(value)

            for (var i in value) {
                stack.push(value[i])
            }
        }

    }

    return bytes

}

export const chunks = {

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

export class Responsive { /** Collect and Dispose gracefully **/
    queue: boolean[] = []
    shake = () => {
        this.queue.push(true)
        return true
    }
    call = (cb: () => {}, ms: number) => Loop(() => {
        if (this.queue.length > 0) {
            this.queue = []
            cb()
        }
    }, ms)
}