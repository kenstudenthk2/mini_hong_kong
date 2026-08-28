import { useMemo, useState } from 'react'
import { DirectoryMenu } from '../components/menu/DirectoryMenu'
import { ControlPanel } from '../components/map/ControlPanel'
import { InfoPanel } from '../components/map/InfoPanel'
import { MapView } from '../components/map/MapView'
import { kmbReplaySchedules } from '../dataAdapters/kmb'
import { computeBusVehiclePositions, computeBusVehiclePositionsFromEta, computeFerryVehiclePositions, computeVehiclePositions } from '../engines/simulationEngine'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTransitData } from '../hooks/useTransitData'
import type { VehiclePosition } from '../types'

export default function App() {
  const transitData = useTransitData()
  const clock = useSimulationClock()
  const [pitchEnabled, setPitchEnabled] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null)
  const allLineIds = useMemo(
    () => new Set(transitData.data?.railLines.map(line => line.id) ?? []),
    [transitData.data],
  )
  const [manualLineIds, setManualLineIds] = useState<Set<string> | null>(null)
  const selectedLineIds = manualLineIds ?? allLineIds

  const vehicles = useMemo(
    () => transitData.data ? [
      ...computeVehiclePositions(transitData.data, clock.currentTime),
      ...(transitData.data.busArrivals?.length
        ? computeBusVehiclePositionsFromEta(transitData.data.busRoutes ?? [], transitData.data.busArrivals, clock.currentTime)
        : computeBusVehiclePositions(transitData.data.busRoutes ?? [], kmbReplaySchedules, clock.currentTime)),
      ...computeFerryVehiclePositions(transitData.data.ferryRoutes ?? [], transitData.data.ferrySchedules ?? [], clock.currentTime),
    ] : [],
    [clock.currentTime, transitData.data],
  )

  function toggleLine(lineId: string) {
    const next = new Set(selectedLineIds)
    if (next.has(lineId)) next.delete(lineId)
    else next.add(lineId)
    setManualLineIds(next)
  }

  return (
    <main className="app-shell">
      <DirectoryMenu
        data={transitData.data}
        vehicles={vehicles}
        selectedLineIds={selectedLineIds}
        onToggleLine={toggleLine}
      />
      <section className="map-shell">
        {transitData.error && <div className="load-error">{transitData.error}</div>}
        {transitData.loading && <div className="load-error">Loading Hong Kong transit data...</div>}
        <MapView
          lines={transitData.data?.railLines ?? []}
          busRoutes={transitData.data?.busRoutes ?? []}
          ferryRoutes={transitData.data?.ferryRoutes ?? []}
          stations={transitData.data?.stations ?? []}
          vehicles={vehicles}
          selectedLineIds={selectedLineIds}
          pitchEnabled={pitchEnabled}
          onSelectVehicle={setSelectedVehicle}
        />
        <ControlPanel
          clock={clock}
          pitchEnabled={pitchEnabled}
          onTogglePitch={() => setPitchEnabled(value => !value)}
        />
        <InfoPanel data={transitData.data} vehicle={selectedVehicle} />
      </section>
    </main>
  )
}
