'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { createClient } from '@/lib/supabase/client';

type Place = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  haiku_count: number;
  google_place_id: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPlaceSelect: (place: { id: string; name: string; city: string; google_place_id: string }) => void;
  currentPlace?: { lat: number; lng: number; name: string };
};

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function MapOverlay({ open, onClose, onPlaceSelect, currentPlace }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  // Stable ref to the callback — always current, safe to call from DOM handlers
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;
  const currentPlaceRef = useRef(currentPlace);
  currentPlaceRef.current = currentPlace;
  // Mirror of places state — always current, safe to read from DOM event handlers
  const placesRef = useRef<Place[]>([]);

  // Tooltip anchor position — updated in same event as setSelectedPlace, read during render
  const tooltipXRef = useRef(0);
  const tooltipYRef = useRef(0);

  const [places, setPlaces] = useState<Place[]>([]);
  placesRef.current = places;
  const [mapLoaded, setMapLoaded] = useState(false);
  // selectedPlace is the single source of truth for which dot is active
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch places from Supabase on first open
  useEffect(() => {
    if (!open || places.length > 0) return;
    createClient()
      .from('places')
      .select('id, name, city, lat, lng, haiku_count, google_place_id')
      .then(({ data }) => {
        if (data) {
          setPlaces(data.filter(p => p.lat != null && p.lng != null) as Place[]);
        }
      });
  }, [open, places.length]);

  // Initialize MapLibre map on first open — dynamically imported to avoid SSR
  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return;

    Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css' as string),
    ]).then(([{ default: maplibregl }]) => {
      if (!containerRef.current) return;

      const isMobile = window.innerWidth <= 600;
      const cp = currentPlaceRef.current;
      const center: [number, number] = cp ? [cp.lng, cp.lat] : [0, 25];
      const apiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;
      const styleUrl = `https://tiles.stadiamaps.com/styles/stamen_watercolor.json${apiKey ? `?api_key=${apiKey}` : ''}`;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center,
        zoom: isMobile ? 3 : 4,
        attributionControl: false,
        dragRotate: false,
      });

      map.touchZoomRotate.disableRotation();
      map.on('load', () => setMapLoaded(true));

      // Dismiss tooltip only when the tap lands on the map canvas itself — not on a
      // marker touch target. Markers call stopPropagation on the native DOM event, but
      // MapLibre synthesises its own click from the canvas listener and can still fire.
      // Checking the originalEvent target stops the map click from wiping selectedPlace
      // immediately after a marker tap.
      map.on('click', (e) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (!target?.closest('[data-place-id]')) {
          setSelectedPlace(null);
        }
      });

      mapRef.current = map;

      // Silent geolocation — no prompt language, no error shown if denied
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}
        );
      }
    });
  }, [open]); // currentPlace used via ref — intentionally excluded from deps

  // Re-center when map opens with a different currentPlace
  useEffect(() => {
    if (!open || !mapRef.current || !currentPlace) return;
    mapRef.current.easeTo({ center: [currentPlace.lng, currentPlace.lat], duration: 600 });
  }, [open, currentPlace]);

  // Destroy map on component unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Add markers once map has loaded and places are fetched
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || places.length === 0) return;

    let cancelled = false;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (cancelled || !mapRef.current) return;

      // Always clear before adding — no duplicate markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      places.forEach(place => {
        const size = Math.min(12 + (place.haiku_count || 0) * 3, 32);

        // 44px touch target for reliable mobile taps
        const touchEl = document.createElement('div');
        touchEl.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        // Attribute used by the map click guard to detect marker taps
        touchEl.dataset.placeId = place.id;

        const dotEl = document.createElement('div');
        dotEl.style.cssText = [
          `width:${size}px`,
          `height:${size}px`,
          'border-radius:50%',
          'background:#8b2a1a',
          'border:2px solid #f5f0e8',
          'transition:transform 0.15s ease,box-shadow 0.15s ease',
        ].join(';');

        touchEl.addEventListener('mouseenter', () => {
          dotEl.style.transform = 'scale(1.2)';
          dotEl.style.boxShadow = '0 0 0 4px rgba(139,42,26,0.18)';
        });
        touchEl.addEventListener('mouseleave', () => {
          dotEl.style.transform = '';
          dotEl.style.boxShadow = '';
        });

        touchEl.appendChild(dotEl);

        touchEl.addEventListener('click', (e) => {
          e.stopPropagation();
          // Read place id from the DOM element, look up in the always-current ref
          const placeId = touchEl.dataset.placeId;
          const found = placesRef.current.find(p => p.id === placeId);
          if (!found) return;
          // Record tooltip anchor before triggering React state update
          const rect = dotEl.getBoundingClientRect();
          tooltipXRef.current = rect.left + rect.width / 2;
          tooltipYRef.current = rect.top;
          setSelectedPlace(found);
        });

        const marker = new maplibregl.Marker({ element: touchEl, anchor: 'center' })
          .setLngLat([place.lng, place.lat])
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [mapLoaded, places]);

  // Dismiss tooltip when overlay closes
  useEffect(() => {
    if (!open) setSelectedPlace(null);
  }, [open]);

  // Distance to selected place — shown only if geolocation was granted
  const distanceMiles = selectedPlace && userCoords
    ? haversineDistanceMiles(userCoords.lat, userCoords.lng, selectedPlace.lat, selectedPlace.lng)
    : null;

  // Tooltip position: bottom edge sits 12px above the dot center
  const TOOLTIP_W = 208;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const tipLeft = selectedPlace
    ? Math.max(12, Math.min(tooltipXRef.current - TOOLTIP_W / 2, vw - TOOLTIP_W - 12))
    : 0;
  const tipBottom = selectedPlace ? vh - tooltipYRef.current + 12 : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      opacity: open ? 1 : 0,
      pointerEvents: open ? 'all' : 'none',
      transition: 'opacity 0.5s ease',
    }}>
      {/* MapLibre container — fills the full overlay */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Close — top-right, always above the map */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 10,
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.14)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Shippori Mincho', serif", fontSize: 20, color: 'var(--ink)',
          boxShadow: '0 1px 8px rgba(30,26,20,0.12)',
          lineHeight: 1,
        }}
        aria-label="Close map"
      >×</button>

      {/* Tooltip — appears above tapped dot; "Go" triggers onPlaceSelect */}
      {selectedPlace && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: tipLeft,
            bottom: tipBottom,
            width: TOOLTIP_W,
            zIndex: 300,
            background: 'var(--parchment)',
            border: '1px solid var(--gold)',
            borderRadius: 4,
            padding: 12,
            boxShadow: '0 4px 20px rgba(30,26,20,0.14)',
          }}
        >
          <div style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: 14, color: 'var(--ink)', marginBottom: 6,
          }}>
            {selectedPlace.name}
          </div>
          <div style={{ width: '100%', height: 1, background: 'var(--gold)', opacity: 0.5, marginBottom: 6 }} />
          <div style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4,
          }}>
            {selectedPlace.city}
          </div>
          <div style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: 11, color: 'var(--ink-faint)',
            marginBottom: distanceMiles !== null ? 3 : 10,
          }}>
            {selectedPlace.haiku_count || 0} {(selectedPlace.haiku_count || 0) === 1 ? 'haiku' : 'haikus'}
          </div>
          {distanceMiles !== null && (
            <div style={{
              fontFamily: "'Shippori Mincho', serif",
              fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: 10,
            }}>
              {distanceMiles.toFixed(1)} miles away
            </div>
          )}
          <button
            onClick={() => {
              // selectedPlace is React state — always the place that was tapped, never stale
              const p = selectedPlace;
              setSelectedPlace(null);
              onPlaceSelectRef.current({ id: p.id, name: p.name, city: p.city, google_place_id: p.google_place_id });
            }}
            style={{
              width: '100%', padding: '7px 0',
              background: 'none', border: '1px solid var(--gold)',
              borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Shippori Mincho', serif",
              fontSize: 11, color: 'var(--gold)',
              letterSpacing: '0.22em', textTransform: 'uppercase',
            }}
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
