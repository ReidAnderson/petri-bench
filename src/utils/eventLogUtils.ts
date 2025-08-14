import { EventLog, LogEvent, Trace } from '@/types'

/**
 * Parse a CSV string into an EventLog structure.
 * Expected headers: case_id, activity, timestamp. Optional: lifecycle, resource, others are carried as attributes.
 */
export function parseCsvEventLog(csvText: string): { success: boolean; eventLog?: EventLog; error?: string } {
    const rows = parseCsv(csvText)
        // filter out completely empty rows
        .filter(r => r.some(cell => cell.trim().length > 0))

    if (rows.length === 0) {
        return { success: false, error: 'CSV file is empty' }
    }

    const header = rows[0].map(h => h.trim())
    const headerIndex = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())

    const idxCase = headerIndex('case_id')
    const idxActivity = headerIndex('activity')
    const idxTimestamp = headerIndex('timestamp')
    const idxLifecycle = headerIndex('lifecycle')
    const idxResource = headerIndex('resource')

    if (idxCase === -1 || idxActivity === -1 || idxTimestamp === -1) {
        return { success: false, error: 'CSV must include headers: case_id, activity, timestamp' }
    }

    const tracesMap = new Map<string, LogEvent[]>()
    let totalEvents = 0

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        // Skip rows shorter than required columns
        if (row.length <= Math.max(idxCase, idxActivity, idxTimestamp)) continue

        const caseId = (row[idxCase] ?? '').trim()
        const activity = (row[idxActivity] ?? '').trim()
        const timestampRaw = (row[idxTimestamp] ?? '').trim()
        if (!caseId || !activity || !timestampRaw) {
            continue
        }

        const normalizedTs = normalizeTimestamp(timestampRaw)
        if (!normalizedTs) {
            // skip invalid timestamps
            continue
        }

        const event: LogEvent = {
            activity,
            timestamp: normalizedTs,
        }
        if (idxLifecycle !== -1 && row[idxLifecycle]) event.lifecycle = row[idxLifecycle].trim()
        if (idxResource !== -1 && row[idxResource]) event.resource = row[idxResource].trim()

        // Attach extra attributes
        header.forEach((key, colIdx) => {
            if (colIdx === idxCase || colIdx === idxActivity || colIdx === idxTimestamp || colIdx === idxLifecycle || colIdx === idxResource) return
            const val = row[colIdx]
            if (key && typeof val !== 'undefined' && val !== '') {
                // avoid overwriting existing keys
                if (!(key in event)) {
                    event[key] = val
                } else {
                    event[`attr:${key}`] = val
                }
            }
        })

        if (!tracesMap.has(caseId)) tracesMap.set(caseId, [])
        tracesMap.get(caseId)!.push(event)
        totalEvents++
    }

    const traces: Trace[] = Array.from(tracesMap.entries()).map(([id, events]) => ({
        id,
        events: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }))

    // Sort traces by id for consistency
    traces.sort((a, b) => a.id.localeCompare(b.id))

    return { success: true, eventLog: { traces, totalEvents } }
}

/**
 * Parse a simplified XES XML string into an EventLog structure.
 * Recognized attributes:
 *  - trace: string key="concept:name" => trace id
 *  - event: string key="concept:name" => activity
 *  - event: date key="time:timestamp" => timestamp
 *  - event: string key="lifecycle:transition" => lifecycle (optional)
 *  - event: string key="org:resource" or "resource" => resource (optional)
 * Unrecognized attributes are copied as string values.
 */
