import * as fs from "fs"

const FILE = "../../env.js"

type Scalar = string | number | boolean

// Return [openIndex, closeIndex] of the object literal after `from`,
// counting braces but skipping any that live inside strings.
const matchBlock = (src: string, from: number): [number, number] => {
    const open = src.indexOf("{", from)
    let depth = 0
    let quote: string | null = null
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (quote) {
            if (c === quote && src[i - 1] !== "\\") quote = null
            continue
        }
        if (c === "'" || c === '"' || c === "`") quote = c
        else if (c === "{") depth++
        else if (c === "}" && --depth === 0) return [open, i]
    }
    throw new Error("unbalanced braces")
}

export const update = (section: string, field: string, value: Scalar): void => {
    const src = fs.readFileSync(FILE, "utf8")

    const head = src.search(new RegExp(`\\b${section}\\s*:\\s*{`))
    if (head === -1) throw new Error(`section not found: ${section}`)

    const [open, close] = matchBlock(src, head)
    const block = src.slice(open, close + 1)

    const re = new RegExp(`^(\\s*${field}\\s*:\\s*).+?(,?)\\s*$`, "m")
    if (!re.test(block)) throw new Error(`field not found: ${section}.${field}`)
    const updated = block.replace(
        re,
        (_: string, lhs: string, comma: string) => `${lhs}${JSON.stringify(value)}${comma}`,
    )

    fs.writeFileSync(FILE, src.slice(0, open) + updated + src.slice(close + 1))
}

export const get = (section: string, field: string): Scalar => {
    const src = fs.readFileSync(FILE, "utf8")

    const head = src.search(new RegExp(`\\b${section}\\s*:\\s*{`))
    if (head === -1) throw new Error(`section not found: ${section}`)

    const [open, close] = matchBlock(src, head)
    const block = src.slice(open, close + 1)

    const m = block.match(new RegExp(`^\\s*${field}\\s*:\\s*(.+?),?\\s*$`, "m"))
    if (!m) throw new Error(`field not found: ${section}.${field}`)

    const raw = m[1].trim()
    try {
        return JSON.parse(raw) as Scalar // numbers, booleans, double-quoted strings
    } catch {
        if (/^(['"`]).*\1$/.test(raw)) return raw.slice(1, -1) // single-quote / backtick
        return raw // an expression or variable reference, e.g. `ME` or `tile`
    }
}

// Raw `{ ... }` text of a section, exactly as written (braces, indentation,
// comments and `ME`-style references preserved).
export const get_block = (section: string): string => {
    const src = fs.readFileSync(FILE, "utf8")

    const head = src.search(new RegExp(`\\b${section}\\s*:\\s*{`))
    if (head === -1) throw new Error(`section not found: ${section}`)

    const [open, close] = matchBlock(src, head)
    return src.slice(open, close + 1)
}