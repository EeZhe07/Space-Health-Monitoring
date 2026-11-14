import { useRef, useState } from 'react'
import { time, type Run } from './core'
import { moods, visibleMoods, type Mood } from './breakRound'
import type { AttentionSession } from './wellbeing'
import SignalWatch from './SignalWatch'

export default function CrewWellbeing({ run, busy, saveMood, saveAttention, goBack, onSelfCheck }: {
  run: Run; busy: boolean; saveMood: (mood: Mood) => Promise<boolean>
  saveAttention: (entry: AttentionSession) => Promise<boolean>; goBack: () => void; onSelfCheck: () => void
}) {
  const [choice, setChoice] = useState<Mood | null>(null)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const latest = visibleMoods(run)[0]
  return <><div className="break-workspace">
    <SignalWatch run={run} onSave={saveAttention} onSelfCheck={onSelfCheck}/>
    <section className="panel break-mood"><h2>Mood check-in</h2>
      <p>CM-2, how do you feel right now? Choose your own answer, with or without playing.</p>
      <form onSubmit={async e => {
        e.preventDefault(); if (!choice || pending.current) return
        pending.current = true; setFailed(false)
        try { if (await saveMood(choice)) setChoice(null); else setFailed(true) } finally { pending.current = false }
      }}>
        <fieldset disabled={busy}><legend className="visually-hidden">Choose your mood</legend><div className="mood-choices">
          {moods.map(mood => <label key={mood}><input type="radio" name="crew-mood" checked={choice === mood} onChange={() => setChoice(mood)}/>{mood}</label>)}
        </div></fieldset>
        <p className="help">Your choice is visible in History on this shared tablet. Ground reports exclude it.</p>
        {failed && <p role="alert">Your mood wasn’t saved. Choose Save my mood to try again.</p>}
        <button disabled={!choice || busy}>Save my mood</button>
      </form>
      <p role="status" className="break-receipt">{latest ? 'Last saved for CM-2: ' + latest.mood + ' · ' + time(latest.at) + ' UTC' : 'No mood saved for this replay.'}</p>
    </section></div><button onClick={goBack}>Back to crew status</button></>
}
