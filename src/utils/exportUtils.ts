import { ExecutionTrace, SimulationStep } from '@/types'

const eventSteps = (steps: SimulationStep[]) => steps.filter(s => !!s.firedTransition)

export function stepsToXES(steps: SimulationStep[], caseId: string): string {
    const events = eventSteps(steps)
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<?xml version="1.0" encoding="UTF-8"?>
<log xes.version="1.0" xes.features="nested-attributes" openxes.version="1.0RC7">
  <extension name="Lifecycle" prefix="lifecycle" uri="http://www.xes-standard.org/lifecycle.xesext"/>
  <extension name="Time" prefix="time" uri="http://www.xes-standard.org/time.xesext"/>
  <trace>
    <string key="concept:name" value="${esc(caseId)}"/>
    ${events
            .map(
                (e) => `
    <event>
      <string key="concept:name" value="${esc(e.firedTransition!)}"/>
      <date key="time:timestamp" value="${esc(e.timestamp)}"/>
      <string key="lifecycle:transition" value="complete"/>
    </event>`
            )
            .join('')}
  </trace>
</log>`
}

export function traceToCSV(trace: ExecutionTrace, caseId?: string): string {
    const id = caseId || trace.id
    const rows = [
        ['case_id', 'activity', 'timestamp'],
        ...eventSteps(trace.steps).map((e) => [id, e.firedTransition!, e.timestamp]),
    ]
    return rows.map(r => r.map((f) => csvEscape(f)).join(',')).join('\n')
}

function csvEscape(field: string): string {
    const needsQuotes = /[",\n]/.test(field)
    let out = field.replace(/"/g, '""')
    return needsQuotes ? `"${out}"` : out
}
