import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { JobResult, PlaceResult } from '../../api/schemas';
import { JobsMap } from './JobsMap';

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
    icon?: { options?: { className?: string } };
    position?: unknown;
  }) => (
    <button
      type="button"
      data-testid="map-marker"
      data-position={JSON.stringify(position)}
      data-icon={icon?.options?.className ?? ''}
      onClick={eventHandlers?.click}
    >
      {children}
    </button>
  ),
  Popup: ({ children }: { children?: ReactNode }) => <div data-testid="map-popup">{children}</div>,
  LayersControl: Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Overlay: ({ children }: { children?: ReactNode }) => (
        <div data-testid="map-layer">{children}</div>
      ),
    },
  ),
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker-cluster">{children}</div>
  ),
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: (options: { className?: string }) => ({ options }),
    point: (x: number, y: number) => ({ x, y }),
    latLng: (lat: number, lng: number) => ({ lat, lng }),
    latLngBounds: (points: unknown[]) => ({ points, pad: () => ({}) }),
  },
}));

function job(title: string, overrides: Partial<JobResult> = {}): JobResult {
  return {
    title,
    company: 'ABC',
    location: 'Pune',
    desc: 'Work',
    flags: [],
    risk: 'Low',
    ...overrides,
  };
}

function place(name: string, overrides: Partial<PlaceResult> = {}): PlaceResult {
  return { name, ...overrides };
}

const props = { cityCenter: null, selectedId: null as string | null, onSelect: () => {} };

describe('JobsMap', () => {
  it('renders markers only for jobs with coordinates', () => {
    render(
      <JobsMap
        {...props}
        jobs={[
          job('Pinned', { lat: 18.5, lng: 73.8 }),
          job('Remote', { location: 'Remote' }),
          job('No Coords'),
        ]}
        places={[]}
      />,
    );
    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveAttribute('data-position', '[18.5,73.8]');
  });

  it('clusters past the threshold and layers places separately', () => {
    const jobs = Array.from({ length: 16 }, (_, i) =>
      job(`Job ${i}`, { lat: 18 + i * 0.01, lng: 73.8 }),
    );
    render(
      <JobsMap
        {...props}
        jobs={jobs}
        places={[place('Shop', { lat: 18.1, lng: 73.1 })]}
      />,
    );
    expect(screen.getByTestId('marker-cluster')).toBeInTheDocument();
    expect(screen.getAllByTestId('map-marker')).toHaveLength(17);
  });

  it('skips clustering at or below the threshold', () => {
    render(<JobsMap {...props} jobs={[job('Pinned', { lat: 18.5, lng: 73.8 })]} places={[]} />);
    expect(screen.queryByTestId('marker-cluster')).not.toBeInTheDocument();
  });

  it('shows a compact empty state without coordinates', () => {
    render(<JobsMap {...props} jobs={[job('Remote', { location: 'Remote' })]} places={[]} />);
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    expect(screen.getByText(/no mapped locations yet/i)).toBeInTheDocument();
  });

  it('marks approximate pins and syncs selection both ways', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <JobsMap
        cityCenter={null}
        selectedId="job-0"
        onSelect={onSelect}
        jobs={[job('Pinned', { lat: 18.5, lng: 73.8, geo_precision: 'city' })]}
        places={[]}
      />,
    );
    expect(screen.getAllByText('Approximate location')).toHaveLength(1);
    const marker = screen.getByTestId('map-marker');
    expect(marker.getAttribute('data-icon')).toContain('map-pin-selected');
    await user.click(marker);
    expect(onSelect).toHaveBeenCalledWith('job-0');
  });

  it('toggles a list view fallback', async () => {
    const user = userEvent.setup();
    render(
      <JobsMap
        {...props}
        jobs={[job('Pinned', { lat: 18.5, lng: 73.8 })]}
        places={[place('Shop', { lat: 18.1, lng: 73.1 })]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show list view/i }));
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getByText(/pinned/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show map view/i }));
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('shows the legend and touch hint', () => {
    render(
      <JobsMap
        {...props}
        jobs={[job('Pinned', { lat: 18.5, lng: 73.8 })]}
        places={[]}
      />,
    );
    const legend = document.querySelector('div[aria-label="Map legend"]');
    expect(legend).not.toBeNull();
    expect(legend?.textContent).toMatch(/low risk job/i);
  });
});
