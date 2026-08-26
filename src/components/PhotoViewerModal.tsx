import React from 'react';
import { OccurrencePhoto } from '../types';
import { X, ZoomIn, Calendar, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface PhotoViewerModalProps {
  photo: OccurrencePhoto | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `CBMRS_${photo.occurrenceId}_foto_${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="relative max-w-4xl w-full bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-red-800 text-white border-b border-red-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <span className="font-extrabold text-sm text-white">Registro Fotográfico Operacional CBMRS</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
              title="Baixar Foto"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-3 min-h-[300px] overflow-auto">
          <img
            src={photo.url}
            alt={photo.caption || 'Foto da ocorrência'}
            referrerPolicy="no-referrer"
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
          />
        </div>

        {/* Footer Info */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-slate-900 text-sm">
              {photo.caption || 'Registro de Atendimento de Corte/Vistoria de Árvore'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-[11px]">
              Etapa: {photo.stage}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 text-[11px] pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(photo.uploadedAt).toLocaleString('pt-BR')}
            </span>
            <span className="font-medium">Enviado por: <strong className="text-slate-800">{photo.uploadedBySquadName}</strong></span>
            <span className="font-medium">ID do Arquivo: <code className="text-red-700 font-bold">{photo.id}</code></span>
          </div>
        </div>
      </div>
    </div>
  );
};