export function parseXesEventLog(xesXml: string): { success: boolean; eventLog?: EventLog; error?: string } {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(xesXml, 'application/xml')
        if (doc.getElementsByTagName('parsererror').length) {
            return { success: false, error: 'Invalid XES XML' }
        }

        const logEl = doc.querySelector('log') || doc.documentElement
        const traceEls = Array.from(logEl.querySelectorAll(':scope > trace'))
        let totalEvents = 0
        const traces: Trace[] = []

        const getAttrVal = (parent: Element, tag: string, key: string) => {
            const el = parent.querySelector(`:scope > ${tag}[key="${key}"]`) as Element | null
            return el ? el.getAttribute('value') || '' : ''
        }

        const parseEvent = (evEl: Element): LogEvent | null => {
            const activity = getAttrVal(evEl, 'string', 'concept:name')
            const tsRaw = getAttrVal(evEl, 'date', 'time:timestamp') || getAttrVal(evEl, 'string', 'time:timestamp')
            if (!activity || !tsRaw) return null
            const normalized = normalizeTimestamp(tsRaw)
            if (!normalized) return null

            const e: LogEvent = {
                activity,
                timestamp: normalized,
            }
            const lifecycle = getAttrVal(evEl, 'string', 'lifecycle:transition')
            if (lifecycle) e.lifecycle = lifecycle
            const resource = getAttrVal(evEl, 'string', 'org:resource') || getAttrVal(evEl, 'string', 'resource')
            if (resource) e.resource = resource

            // copy other attributes as string values
            Array.from(evEl.children).forEach(child => {
                const key = child.getAttribute('key') || ''
                const val = child.getAttribute('value') || ''
                if (!key || !val) return
                if (key === 'concept:name' || key === 'time:timestamp' || key === 'lifecycle:transition' || key === 'org:resource' || key === 'resource') return
                if (!(key in e)) {
                    e[key] = val
                } else {
                    e[`attr:${key}`] = val
                }
            })

            return e
        }

        const buildTrace = (trEl: Element, idx: number): Trace | null => {
            const id = getAttrVal(trEl, 'string', 'concept:name') || `trace_${idx + 1}`
            const evs = Array.from(trEl.querySelectorAll(':scope > event'))
                .map(parseEvent)
                .filter(Boolean) as LogEvent[]
            if (evs.length === 0) return null
            evs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            totalEvents += evs.length
            return { id, events: evs }
        }

        if (traceEls.length > 0) {
            traceEls.forEach((tr, i) => {
                const t = buildTrace(tr, i)
                if (t) traces.push(t)
            })
        } else {
            // Fallback: treat events under log as a single trace
            const evs = Array.from(logEl.querySelectorAll(':scope > event'))
                .map(parseEvent)
                .filter(Boolean) as LogEvent[]
            if (evs.length > 0) {
                evs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                totalEvents = evs.length
                traces.push({ id: 'trace_1', events: evs })
            }
        }

        if (traces.length === 0) {
            return { success: false, error: 'No valid traces/events found in XES' }
        }

        // Sort traces for determinism
        traces.sort((a, b) => a.id.localeCompare(b.id))
        return { success: true, eventLog: { traces, totalEvents } }
    } catch (e) {
        return { success: false, error: 'Failed to parse XES' }
    }
}

// Reuse helpers
function normalizeTimestamp(ts: string): string | null {
    // Accept ISO 8601 or common variants. If it lacks a timezone, assume Z.
    let t = ts.trim()
    // Replace space between date and time with 'T' if present
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) {
        t = t.replace(' ', 'T')
    }
    // If no timezone info, append 'Z'
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(t)) {
        t = t + 'Z'
    }
    const d = new Date(t)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
}

function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let i = 0
    let inQuotes = false

    const pushField = () => { row.push(field); field = '' }
    const pushRow = () => {
        // Avoid pushing trailing completely empty row at EOF
        if (row.length > 0) { rows.push(row) }
        row = []
    }

    while (i < text.length) {
        const ch = text[i]

        if (inQuotes) {
            if (ch === '"') {
                // Escaped quote
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"'
                    i += 2
                    continue
                }
                inQuotes = false
                i++
                continue
            } else {
                field += ch
                i++
                continue
            }
        }

        // Not in quotes
        if (ch === '"') {
            inQuotes = true
            i++
            continue
        }
        if (ch === ',') {
            pushField()
            i++
            continue
        }
        if (ch === '\r') {
            // ignore, handle on \n
            i++
            continue
        }
        if (ch === '\n') {
            pushField()
            pushRow()
            i++
            continue
        }
        field += ch
        i++
    }

    // Push last field/row
    pushField()
    // Only push row if not an extra empty row
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row)
    }

    return rows
}
