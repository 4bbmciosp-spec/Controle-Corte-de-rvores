import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Occurrence, Squad } from '../types';
import { getHoursPending } from '../services/storageService';
import { Layers, AlertTriangle, CheckCircle2, Clock, Phone, MapPin, Truck } from 'lucide-react';

interface MapViewProps {
  occurrences: Occurrence[];
  squads?: Squad[];
  onSelectOccurrence: (occ: Occurrence) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  occurrences,
  squads = [],
  onSelectOccurrence,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center default on Santa Maria - RS (4º BBM)
      const map = L.map(mapContainerRef.current, {
        center: [-29.6842, -53.8069],
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    if (markersLayerRef.current && mapInstanceRef.current) {
      markersLayerRef.current.clearLayers();

      const bounds: L.LatLngTuple[] = [];

      occurrences.forEach((occ) => {
        const hoursPending = getHoursPending(occ);
        let markerColor = '#3b82f6'; // Blue
        let iconEmoji = '🚒';

        if (occ.status === 'PENDENTE') {
          markerColor = hoursPending >= 24 ? '#dc2626' : '#d97706';
          iconEmoji = '⚠️';
        } else if (occ.status === 'CONCLUIDA') {
          markerColor = '#16a34a';
          iconEmoji = '✅';
        } else if (occ.status === 'ABERTA') {
          markerColor = '#ea580c';
          iconEmoji = '🔥';
        } else if (occ.status === 'EM_ATENDIMENTO') {
          markerColor = '#2563eb';
          iconEmoji = '🪓';
        }

        const isUrgent = occ.status === 'PENDENTE' && (hoursPending >= 12 || occ.isCarriedOver);
        const assignedSquad = squads.find(s => s.id === occ.assignedSquadId);

        const customIcon = L.divIcon({
          className: 'custom-occurrence-pin',
          html: `
            <div style="
              position: relative;
              background-color: ${markerColor};
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              font-size: 16px;
            ">
              ${iconEmoji}
              ${isUrgent ? `<span style="position: absolute; top: -6px; right: -6px; background-color: #ef4444; color: white; font-size: 9px; font-weight: bold; border-radius: 9999px; padding: 2px 4px; border: 1px solid white; animation: pulse 1.5s infinite;">${hoursPending}h</span>` : ''}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([occ.latitude, occ.longitude], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-slate-900 font-sans';
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #991b1b; font-family: monospace;">${occ.protocol}</span>
            <span style="font-size: 10px; background: #fee2e2; color: #991b1b; padding: 1px 6px; border-radius: 4px; font-weight: bold;">${occ.urgency}</span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 3px;">${occ.dispatchNature || occ.type}</div>
          <div style="font-size: 11px; margin-bottom: 4px; color: #475569;">📍 ${occ.address} - ${occ.neighborhood}, ${occ.city}</div>
          ${assignedSquad ? `<div style="font-size: 11px; margin-bottom: 6px; color: #1e293b; font-weight: 600;">🚒 ${assignedSquad.callSign} (${assignedSquad.commanderName})</div>` : ''}
          <div style="font-size: 11px; margin-bottom: 8px; line-height: 1.3; color: #334155;">${occ.description}</div>
          <div style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Status: ${occ.status}</span>
            ${occ.isCarriedOver ? `<span style="font-size: 10px; background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Turno Anterior (${hoursPending}h)</span>` : ''}
          </div>
          <button id="btn-popup-${occ.id}" style="
            width: 100%;
            background-color: #991b1b;
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            border: none;
            cursor: pointer;
          ">Ver Ocorrência Completa</button>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-${occ.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectOccurrence(occ);
            };
          }
        });

        markersLayerRef.current.addLayer(marker);
        bounds.push([occ.latitude, occ.longitude]);
      });

      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [occurrences, squads, onSelectOccurrence]);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-300 shadow-xl text-xs space-y-2 max-w-xs text-slate-800">
        <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
          <Layers className="w-4 h-4 text-red-600" />
          <span>Mapa Tático - 4º BBM Santa Maria</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-600 inline-block border border-white shadow-xs"></span>
            <span>Aberta (Nova)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block border border-white shadow-xs"></span>
            <span>Em Atendimento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white shadow-xs"></span>
            <span>Pendente (&lt; 24h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white shadow-xs"></span>
            <span>Pendente (&gt; 24h)</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block border border-white shadow-xs"></span>
            <span>Concluída / Finalizada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
