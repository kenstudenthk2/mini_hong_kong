import type { Lang, SimulationClock } from '../../types'
import { useI18n } from '../../i18n'
import { hongKongDateTimeInputToInstant, hongKongDateTimeInputValue } from '../../engines/hongKongTime'

interface Props {
  clock: SimulationClock
  pitchEnabled: boolean
  onTogglePitch: () => void
}

export function ControlPanel({ clock, pitchEnabled, onTogglePitch }: Props) {
  const { lang, setLang, t } = useI18n()
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).format(clock.currentTime)

  return (
    <div className="control-panel">
      <div className="time-readout">{formatted}</div>
      <label className="select-row">
        <span>{t.simulation}</span>
        <input
          type="datetime-local"
          value={hongKongDateTimeInputValue(clock.currentTime)}
          onChange={event => {
            const next = hongKongDateTimeInputToInstant(event.target.value)
            if (next) clock.setTime(next)
          }}
        />
      </label>
      <div className="control-row">
        <button type="button" onClick={() => clock.setPaused(!clock.paused)}>
          {clock.paused ? t.play : t.pause}
        </button>
        <button type="button" onClick={clock.syncToNow}>{t.now}</button>
        <button type="button" onClick={onTogglePitch}>{pitchEnabled ? t.mode3d : t.mode2d}</button>
      </div>
      <label className="slider-row">
        <span>{t.speed}</span>
        <input
          type="range"
          min="1"
          max="60"
          value={clock.speed}
          onChange={event => clock.setSpeed(Number(event.target.value))}
        />
        <strong>{clock.speed}x</strong>
      </label>
      <label className="select-row">
        <span>{t.language}</span>
        <select value={lang} onChange={event => setLang(event.target.value as Lang)}>
          <option value="en">English</option>
          <option value="zh">繁體中文</option>
          <option value="pt">Português</option>
        </select>
      </label>
    </div>
  )
}
