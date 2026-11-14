import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Today from './Today'
import { simulatedPanel } from './indicators'
import type { Run } from './core'

describe('overview blood-pressure interpretation', () => {
  function overview(diastolic: number, now = '2027-07-18T14:08:00Z') {
    const run: Run = { id: 'test', scenario: 'A', now, events: [],
      observations: simulatedPanel('2027-07-18T14:08:00Z').map(reading =>
        reading.indicator === 'diastolic_bp' ? { ...reading, value: diastolic } : reading) }
    const html = renderToStaticMarkup(<Today run={run} onReport={() => {}} onHandoff={() => {}} onMeasurements={() => {}} />)
    return html.split('<span>Blood pressure</span>')[1].split('</div>')[0]
  }
  it('requests review when only diastolic pressure is outside the comparison', () => {
    const pressure = overview(90)
    expect(pressure).toContain('118/90')
    expect(pressure).toContain('Review reading')
    expect(pressure).not.toContain('Within reference')
  })
  it('does not present old paired pressures as current', () => {
    const pressure = overview(76, '2027-07-18T14:30:00Z')
    expect(pressure).toContain('Unknown')
    expect(pressure).toContain('Needs updating')
    expect(pressure).not.toContain('118/76')
  })
})
