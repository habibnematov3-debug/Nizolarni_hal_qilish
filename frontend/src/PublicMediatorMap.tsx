import { useEffect, useRef } from 'react'
import L, { type Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type PublicMapPoint = {
  id: string
  fullName: string
  type: string
  region: string
  phone?: string | null
  address?: string | null
  specialization: string[]
  latitude: number
  longitude: number
}

const uzbekistanCenter: L.LatLngExpression = [41.3, 64.6]

export function PublicMediatorMap({
  points,
  selectedId,
  onSelect,
  label,
}: {
  points: PublicMapPoint[]
  selectedId?: string
  onSelect: (point: PublicMapPoint) => void
  label: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const fittedPointsRef = useRef(false)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      center: uzbekistanCenter,
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      scrollWheelZoom: false,
      zoomControl: true,
      preferCanvas: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapRef.current = map
    const frame = window.requestAnimationFrame(() => map.invalidateSize())

    return () => {
      window.cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      fittedPointsRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const locatedPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    const markers = L.featureGroup()

    locatedPoints.forEach((point) => {
      const selected = point.id === selectedId
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: selected ? 10 : 7,
        color: '#ffffff',
        weight: 2,
        fillColor: selected ? '#f59e0b' : '#0875cf',
        fillOpacity: 1,
      })

      const tooltip = document.createElement('span')
      tooltip.textContent = `${point.fullName} · ${point.region}`
      marker.bindTooltip(tooltip, { direction: 'top', sticky: true, opacity: 0.98 })
      marker.on('click', () => onSelectRef.current(point))
      markers.addLayer(marker)
    })

    markers.addTo(map)
    if (locatedPoints.length && !fittedPointsRef.current) {
      map.fitBounds(markers.getBounds().pad(0.2), { maxZoom: 8, animate: false })
      fittedPointsRef.current = true
    }

    return () => {
      markers.remove()
    }
  }, [points, selectedId])

  return <div role="region" aria-label={label} className="relative z-0 h-[300px] w-full sm:h-[420px]">
    <div ref={containerRef} className="h-full w-full" />
  </div>
}
