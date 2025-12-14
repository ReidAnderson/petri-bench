import jsonata from 'jsonata';

/** Safely evaluate a JSONata expression against an input object. */
export function applyJSONata(input: unknown, exprText: string): unknown {
    const trimmed = (exprText ?? '').trim();
    if (!trimmed) return input;
    try {
        const expr = jsonata(trimmed);
        return expr.evaluate(input);
    } catch (e: any) {
        throw new Error(`JSONata error: ${e?.message ?? String(e)}`);
    }
}

/** Try parsing JSON text; returns object or throws. */
export function parseJSON(text: string): unknown {
    return JSON.parse(text);
}
