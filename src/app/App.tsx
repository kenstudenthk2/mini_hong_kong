import { useEffect, useMemo, useState } from 'react'
import { DirectoryMenu } from '../components/menu/DirectoryMenu'
import { ControlPanel } from '../components/map/ControlPanel'
import { InfoPanel } from '../components/map/InfoPanel'
import { MapView } from '../components/map/MapView'
import { kmbReplaySchedules } from '../dataAdapters/kmb'
import { computeAirportFlightVehiclePositions } from '../dataAdapters/airportReplay'
import { computeBusVehiclePositions, computeBusVehiclePositionsFromEta, computeFerryVehiclePositions, computeTramVehiclePositions, computeVehiclePositions } from '../engines/simulationEngine'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTransitData } from '../hooks/useTransitData'
import type { Station, VehiclePosition } from '../types'
import { isVehicleVisible } from './vehicleVisibility'

export default function App() {
  const transitData = useTransitData()
  const clock = useSimulationClock()
  const [pitchEnabled, setPitchEnabled] = useState(true)
  const [liveBusMode, setLiveBusMode] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const allLineIds = useMemo(
    () => new Set(transitData.data?.railLines.map(line => line.id) ?? []),
    [transitData.data],
  )
  const [manualLineIds, setManualLineIds] = useState<Set<string> | null>(null)
  const selectedLineIds = manualLineIds ?? allLineIds
  const allRouteIds = useMemo(
    () => new Set([
      ...(transitData.data?.ferryRoutes?.map(route => route.id) ?? []),
      ...(transitData.data?.tramRoutes?.map(route => route.id) ?? []),
    ]),
    [transitData.data],
  )
  const [manualRouteIds, setManualRouteIds] = useState<Set<string> | null>(null)
  const selectedRouteIds = manualRouteIds ?? allRouteIds
  const allBusOperators = useMemo(() => new Set(['KMB/LWB', 'Citybus']), [])
  const [manualBusOperators, setManualBusOperators] = useState<Set<string> | null>(null)
  const selectedBusOperators = manualBusOperators ?? allBusOperators

  const vehicles = useMemo(
    () => transitData.data ? [
      ...computeVehiclePositions(transitData.data, clock.currentTime),
      ...(liveBusMode && transitData.data.busArrivals?.length
        ? computeBusVehiclePositionsFromEta(transitData.data.busRoutes ?? [], transitData.data.busArrivals, clock.currentTime)
        : computeBusVehiclePositions(transitData.data.busRoutes ?? [], kmbReplaySchedules, clock.currentTime)),
      ...computeFerryVehiclePositions(transitData.data.ferryRoutes ?? [], transitData.data.ferrySchedules ?? [], clock.currentTime),
      ...computeTramVehiclePositions(transitData.data.tramRoutes ?? [], transitData.data.tramSchedules ?? [], clock.currentTime),
      ...computeAirportFlightVehiclePositions(transitData.data.flights ?? [], clock.currentTime),
    ] : [],
    [clock.currentTime, liveBusMode, transitData.data],
  )

  useEffect(() => {
    if (selectedVehicle && !isVehicleVisible(selectedVehicle, selectedLineIds, selectedRouteIds, selectedBusOperators)) {
      setSelectedVehicle(null)
    }
  }, [selectedBusOperators, selectedLineIds, selectedRouteIds, selectedVehicle])

  function toggleLine(lineId: string) {
    const next = new Set(selectedLineIds)
    if (next.has(lineId)) next.delete(lineId)
    else next.add(lineId)
    setManualLineIds(next)
  }

  function toggleRoute(routeId: string) {
    const next = new Set(selectedRouteIds)
    if (next.has(routeId)) next.delete(routeId)
    else next.add(routeId)
    setManualRouteIds(next)
  }

  function toggleBusOperator(operator: string) {
    const next = new Set(selectedBusOperators)
    if (next.has(operator)) next.delete(operator)
    else next.add(operator)
    setManualBusOperators(next)
  }

  function resetFilters() {
    setManualLineIds(null)
    setManualRouteIds(null)
    setManualBusOperators(null)
  }

  return (
    <main className="app-shell">
      <DirectoryMenu
        data={transitData.data}
        vehicles={vehicles}
        selectedLineIds={selectedLineIds}
        onToggleLine={toggleLine}
        selectedRouteIds={selectedRouteIds}
        onToggleRoute={toggleRoute}
        selectedBusOperators={selectedBusOperators}
        onToggleBusOperator={toggleBusOperator}
        onResetFilters={resetFilters}
      />
      <section className="map-shell">
        {transitData.error && <div className="load-error">{transitData.error}</div>}
        {transitData.loading && <div className="load-error">Loading Hong Kong transit data...</div>}
        <MapView
          lines={transitData.data?.railLines ?? []}
          busRoutes={transitData.data?.busRoutes ?? []}
          ferryRoutes={transitData.data?.ferryRoutes ?? []}
          tramRoutes={transitData.data?.tramRoutes ?? []}
          stations={transitData.data?.stations ?? []}
          vehicles={vehicles}
          selectedLineIds={selectedLineIds}
          pitchEnabled={pitchEnabled}
          onSelectVehicle={setSelectedVehicle}
          onSelectStation={station => {
            setSelectedStation(station)
            setSelectedVehicle(null)
          }}
          selectedVehicleId={selectedVehicle?.id ?? null}
          selectedRouteIds={selectedRouteIds}
          selectedBusOperators={selectedBusOperators}
        />
        <ControlPanel
          clock={clock}
          pitchEnabled={pitchEnabled}
          onTogglePitch={() => setPitchEnabled(value => !value)}
          liveBusMode={liveBusMode}
          hasLiveBusData={Boolean(transitData.data?.busArrivals?.length)}
          onToggleLiveBusMode={() => setLiveBusMode(value => !value)}
        />
        <InfoPanel data={transitData.data} vehicle={selectedVehicle} station={selectedStation} />
      </section>
    </main>
  )
}
