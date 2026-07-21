import { useMemo } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { ItineraryDay } from '@travel-ai/shared';

const MAP_LIBRARIES: 'geometry'[] = ['geometry'];

const containerStyle = {
  width: '100%',
  height: '260px',
  borderRadius: 'var(--radius-lg)',
};

function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  if (!window.google?.maps?.geometry) return [];
  return window.google.maps.geometry.encoding
    .decodePath(encoded)
    .map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

function RouteSegmentList({ day }: { day: ItineraryDay }) {
  const segments = day.routeSegments ?? [];
  if (segments.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0 }}>
      {segments.map((segment, idx) => {
        const from = day.activities[segment.fromActivityIndex];
        const to = day.activities[segment.toActivityIndex];
        const km = (segment.distanceMeters / 1000).toFixed(1);
        const isTransit = segment.mode === 'transit';
        return (
          <li
            key={idx}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text)',
              padding: '0.3rem 0',
            }}
          >
            {from?.name} → {to?.name}:{' '}
            {isTransit ? (
              <>
                🚊 {segment.transitSummary ?? '대중교통 이용'} · 약 {segment.baseDurationMinutes}분
                <span style={{ color: 'var(--color-muted)' }}> (도보로는 약 {km}km)</span>
              </>
            ) : (
              <>
                약 {km}km · 도보 약 {segment.seniorAdjustedDurationMinutes}분{' '}
                <span style={{ color: 'var(--color-muted)' }}>(일반 성인 기준 {segment.baseDurationMinutes}분)</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ItineraryMap({ day }: { day: ItineraryDay }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
    libraries: MAP_LIBRARIES,
  });

  const activitiesWithCoords = useMemo(
    () =>
      day.activities
        .map((activity, index) => ({ activity, index }))
        .filter(({ activity }) => activity.coordinates),
    [day.activities]
  );

  const center = activitiesWithCoords[0]?.activity.coordinates;

  if (!apiKey) {
    return (
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', margin: '0.5rem 0' }}>
        지도를 보려면 Google Maps API 키 설정이 필요해요.
      </p>
    );
  }

  if (activitiesWithCoords.length === 0 || !center) {
    return (
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', margin: '0.5rem 0' }}>
        위치 정보가 없어 지도를 표시할 수 없어요.
      </p>
    );
  }

  if (!isLoaded) {
    return <div style={{ ...containerStyle, background: 'var(--color-fill)' }} />;
  }

  return (
    <div style={{ margin: '0.5rem 0 1rem' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={{
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {activitiesWithCoords.map(({ activity, index }) => (
          <Marker key={index} position={activity.coordinates!} label={`${index + 1}`} title={activity.name} />
        ))}
        {(day.routeSegments ?? []).map((segment, idx) => {
          const from = day.activities[segment.fromActivityIndex]?.coordinates;
          const to = day.activities[segment.toActivityIndex]?.coordinates;
          if (!from || !to) return null;
          const path = segment.encodedPolyline ? decodePolyline(segment.encodedPolyline) : [from, to];
          const isTransit = segment.mode === 'transit';
          return (
            <Polyline
              key={idx}
              path={path}
              options={{
                strokeColor: isTransit ? '#e07a1f' : '#3366ff',
                strokeWeight: 4,
                strokeOpacity: 0.8,
              }}
            />
          );
        })}
      </GoogleMap>
      <RouteSegmentList day={day} />
    </div>
  );
}
