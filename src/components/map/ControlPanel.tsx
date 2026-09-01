import type { Lang, SimulationClock } from '../../types'
import { useI18n } from '../../i18n'
import { hongKongDateTimeInputToInstant, hongKongDateTimeInputValue, hongKongWallToInstant, hongKongYmd } from '../../engines/hongKongTime'

interface Props {
  clock: SimulationClock
  pitchEnabled: boolean
  onTogglePitch: () => void
  liveBusMode: boolean
  hasLiveBusData: boolean
  onToggleLiveBusMode: () => void
  followSelectedVehicle: boolean
  onToggleFollowSelectedVehicle: () => void
}

export function simulationTimeLocale(lang: Lang): string {
  return lang === 'zh' ? 'zh-HK' : lang === 'pt' ? 'pt-PT' : 'en-GB'
}

export function timelineTimeFromMinute(currentTime: Date, minute: number): Date {
  const [year, month, day] = hongKongYmd(currentTime).split('-').map(Number)
  return hongKongWallToInstant(year, month - 1, day, Math.floor(minute / 60), minute % 60)
}

export function ControlPanel({ clock, pitchEnabled, onTogglePitch, liveBusMode, hasLiveBusData, onToggleLiveBusMode, followSelectedVehicle, onToggleFollowSelectedVehicle }: Props) {
  const { lang, setLang, t } = useI18n()
  const formatted = new Intl.DateTimeFormat(simulationTimeLocale(lang), {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).format(clock.currentTime)
  return (
    <div className="control-panel">
      <div className="time-control-head">
        <div className="time-readout">{formatted}</div>
        <button type="button" onClick={clock.syncToNow}>{t.now}</button>
      </div>
      <label className="select-row time-picker-row">
        <span>{lang === 'zh' ? '\u6aa2\u8996\u6642\u9593' : lang === 'pt' ? 'Ver hora' : 'View time'}</span>
        <input
          type="datetime-local"
          aria-label={t.simulation}
          value={hongKongDateTimeInputValue(clock.currentTime)}
          onChange={event => {
            const next = hongKongDateTimeInputToInstant(event.target.value)
            if (next) clock.setTime(next)
          }}
        />
      </label>
      <div className="control-row">
        <button type="button" onClick={onTogglePitch}>{pitchEnabled ? t.mode3d : t.mode2d}</button>
      </div>
      <label className="toggle-row">
        <input type="checkbox" checked={liveBusMode} disabled={!hasLiveBusData} onChange={onToggleLiveBusMode} />
        <span>{lang === 'zh' ? '巴士即時 ETA' : lang === 'pt' ? 'ETA ao vivo dos autocarros' : 'Live bus ETA'}</span>
        <strong>{hasLiveBusData ? (liveBusMode ? t.active : t.planned) : '-'}</strong>
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={followSelectedVehicle} onChange={onToggleFollowSelectedVehicle} />
        <span>{lang === 'zh' ? '\u8ddf\u96a8\u73ed\u8eca' : lang === 'pt' ? 'Seguir veiculo' : 'Follow vehicle'}</span>
        <strong>{followSelectedVehicle ? 'ON' : 'OFF'}</strong>
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
