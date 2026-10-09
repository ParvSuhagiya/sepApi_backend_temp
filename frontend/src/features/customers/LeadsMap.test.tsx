import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Lead } from '../../api/schemas';
import { LeadsMap } from './LeadsMap';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({
    children,
    eventHandlers,
    icon,
    position,
  }: {
    children?: ReactNode;
    eventHandlers?: { click?: () => void };
    icon?: { options?: { className?: string; iconSize?: { x: number; y: number } } };
    position?: unknown;
  }) => (
    <button
      type="button"
      data-testid="map-marker"
      data-position={JSON.stringify(position)}
      data-icon={icon?.options?.className ?? ''}
      data-size={JSON.stringify(icon?.options?.iconSize ?? null)}
      onClick={eventHandlers?.click}
    >
      {children}
    </button>
  ),
  Popup: ({ children }: { children?: ReactNode }) => <div data-testid="map-popup">{children}</div>,
  LayersControl: Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Overlay: ({ children, name }: { children?: ReactNode; name?: string }) => (
        <div data-testid="map-layer" data-name={name}>
          {children}
        </div>
      ),
    },
  ),
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: (options: { className?: string; iconSize?: unknown }) => ({ options }),
    point: (x: number, y: number) => ({ x, y }),
    latLng: (lat: number, lng: number) => ({ lat, lng }),
    latLngBounds: (points: unknown[]) => ({ points, pad: () => ({}) }),
  },
}));

function lead(name: string, overrides: Partial<Lead> = {}): Lead {
  return {
    name,
    match_score: 70,
    match_reasons: ['Listed on Google Maps'],
    score_breakdown: {},
    likely_has_software: false,
    adjustments: [],
    ...overrides,
  };
}

const props = { selectedId: null as string | null, onSelect: () => {} };

describe('LeadsMap', () => {
  it('renders markers only for leads with coordinates, sized by score', () => {
    render(
      <LeadsMap
        {...props}
        leads={[
          lead('Big', { lat: 23.02, lng: 72.57, match_score: 95 }),
          lead('Small', { lat: 23.03, lng: 72.58, match_score: 10 }),
          lead('Nowhere'),
        ]}
      />,
    );
    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(2);
    const sizes = markers.map((marker) => JSON.parse(marker.getAttribute('data-size') ?? '{}'));
    expect(sizes[0]).toEqual({ x: 35, y: 35 });
    expect(sizes[1]).toEqual({ x: 25, y: 25 });
  });

  it('shows a compact empty state without coordinates', () => {
    render(<LeadsMap {...props} leads={[lead('Nowhere')]} />);
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    expect(screen.getByText(/no mapped locations yet/i)).toBeInTheDocument();
  });

  it('syncs selection and layers shortlisted leads separately', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <LeadsMap
        selectedId="lead-0"
        onSelect={onSelect}
        leads={[lead('Pinned', { lat: 23.02, lng: 72.57 })]}
        shortlistedIds={new Set(['lead-0'])}
      />,
    );
    const layers = screen.getAllByTestId('map-layer');
    expect(layers).toHaveLength(2);
    const shortlist = within(layers[1] as HTMLElement);
    expect(shortlist.getAllByTestId('map-marker')).toHaveLength(1);
    const marker = screen.getAllByTestId('map-marker')[0];
    expect(marker?.getAttribute('data-icon')).toContain('map-pin-selected');
    expect(marker?.getAttribute('data-icon')).toContain('map-pin-shortlisted');
    if (!marker) throw new Error('marker missing');
    await user.click(marker);
    expect(onSelect).toHaveBeenCalledWith('lead-0');
  });

  it('toggles a list view fallback', async () => {
    const user = userEvent.setup();
    render(<LeadsMap {...props} leads={[lead('Pinned', { lat: 23.02, lng: 72.57 })]} />);
    await user.click(screen.getByRole('button', { name: /show list view/i }));
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent(/pinned/i);
    await user.click(screen.getByRole('button', { name: /show map view/i }));
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
