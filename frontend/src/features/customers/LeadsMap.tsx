import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect, useMemo, useState } from 'react';
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Lead } from '../../api/schemas';
import { buildLeadPins, type LeadPin } from './leadPins';

export interface LeadsMapProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  shortlistedIds?: ReadonlySet<string>;
}

const INDIA_CENTER: [number, number] = [20.59, 78.96];

function pinIcon(pin: LeadPin, selected: boolean): L.DivIcon {
  const size = pin.size;
  return L.divIcon({
    html: `<span aria-hidden="true">${pin.score}</span>`,
    className: `map-pin map-pin-lead${selected ? ' map-pin-selected' : ''}${pin.shortlisted ? ' map-pin-shortlisted' : ''}`,
    iconSize: L.point(size, size),
    iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
    popupAnchor: [0, -Math.round(size / 2)],
  });
}

function ViewController({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((point) => L.latLng(point[0], point[1]))), {
      padding: [24, 24],
    });
  }, [map, points]);
  return null;
}

function LeadPopup({ pin }: { pin: LeadPin }) {
  return (
    <Popup>
      <div className="flex min-w-44 flex-col gap-1.5 text-sm">
        <p className="font-bold text-slate-900">{pin.title}</p>
        {pin.subtitle ? <p className="text-slate-600">{pin.subtitle}</p> : null}
        <p className="text-slate-700">
          <span className="font-semibold">Lead score: </span>
          {pin.score}
        </p>
        {pin.shortlisted ? (
          <p className="text-xs font-semibold text-slate-700">★ Shortlisted</p>
        ) : null}
      </div>
    </Popup>
  );
}

/**
 * Customer-lead map (OSM tiles, required attribution). Markers grow with the
 * lead score; shortlisted leads form a second layer. Never requests browser
 * geolocation.
 */
export function LeadsMap({ leads, selectedId, onSelect, shortlistedIds }: LeadsMapProps) {
  const [listView, setListView] = useState(false);
  const pins = useMemo(() => buildLeadPins(leads, shortlistedIds), [leads, shortlistedIds]);
  const shortlisted = useMemo(() => pins.filter((pin) => pin.shortlisted), [pins]);
  const points = useMemo(() => pins.map((pin) => [pin.lat, pin.lng] as [number, number]), [pins]);

  if (pins.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">
        No mapped locations yet — none of these leads carry coordinates.
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
              {pin.title} — score {pin.score} — {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <MapToolbar listView={listView} onToggle={() => setListView(true)} />
      <div role="region" aria-label="Interactive leads map" className="overflow-hidden rounded-lg border border-line">
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          scrollWheelZoom
          style={{ height: '20rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ViewController points={points} />
          <LayersControl position="topright">
            <LayersControl.Overlay checked name="Leads">
              {pins.map((pin) => (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  title={`${pin.title} (score ${pin.score})`}
                  icon={pinIcon(pin, selectedId === pin.id)}
                  eventHandlers={{ click: () => onSelect(pin.id) }}
                >
                  <LeadPopup pin={pin} />
                </Marker>
              ))}
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Shortlist">
              {shortlisted.map((pin) => (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  title={`${pin.title} (score ${pin.score}, shortlisted)`}
                  icon={pinIcon(pin, selectedId === pin.id)}
                  eventHandlers={{ click: () => onSelect(pin.id) }}
                >
                  <LeadPopup pin={pin} />
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
        <span>Larger marker = higher lead score.</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-lead" /> Lead
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="legend-shape legend-shape-shortlisted" /> Shortlisted
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
