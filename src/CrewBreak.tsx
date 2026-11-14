import { useRef, useState } from 'react'
import { time, type Run } from './core'
import { moods, startRound, turnCard, visibleMoods, type Mood, type SymbolName } from './breakRound'

function SkySymbol({ name }: { name: SymbolName }) {
  return <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name === 'Moon' ? <path d="M29 29A14 14 0 0 1 15 6a14 14 0 1 0 14 23Z"/> :
      name === 'Star' ? <path d="m20 4 4.7 10.6 11.5 1.3-8.5 7.7 2.3 11.5-10-5.9-10 5.9 2.3-11.5-8.5-7.7 11.5-1.3Z"/> :
      name === 'Sun' ? <><circle cx="20" cy="20" r="8"/><path d="M20 3v5m0 24v5M3 20h5m24 0h5M8 8l4 4m16 16 4 4M8 32l4-4m16-16 4-4"/></> :
      name === 'Comet' ? <><circle cx="13" cy="27" r="7"/><path d="m12 20 15-15m-7 19 14-14m-9 19 9-9"/></> :
      <><circle cx="20" cy="20" r="10"/><ellipse cx="20" cy="20" rx="18" ry="5" transform="rotate(-30 20 20)"/></>}
  </svg>
}

export default function CrewBreak({ run, busy, saveMood, goBack }: {
  run: Run; busy: boolean; saveMood: (mood: Mood) => Promise<boolean>; goBack: () => void
}) {
  const [round, setRound] = useState<ReturnType<typeof startRound> | null>(null)
  const [choice, setChoice] = useState<Mood | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const pendingSave = useRef(false)
  const firstTile = useRef<HTMLButtonElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const latest = visibleMoods(run)[0]
  const complete = round?.matched.length === 6
  const begin = () => { setRound(startRound()); requestAnimationFrame(() => firstTile.current?.focus()) }
  const end = () => { setRound(null); requestAnimationFrame(() => startButton.current?.focus()) }
  const progress = !round ? '' : complete ? 'All three pairs matched. Round complete.' :
    round.open.length === 2 ? round.open.map(i => round.deck[i]).join(' and ') + ' are different. Choose a tile to start your next pair.' :
    round.open.length === 1 ? round.deck[round.open[0]] + '. Choose a second tile.' :
    round.matched.length ? 'Pair found. Choose another tile.' : 'Choose your first tile.'
  return <><div className="break-workspace">
    <section className="panel break-game"><div className="panel-heading"><h2>Orbit pairs</h2><span>Untimed game</span></div>
      <p>Turn over two tiles at a time. Find the three matching pairs.</p>
      {!round ? <><div className="break-preview" aria-hidden="true">{(['Moon','Star','Sun'] as const).map(name =>
        <span key={name}><SkySymbol name={name}/></span>)}</div>
        <button ref={startButton} className="primary" onClick={begin}>Start round</button></> :
        <><div className="break-board" role="group" aria-label="Matching tiles">{round.deck.map((name, index) => {
          const matched = round.matched.includes(index)
          const open = matched || round.open.includes(index)
          return <button key={index} type="button" ref={index === 0 ? firstTile : undefined}
            aria-label={'Tile ' + (index + 1) + ': ' + (open ? name : 'face down') + (matched ? ', matched' : '')}
            aria-disabled={matched} data-face={matched ? 'matched' : open ? 'open' : 'down'}
            onClick={() => setRound(current => current && turnCard(current, index))}>
            {open ? <><SkySymbol name={name}/><span>{name}</span>{matched && <small>Matched</small>}</> :
              <><small>Tile</small><strong>{index + 1}</strong></>}
          </button>
        })}</div>
        <div className="break-progress" role="status"><strong>{round.matched.length / 2} of 3 pairs</strong><span>{progress}</span></div>
        {complete ? <button ref={startButton} onClick={begin}>Play again</button> : <button onClick={end}>End round</button>}</>}
    </section>
    <section className="panel break-mood"><h2>Mood check-in</h2>
      <p>CM-2, how do you feel right now? Choose your own answer, with or without playing.</p>
      <form onSubmit={async e => { e.preventDefault(); if (!choice || pendingSave.current) return
        pendingSave.current = true
        setSaveFailed(false)
        try { if (await saveMood(choice)) setChoice(null); else setSaveFailed(true) } finally { pendingSave.current = false }
      }}>
        <fieldset disabled={busy}><legend className="visually-hidden">Choose your mood</legend><div className="mood-choices">
          {moods.map(mood => <label key={mood}><input type="radio" name="crew-mood" checked={choice === mood} onChange={() => setChoice(mood)}/>{mood}</label>)}
        </div></fieldset>
        <p className="help">Your choice is visible in History on this shared tablet. Ground reports exclude it.</p>
        {saveFailed && <p role="alert">Your mood wasn’t saved. Choose Save my mood to try again.</p>}
        <button disabled={!choice || busy}>Save my mood</button>
      </form>
      <p role="status" className="break-receipt">{latest ? 'Last saved for CM-2: ' + latest.mood + ' · ' + time(latest.at) + ' UTC' : 'No mood saved for this replay.'}</p>
    </section></div><button onClick={goBack}>Back to crew status</button></>
}
