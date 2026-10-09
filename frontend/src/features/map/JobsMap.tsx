import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect, useMemo, useState } from 'react';
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { JobResult, PlaceResult } from '../../api/schemas';
import { RiskBadge } from '../../components/ui/RiskBadge';
import { buildPins, type MapPin } from './pins';

export interface CityCenter {
  lat: number;
  lng: number;
}

export interface JobsMapProps {
  jobs: JobResult[];
  places: PlaceResult[];
  cityCenter?: CityCenter | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const INDIA_CENTER: [number, number] = [20.59, 78.96];
const CLUSTER_THRESHOLD = 15;

const RISK_PIN_CLASS = { Low: 'map-pin-low', Medium: 'map-pin-medium', High: 'map-pin-high' } as const;
const RISK_LETTER = { Low: 'L', Medium: 'M', High: 'H' } as const;

function pinIcon(pin: MapPin, selected: boolean): L.DivIcon {
  const shape = pin.kind === 'place' ? 'map-pin-place' : RISK_PIN_CLASS[pin.risk];
  const letter = pin.kind === 'place' ? '' : RISK_LETTER[pin.risk];
  return L.divIcon({
    html: `<span aria-hidden="true">${letter}</span>`,
    className: `map-pin ${shape}${selected ? ' map-pin-selected' : ''}`,
    iconSize: L.point(28, 28),
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function ViewController({
  points,
  center,
}: {
  points: Array<[number, number]>;
  center?: CityCenter | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (center) {
      map.setView([center.lat, center.lng], 11);
    } else {
      map.fitBounds(L.latLngBounds(points.map((point) => L.latLng(point[0], point[1]))), {
        padding: [24, 24],
      });
    }
  }, [map, points, center]);
  return null;
}

function PinPopup({ pin }: { pin: MapPin }) {
  return (
    <Popup>
      <div className="flex min-w-44 flex-col gap-1.5 text-sm">
        <p className="font-bold text-slate-900">{pin.title}</p>
        {pin.subtitle ? <p className="text-slate-600">{pin.subtitle}</p> : null}
        {pin.kind === 'job' ? <RiskBadge risk={pin.risk} /> : null}
        <p className="text-slate-700">
          <span className="font-semibold">Salary: </span>
          {pin.salary ?? 'Salary not listed'}
        </p>
        {pin.approximate ? <p className="text-xs text-slate-500">Approximate location</p> : null}
        {pin.link ? (
          <p>
            <a href={pin.link} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">
              Apply for this job
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        ) : null}
      </div>
    </Popup>
  );
}

/**
 * Job + business map (OSM tiles, required attribution). Lazy-loaded with
 * its Leaflet chunk. Never requests browser geolocation.
 */
export function JobsMap({ jobs, places, cityCenter, selectedId, onSelect }: JobsMapProps) {
  const [listView, setListView] = useState(false);
  const pins = useMemo(() => buildPins(jobs, places), [jobs, places]);
  const jobPins = useMemo(() => pins.filter((pin) => pin.kind === 'job'), [pins]);
  const placePins = useMemo(() => pins.filter((pin) => pin.kind === 'place'), [pins]);
  const points = useMemo(() => pins.map((pin) => [pin.lat, pin.lng] as [number, number]), [pins]);

  if (pins.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">
        No mapped locations yet — none of these results carry coordinates.
      </p>
    );
  }

  if (listView) {
    return (
      <div className="flex flex-col gap-2">
        <MapToolbar listView={listView} onToggle={() => setListView(false)} />
        <ul className="flex flex-col gap-1 text-sm text-ink">
          {pins.map((pin) => (
            <li key={pin.id} className="break-words">
              {pin.title} — {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              {pin.approximate ? ' (approximate)' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const jobMarkers = jobPins.map((pin) => (
    <Marker
      key={pin.id}
      position={[pin.lat, pin.lng]}
      title={`${pin.title} (${pin.risk} risk)`}
      icon={pinIcon(pin, selectedId === pin.id)}
      eventHandlers={{ click: () => onSelect(pin.id) }}
    >
      <PinPopup pin={pin} />
    </Marker>
  ));

  return (
    <div className="flex flex-col gap-2">
      <MapToolbar listView={listView} onToggle={() => setListView(true)} />
      <div role="region" aria-label="Interactive job map" className="overflow-hidden rounded-lg border border-line">
        <MapContainer
          center={cityCenter ? [cityCenter.lat, cityCenter.lng] : INDIA_CENTER}
          zoom={cityCenter ? 11 : 5}
          scrollWheelZoom
          style={{ height: '20rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ViewController points={points} center={cityCenter} />
          <LayersControl position="topright">
            <LayersControl.Overlay checked name="Jobs">
              {jobPins.length > CLUSTER_THRESHOLD ? (
                <MarkerClusterGroup
                  chunkedLoading
                  showCoverageOnHover={false}
                  maxClusterRadius={60}
                  iconCreateFunction={(cluster: { getChildCount: () => number }) =>
                    L.divIcon({
                      html: `<span aria-hidden="true">${cluster.getChildCount()}</span>`,
                      className: 'map-cluster',
                      iconSize: L.point(36, 36),
                    })
                  }
                >
                  {jobMarkers}
                </MarkerClusterGroup>
              ) : (
                jobMarkers
              )}
            </LayersControl.Overlay>
            <LayersControl.Overlay checked name="Local businesses">
              {placePins.map((pin) => (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  title={pin.title}
                  icon={pinIcon(pin, selectedId === pin.id)}
                  eventHandlers={{ click: () => onSelect(pin.id) }}
                >
                  <PinPopup pin={pin} />
                </Marker>
              ))}
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </div>
      <p className="hidden text-xs text-muted [@media(pointer:coarse)]:block">
        Tip: drag with two fingers to move the map without trapping page scroll.
      </p>
      <div aria-label="Map legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-low" /> Low risk job
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-medium" /> Medium risk job
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-high" /> High risk job
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-place" /> Local business
        </span>
      </div>
    </div>
  );
}

function MapToolbar({ listView, onToggle }: { listView: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        aria-pressed={listView}
        onClick={onToggle}
        className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
      >
        {listView ? 'Show map view' : 'Show list view'}
      </button>
    </div>
  );
}
