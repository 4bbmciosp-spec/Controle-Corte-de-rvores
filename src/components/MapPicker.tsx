import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChangeLocation: (lat: number, lng: number) => void;
  height?: string;
  zoom?: number;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onChangeLocation,
  height = '260px',
  zoom = 14,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeLocationRef = useRef(onChangeLocation);

  useEffect(() => {
    onChangeLocationRef.current = onChangeLocation;
  }, [onChangeLocation]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Firefighter / Emergency Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: #dc2626; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-weight: bold;">🚒</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeLocationRef.current(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeLocationRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      const currentCenter = mapInstanceRef.current.getCenter();
      // Only pan if changed noticeably
      if (Math.abs(currentCenter.lat - latitude) > 0.00001 || Math.abs(currentCenter.lng - longitude) > 0.00001) {
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude, zoom]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onChangeLocationRef.current(lat, lng);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
          }
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Não foi possível obter a localização GPS atual.');
        }
      );
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-xs">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        title="Obter GPS do dispositivo"
      >
        <Navigation className="w-3.5 h-3.5 text-red-600" />
        <span>Usar GPS Atual</span>
      </button>
      <div className="absolute bottom-2 left-2 z-[1000] bg-white/95 text-slate-800 text-[11px] px-2.5 py-1 rounded-md border border-slate-300 font-mono font-bold flex items-center gap-1 shadow-sm">
        <MapPin className="w-3 h-3 text-red-600" />
        <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
      </div>
    </div>
  );
};
