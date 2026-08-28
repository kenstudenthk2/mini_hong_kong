import { localName, useI18n } from '../../i18n'
import { classifyFreshness } from '../../dataAdapters/freshness'
import type { RailLine, TransitData, VehiclePosition } from '../../types'

interface Props {
  data: TransitData | null
  vehicles: VehiclePosition[]
  selectedLineIds: Set<string>
  onToggleLine: (lineId: string) => void
}

function LineRow({ line, enabled, onToggle }: { line: RailLine; enabled: boolean; onToggle: () => void }) {
  const { lang } = useI18n()
  return (
    <button className="line-row" type="button" onClick={onToggle} aria-pressed={enabled}>
      <span className="line-dot" style={{ background: line.color }} />
      <span>{localName(line, lang)}</span>
      <span className="line-state">{enabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}

export function DirectoryMenu({ data, vehicles, selectedLineIds, onToggleLine }: Props) {
  const { t } = useI18n()
  const mtrLines = data?.railLines.filter(line => line.mode === 'mtr') ?? []
  const lightRailLines = data?.railLines.filter(line => line.mode === 'light_rail') ?? []
  const kmbFreshness = data?.busDataTimestamp
    ? classifyFreshness(data.busDataTimestamp, new Date(), 1)
    : 'invalid'

  return (
    <aside className="directory-menu" aria-label="Transit directory">
      <header className="brand-block">
        <div className="brand-title">{t.appName}</div>
        <div className="brand-subtitle">{t.subtitle}</div>
      </header>

      <details open className="menu-section">
        <summary>{t.rail}<span>{vehicles.filter(v => v.type === 'mtr').length}</span></summary>
        <div className="section-body">
          {mtrLines.map(line => (
            <LineRow
              key={line.id}
              line={line}
              enabled={selectedLineIds.has(line.id)}
              onToggle={() => onToggleLine(line.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.lightRail}<span>{vehicles.filter(v => v.type === 'light_rail').length}</span></summary>
        <div className="section-body">
          {lightRailLines.map(line => (
            <LineRow
              key={line.id}
              line={line}
              enabled={selectedLineIds.has(line.id)}
              onToggle={() => onToggleLine(line.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.buses}<span>{data?.busRoutes?.length ?? 0}</span></summary>
        <div className="section-body muted-body">KMB/LWB normalized routes</div>
      </details>

      {[t.ferries, t.trams, t.flights].map(label => (
        <details key={label} className="menu-section planned-section">
          <summary>{label}<span>{t.planned}</span></summary>
          <div className="section-body muted-body">{t.source}: {t.dataGov}</div>
        </details>
      ))}

      <details open className="menu-section">
        <summary>{t.dataStatus}<span>{t.active}</span></summary>
        <div className="section-body status-list">
          <p>{t.simulation}: MTR + Light Rail</p>
          <p>KMB ETA: {kmbFreshness}</p>
          <p>{t.source}: {t.dataGov} seed-ready contracts</p>
        </div>
      </details>
    </aside>
  )
}
