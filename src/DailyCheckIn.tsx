import { useEffect, useState } from 'react'
import type { Run } from './core'
import { crewOf } from './mission'
import { dailyStatus, moodRatings, needsFollowUp, type DailyCheckIn as Entry } from './wellbeing'

export default function DailyCheckIn({ run, busy, onSave, onFollowUp }: {
  run: Run; busy: boolean; onSave: (entry: Entry) => Promise<boolean>; onFollowUp: (entry: Entry) => void
}) {
  const [now, setNow] = useState(Date.now)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [discomfort, setDiscomfort] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const status = dailyStatus(run, now)
  const open = status.due || editing
  return <section className="panel daily-check-in" aria-labelledby="daily-title">
    <div className="panel-heading"><h2 id="daily-title">Daily self-check</h2><span>{status.due ? 'Check-in due' : 'Saved · Next check-in in about ' + Math.ceil(status.remainingMs / 3600000) + ' hours'}</span></div>
    {open ? <form onSubmit={async e => {
      e.preventDefault(); if (rating === null || discomfort === null || saving) return
      setSaving(true); setFailed(false)
      const entry: Entry = { id: crypto.randomUUID(), at: run.now, recordedAt: new Date().toISOString(), moodRating: rating, discomfort }
      try { if (await onSave(entry)) { setEditing(false); setNow(Date.now()); setRating(null); setDiscomfort(null)
        if (needsFollowUp(entry)) onFollowUp(entry)
      } else setFailed(true) } finally { setSaving(false) }
    }}>
      <p>{crewOf(run)}, how have you felt today?</p>
      <fieldset disabled={busy || saving}><legend>Mood today</legend><div className="daily-ratings">{moodRatings.map((label, index) =>
        <label key={label}><input type="radio" name="daily-mood" checked={rating === index + 1} onChange={() => setRating(index + 1)}/><strong>{index + 1}</strong><span>{label}</span></label>)}</div></fieldset>
      <fieldset disabled={busy || saving}><legend>Any uncomfortable feelings?</legend><div className="daily-comfort">
        <label><input type="radio" name="daily-comfort" checked={discomfort === false} onChange={() => setDiscomfort(false)}/>No uncomfortable feelings</label>
        <label><input type="radio" name="daily-comfort" checked={discomfort === true} onChange={() => setDiscomfort(true)}/>I feel uncomfortable</label>
      </div></fieldset>
      <p className="help">Low mood or discomfort opens Self-check for more detail. Saved in History on this shared tablet. Shared only if you enable wellbeing sharing before sending a report. Reminder interval: 20 hours.</p>
      {failed && <p role="alert">Your check-in wasn’t saved. Try Save daily check-in again.</p>}
      <div className="button-row"><button className="primary" disabled={rating === null || discomfort === null || busy || saving}>Save daily check-in</button>
        {!status.due && <button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel update</button>}</div>
    </form> : <><p role="status">Today’s report: {status.latest!.moodRating}/5 · {moodRatings[status.latest!.moodRating - 1]} · {status.latest!.discomfort ? 'Discomfort reported' : 'No uncomfortable feelings reported'}.</p>
      <div className="button-row"><button onClick={() => setEditing(true)}>Update daily check-in</button>
        {needsFollowUp(status.latest!) && <button onClick={() => onFollowUp(status.latest!)}>Continue self-check</button>}</div></>}
  </section>
}
