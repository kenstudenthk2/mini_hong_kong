import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimulationClock } from '../types'

export function isPlaybackShortcut(event: Pick<KeyboardEvent, 'code' | 'repeat' | 'target'>): boolean {
  if (event.code !== 'Space' || event.repeat) return false
  const target = event.target instanceof HTMLElement ? event.target.tagName : ''
  return !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target)
}

export function useSimulationClock(): SimulationClock {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [speed, setSpeedState] = useState(10)
  const [paused, setPausedState] = useState(false)
  const baseWall = useRef(Date.now())
  const baseSim = useRef(currentTime.getTime())
  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)

  const rebase = useCallback((nextSpeed = speedRef.current, nextPaused = pausedRef.current, nextTime?: Date) => {
    const wallNow = Date.now()
    const simNow = nextTime?.getTime() ?? (pausedRef.current
      ? baseSim.current
      : baseSim.current + (wallNow - baseWall.current) * speedRef.current)
    baseWall.current = wallNow
    baseSim.current = simNow
    speedRef.current = nextSpeed
    pausedRef.current = nextPaused
    setCurrentTime(new Date(simNow))
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const wallNow = Date.now()
      const simNow = pausedRef.current
        ? baseSim.current
        : baseSim.current + (wallNow - baseWall.current) * speedRef.current
      if (!pausedRef.current) setCurrentTime(new Date(simNow))
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [])

  const setSpeed = useCallback((nextSpeed: number) => {
    const bounded = Math.min(60, Math.max(1, nextSpeed))
    rebase(bounded, pausedRef.current)
    setSpeedState(bounded)
  }, [rebase])

  const setPaused = useCallback((nextPaused: boolean) => {
    rebase(speedRef.current, nextPaused)
    setPausedState(nextPaused)
  }, [rebase])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlaybackShortcut(event)) return
      event.preventDefault()
      setPaused(!pausedRef.current)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setPaused])

  const syncToNow = useCallback(() => {
    const now = new Date()
    rebase(1, false, now)
    setSpeedState(1)
    setPausedState(false)
  }, [rebase])

  const setTime = useCallback((time: Date) => {
    rebase(speedRef.current, true, time)
    setPausedState(true)
  }, [rebase])

  return { currentTime, speed, paused, setSpeed, setPaused, syncToNow, setTime }
}
