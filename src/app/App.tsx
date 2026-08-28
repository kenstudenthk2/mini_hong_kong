import { useEffect, useMemo, useState } from 'react'
import { DirectoryMenu, type TransportTool } from '../components/menu/DirectoryMenu'
import { ControlPanel } from '../components/map/ControlPanel'
import { InfoPanel } from '../components/map/InfoPanel'
import { MapView } from '../components/map/MapView'
import { kmbReplaySchedules } from '../dataAdapters/kmb'
import { computeAirportFlightVehiclePositions } from '../dataAdapters/airportReplay'
import type { AirportGroundFeature } from '../dataAdapters/airportGround'
import { computeBusVehiclePositions, computeBusVehiclePositionsFromEta, computeFerryVehiclePositions, computeTramVehiclePositions, computeVehiclePositions } from '../engines/simulationEngine'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTransitData } from '../hooks/useTransitData'
import type { AirportFacility, Station, VehiclePosition } from '../types'
import { isSelectedVehicleCurrent } from './vehicleVisibility'
import type { SearchableRoute } from './routeSearch'

export default function App() {
  const transitData = useTransitData()
  const clock = useSimulationClock()
  const [pitchEnabled, setPitchEnabled] = useState(true)
  const [liveBusMode, setLiveBusMode] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<AirportFacility | null>(null)
  const [selectedGroundFeature, setSelectedGroundFeature] = useState<AirportGroundFeature | null>(null)
  const [routeSearchQuery, setRouteSearchQuery] = useState('')
  const [selectedRouteSearchId, setSelectedRouteSearchId] = useState<string | null>(null)
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
  const allBusOperators = useMemo(() => new Set(['KMB/LWB', 'Citybus', 'NLB', 'GMB']), [])
  const [manualBusOperators, setManualBusOperators] = useState<Set<string> | null>(null)
  const selectedBusOperators = manualBusOperators ?? allBusOperators
  const [activeTools, setActiveTools] = useState<Set<TransportTool>>(() => new Set(['rail', 'lightRail', 'buses', 'ferries', 'trams', 'flights']))

  const vehicles = useMemo(
    () => transitData.data ? [
      ...computeVehiclePositions(transitData.data, clock.currentTime),
      ...(liveBusMode && transitData.data.busArrivals?.length
        ? computeBusVehiclePositionsFromEta(transitData.data.busRoutes ?? [], transitData.data.busArrivals, clock.currentTime)
        : computeBusVehiclePositions(transitData.data.busRoutes ?? [], kmbReplaySchedules, clock.currentTime)),
      ...computeFerryVehiclePositions(transitData.data.ferryRoutes ?? [], transitData.data.ferrySchedules ?? [], clock.currentTime),
      ...computeTramVehiclePositions(transitData.data.tramRoutes ?? [], transitData.data.tramSchedules ?? [], clock.currentTime),
      ...computeAirportFlightVehiclePositions(transitData.data.flights ?? [], clock.currentTime),
    ].filter(vehicle => vehicle.type !== 'flight' || activeTools.has('flights')) : [],
    [activeTools, clock.currentTime, liveBusMode, transitData.data],
  )

  useEffect(() => {
    if (selectedVehicle && !isSelectedVehicleCurrent(selectedVehicle, vehicles, selectedLineIds, selectedRouteIds, selectedBusOperators)) {
      setSelectedVehicle(null)
    }
  }, [selectedBusOperators, selectedLineIds, selectedRouteIds, selectedVehicle, vehicles])

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
    setActiveTools(new Set(['rail', 'lightRail', 'buses', 'ferries', 'trams', 'flights']))
  }

  function toggleTool(tool: TransportTool) {
    const enabled = activeTools.has(tool)
    setActiveTools(previous => {
      const next = new Set(previous)
      if (enabled) next.delete(tool)
      else next.add(tool)
      return next
    })

    if (tool === 'rail' || tool === 'lightRail') {
      const lineMode = tool === 'rail' ? 'mtr' : 'light_rail'
      const lineIds = new Set((transitData.data?.railLines ?? []).filter(line => line.mode === lineMode).map(line => line.id))
      setManualLineIds(previous => {
        const next = new Set(previous ?? allLineIds)
        lineIds.forEach(id => enabled ? next.delete(id) : next.add(id))
        return next
      })
    }

    if (tool === 'buses') {
      setManualBusOperators(previous => {
        const next = new Set(previous ?? allBusOperators)
        for (const operator of ['KMB/LWB', 'Citybus', 'NLB', 'GMB']) {
          if (enabled) next.delete(operator)
          else next.add(operator)
        }
        return next
      })
    }

    if (tool === 'ferries' || tool === 'trams') {
      const routeIds = new Set((tool === 'ferries' ? transitData.data?.ferryRoutes : transitData.data?.tramRoutes)?.map(route => route.id) ?? [])
      setManualRouteIds(previous => {
        const next = new Set(previous ?? allRouteIds)
        routeIds.forEach(id => enabled ? next.delete(id) : next.add(id))
        return next
      })
    }
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
        activeTools={activeTools}
        onToggleTool={toggleTool}
        liveBusMode={liveBusMode}
        hasLiveBusData={Boolean(transitData.data?.busArrivals?.length)}
        feedStatus={transitData.feedStatus}
        selectedFacilityId={selectedFacility?.id ?? null}
        onSelectFacility={facility => {
          setSelectedFacility(facility)
          setSelectedGroundFeature(null)
          setSelectedStation(null)
          setSelectedVehicle(null)
        }}
        selectedGroundFeatureId={selectedGroundFeature?.id ?? null}
        onSelectGroundFeature={feature => {
          setSelectedGroundFeature(feature)
          setSelectedFacility(null)
          setSelectedStation(null)
          setSelectedVehicle(null)
        }}
        stations={transitData.data?.stations ?? []}
        selectedStationId={selectedStation?.id ?? null}
        onSelectStation={station => {
          setSelectedStation(station)
          setSelectedVehicle(null)
          setSelectedFacility(null)
          setSelectedGroundFeature(null)
        }}
        routeSearchQuery={routeSearchQuery}
        onRouteSearchQueryChange={setRouteSearchQuery}
        selectedRouteSearchId={selectedRouteSearchId}
        onSelectRouteSearch={(route: SearchableRoute | null) => setSelectedRouteSearchId(route?.id ?? null)}
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
            setSelectedFacility(null)
            setSelectedGroundFeature(null)
          }}
          onSelectFacility={facility => {
            setSelectedFacility(facility)
            setSelectedStation(null)
            setSelectedVehicle(null)
            setSelectedGroundFeature(null)
          }}
          onSelectGroundFeature={feature => {
            setSelectedGroundFeature(feature)
            setSelectedFacility(null)
            setSelectedStation(null)
            setSelectedVehicle(null)
          }}
          onClearRouteSearch={() => setSelectedRouteSearchId(null)}
          selectedVehicleId={selectedVehicle?.id ?? null}
          selectedStationId={selectedStation?.id ?? null}
          selectedFacilityId={selectedFacility?.id ?? null}
          selectedGroundFeatureId={selectedGroundFeature?.id ?? null}
          selectedRouteSearchId={selectedRouteSearchId}
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
        <InfoPanel data={transitData.data} vehicle={selectedVehicle} station={selectedStation} facility={selectedFacility} groundFeature={selectedGroundFeature} />
      </section>
    </main>
  )
}
