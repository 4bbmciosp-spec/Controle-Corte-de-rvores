import React, { useState, useRef } from 'react';
import { 
  Occurrence, 
  OccurrenceType, 
  TreeRiskType, 
  OccurrenceUrgency, 
  Platoon, 
  Squad, 
  User, 
  OccurrencePhoto,
  OFFICIAL_TREE_DISPATCH_NATURES,
  TreeDispatchNature
} from '../types';
import { createOccurrence, updateOccurrence } from '../services/storageService';
import { processUploadedImage, storePhotoBlob } from '../services/photoStorage';
import { parseCoordinateInput, reverseGeocode, forwardGeocode } from '../services/geocodeService';
import { MapPicker } from './MapPicker';
import { 
  X, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  AlertOctagon, 
  TreePine, 
  Truck, 
  Camera, 
  Upload, 
  Trash2, 
  Loader2, 
  Save,
  CheckCircle2,
  Navigation,
  FileSpreadsheet,
  Users,
  Shield,
  Clock,
  Award,
  Search,
  Copy,
  Sparkles,
  RefreshCw,
  Compass,
  Check
} from 'lucide-react';

interface CobomNewOccurrenceModalProps {
  initialOccurrence?: Occurrence | null;
  platoons: Platoon[];
  squads: Squad[];
  currentUser: User;
  onClose: () => void;
  onSaved: (occ: Occurrence) => void;
}

export const CobomNewOccurrenceModal: React.FC<CobomNewOccurrenceModalProps> = ({
  initialOccurrence,
  platoons,
  squads,
  currentUser,
  onClose,
  onSaved,
}) => {
  const isEditing = !!initialOccurrence;

  // Form State
  const [solicitorName, setSolicitorName] = useState(initialOccurrence?.solicitorName || '');
  const [solicitorPhone, setSolicitorPhone] = useState(initialOccurrence?.solicitorPhone || '');
  const [firstRequestDate, setFirstRequestDate] = useState(
    initialOccurrence?.initialRequestDate || initialOccurrence?.createdAt ? 
      new Date(initialOccurrence?.initialRequestDate || initialOccurrence?.createdAt || Date.now()).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [address, setAddress] = useState(initialOccurrence?.address || '');
  const [neighborhood, setNeighborhood] = useState(initialOccurrence?.neighborhood || '');
  const [city, setCity] = useState(initialOccurrence?.city || 'Santa Maria');
  const [referencePoint, setReferencePoint] = useState(initialOccurrence?.referencePoint || '');
  
  // Santa Maria Coordinates default: -29.6842, -53.8069
  const [latitude, setLatitude] = useState(initialOccurrence?.latitude || -29.6842);
  const [longitude, setLongitude] = useState(initialOccurrence?.longitude || -53.8069);

  // GPS & Geocoding State (Bidirecional)
  const [coordinateInput, setCoordinateInput] = useState<string>(
    initialOccurrence ? `${initialOccurrence.latitude}, ${initialOccurrence.longitude}` : '-29.6842, -53.8069'
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFeedback, setGeocodeFeedback] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'SEARCHING' | 'FALLBACK';
    text: string;
  } | null>(null);

  const [description, setDescription] = useState(initialOccurrence?.description || '');
  const [dispatchNature, setDispatchNature] = useState<string>(
    initialOccurrence?.dispatchNature || OFFICIAL_TREE_DISPATCH_NATURES[0]
  );
  const [type, setType] = useState<OccurrenceType>(initialOccurrence?.type || 'CORTE_ARVORE');
  const [treeRisk, setTreeRisk] = useState<TreeRiskType>(initialOccurrence?.treeRisk || 'GALHO_SOBRE_FIACAO_ENERGIZADA');
  const [urgency, setUrgency] = useState<OccurrenceUrgency>(initialOccurrence?.urgency || 'ALTA');
  
  const [platoonId, setPlatoonId] = useState(initialOccurrence?.platoonId || platoons[0]?.id || 'plat-1');
  const [assignedSquadId, setAssignedSquadId] = useState(initialOccurrence?.assignedSquadId || squads[0]?.id || 'squad-abt-1496');

  // Initial Photos
  const [photos, setPhotos] = useState<OccurrencePhoto[]>(initialOccurrence?.initialPhotos || []);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Trigger Reverse Geocode (Coordinates -> Address)
  const handleReverseLookup = async (lat: number, lng: number, updateInput = false) => {
    if (updateInput) {
      setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
    setLatitude(lat);
    setLongitude(lng);

    setIsGeocoding(true);
    setGeocodeFeedback({
      type: 'SEARCHING',
      text: 'Identificando logradouro e bairro via GPS...'
    });

    try {
      const result = await reverseGeocode(lat, lng);
      
      if (result.success) {
        if (result.address && result.address !== 'Logradouro não identificado') {
          setAddress(result.address);
        }
        if (result.neighborhood) {
          setNeighborhood(result.neighborhood);
        }
        if (result.city) {
          setCity(result.city);
        }
        setGeocodeFeedback({
          type: 'SUCCESS',
          text: result.fromCache 
            ? `Endereço localizado (cache): ${result.address}, ${result.neighborhood}`
            : `Endereço identificado via GPS: ${result.address}, ${result.neighborhood}`
        });
      } else {
        // Fallback gracioso: não trava e permite digitação manual
        setGeocodeFeedback({
          type: 'FALLBACK',
          text: 'Logradouro não identificado automaticamente. Preencha o endereço manualmente.'
        });
      }
    } catch (err) {
      console.warn('Erro geocode:', err);
      setGeocodeFeedback({
        type: 'FALLBACK',
        text: 'Não foi possível buscar o endereço automaticamente. Preencha manualmente.'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Trigger Forward Geocode (Address -> Coordinates)
  const handleForwardLookup = async () => {
    if (!address.trim()) {
      alert('Digite o nome da rua ou avenida antes de buscar coordenadas.');
      return;
    }

    setIsGeocoding(true);
    setGeocodeFeedback({
      type: 'SEARCHING',
      text: `Buscando coordenadas para "${address}" em Santa Maria...`
    });

    try {
      const result = await forwardGeocode(address, neighborhood, city);
      if (result && result.success) {
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setCoordinateInput(`${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
        if (result.neighborhood && (!neighborhood || neighborhood === 'Centro')) {
          setNeighborhood(result.neighborhood);
        }
        setGeocodeFeedback({
          type: 'SUCCESS',
          text: `Coordenadas encontradas: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`
        });
      } else {
        setGeocodeFeedback({
          type: 'ERROR',
          text: 'Coordenadas não localizadas para este endereço. Marque o ponto diretamente no mapa.'
        });
      }
    } catch (err) {
      console.warn('Erro forward geocode:', err);
      setGeocodeFeedback({
        type: 'ERROR',
        text: 'Erro ao buscar coordenadas. Marque o ponto diretamente no mapa.'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle Coordinates Input Text Change / Paste
  const handleCoordinateInputChange = (val: string) => {
    setCoordinateInput(val);
    const parsed = parseCoordinateInput(val);
    if (parsed) {
      handleReverseLookup(parsed.lat, parsed.lng, false);
    }
  };

  // Handle Paste from Clipboard
  const handlePasteClipboardCoordinates = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleCoordinateInputChange(text);
        }
      }
    } catch {
      // Ignore if clipboard permission denied
    }
  };

  const handleDispatchNatureChange = (nature: string) => {
    setDispatchNature(nature);
    // Automatically infer standard type and risk
    if (nature.includes('Vistoria') || nature.includes('risco de queda')) {
      setType('VISTORIA_RISCO');
      setTreeRisk('VISTORIA_PREVENTIVA_SOLICITADA');
    } else if (nature.includes('via') || nature.includes('hospital') || nature.includes('trem')) {
      setType('DESOBSTRUCAO_VIA');
      setTreeRisk('QUEDA_SOBRE_VIA_PUBLICA');
    } else if (nature.includes('fiação')) {
      setType('REMOCAO_GALHO_FIACAO');
      setTreeRisk('GALHO_SOBRE_FIACAO_ENERGIZADA');
    } else if (nature.includes('residência') || nature.includes('telhado')) {
      setType('CORTE_ARVORE');
      setTreeRisk('QUEDA_SOBRE_RESIDENCIA');
    } else {
      setType('CORTE_ARVORE');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      alert('Limite de até 3 fotos no cadastro inicial do COBOM.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (photos.length + i >= 3) break;
        const file = files[i];
        const base64Data = await processUploadedImage(file);
        const photoId = `cobom-photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        await storePhotoBlob(photoId, base64Data);

        const newPhoto: OccurrencePhoto = {
          id: photoId,
          occurrenceId: initialOccurrence?.id || 'new',
          url: base64Data,
          caption: 'Foto anexada no chamado 193 (COBOM Santa Maria)',
          uploadedAt: new Date().toISOString(),
          uploadedBySquadName: 'COBOM 193',
          stage: 'INICIAL_COBOM'
        };

        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      alert('Erro ao carregar imagem.');
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!solicitorName.trim() || !solicitorPhone.trim()) {
      setErrorMsg('Informe o nome e telefone do solicitante.');
      return;
    }
    if (!address.trim() || !neighborhood.trim()) {
      setErrorMsg('Informe o endereço completo e bairro.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Descreva a situação/risco da árvore.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialOccurrence) {
        const updated: Occurrence = {
          ...initialOccurrence,
          solicitorName,
          solicitorPhone,
          initialRequestDate: firstRequestDate,
          address,
          neighborhood,
          city,
          referencePoint,
          latitude,
          longitude,
          description,
          dispatchNature,
          type,
          treeRisk,
          urgency,
          platoonId,
          assignedSquadId,
          initialPhotos: photos,
        };
        updateOccurrence(updated);
        onSaved(updated);
      } else {
        const created = createOccurrence({
          openedBy: `COBOM - ${currentUser.rank} ${currentUser.name}`,
          solicitorName,
          solicitorPhone,
          initialRequestDate: firstRequestDate,
          address,
          neighborhood,
          city,
          referencePoint,
          latitude,
          longitude,
          description,
          dispatchNature,
          type,
          treeRisk,
          urgency,
          platoonId,
          assignedSquadId,
          status: 'PENDENTE',
          initialPhotos: photos,
        });
        onSaved(created);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao registrar ocorrência no sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-slate-800">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-red-800 shadow">
              <TreePine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                {isEditing ? `Editar Ocorrência: ${initialOccurrence?.protocol}` : 'COBOM 193 - Nova Ocorrência de Árvore'}
              </h3>
              <p className="text-xs text-red-100 font-medium">
                4º BBM - Santa Maria | Central de Operações de Bombeiros Militar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-800 text-xs bg-slate-50">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs rounded-lg flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* 1. DADOS DO SOLICITANTE */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              <UserIcon className="w-3.5 h-3.5 text-red-600" />
              <span>1. Dados do Solicitante (Chamado 193 Santa Maria)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nome Completo do Solicitante *</label>
                <input
                  type="text"
                  value={solicitorName}
                  onChange={(e) => setSolicitorName(e.target.value)}
                  placeholder="Ex: Maria Helena Castro"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Telefone / Celular de Contato *</label>
                <input
                  type="text"
                  value={solicitorPhone}
                  onChange={(e) => setSolicitorPhone(e.target.value)}
                  placeholder="Ex: (55) 99872-4411"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Data da 1ª Solicitação *</label>
                <input
                  type="datetime-local"
                  value={firstRequestDate}
                  onChange={(e) => setFirstRequestDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. LOCALIZAÇÃO E MAPA COM GEOCODIFICAÇÃO BIDIRECIONAL */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>2. Localização & Coordenadas Geográficas (Santa Maria - RS)</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                Geocodificação Automática
              </span>
            </div>

            {/* PAINEL DE ENTRADA RÁPIDA DE COORDENADAS GPS */}
            <div className="p-3 bg-red-50/40 rounded-xl border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-red-700" />
                  <span>Coordenadas GPS (Lat, Long):</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Ex: -29.623693597713423, -53.76663587856028
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={coordinateInput}
                    onChange={(e) => handleCoordinateInputChange(e.target.value)}
                    placeholder="Cole ou digite aqui: -29.623693597713423, -53.76663587856028"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-slate-900 font-mono text-xs font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-inner"
                  />
                  {isGeocoding && (
                    <div className="absolute right-2.5 top-2.5 text-red-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePasteClipboardCoordinates}
                    className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title="Colar coordenadas da área de transferência"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Colar GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReverseLookup(latitude, longitude, true)}
                    disabled={isGeocoding}
                    className="px-2.5 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Buscar endereço para estas coordenadas"
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    )}
                    <span>Buscar Endereço</span>
                  </button>
                </div>
              </div>

              {/* Feedback dinâmico do Geocoder */}
              {geocodeFeedback && (
                <div className={`p-2 rounded-lg text-[11px] flex items-center gap-2 border font-medium ${
                  geocodeFeedback.type === 'SUCCESS' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : geocodeFeedback.type === 'SEARCHING'
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : geocodeFeedback.type === 'ERROR'
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {geocodeFeedback.type === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {geocodeFeedback.type === 'SEARCHING' && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />}
                  {geocodeFeedback.type === 'ERROR' && <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                  {geocodeFeedback.type === 'FALLBACK' && <AlertOctagon className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  <span className="flex-1">{geocodeFeedback.text}</span>
                </div>
              )}
            </div>

            {/* CAMPOS DE ENDEREÇO (EDITÁVEIS MANUALMENTE OU PREENCHIDOS VIA GPS) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-bold">Endereço (Rua/Avenida e Número) *</label>
                  <button
                    type="button"
                    onClick={handleForwardLookup}
                    disabled={!address.trim() || isGeocoding}
                    className="text-[10px] text-red-700 hover:text-red-900 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Buscar coordenadas no mapa a partir deste endereço"
                  >
                    <Search className="w-3 h-3" />
                    <span>Buscar Coordenadas pelo Endereço</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Rio Branco, 450"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Bairro *</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Município (RS) *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Santa Maria"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Ponto de Referência</label>
                <input
                  type="text"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  placeholder="Ex: Próximo à Catedral ou esquina com Rua Silva Jardim"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600"
                />
              </div>
            </div>

            {/* SELETOR INTERATIVO DE MAPA LEAFLET */}
            <div className="pt-1">
              <label className="block text-slate-600 font-bold mb-1 flex items-center justify-between">
                <span>Ponto no Mini Mapa Tático (arraste ou clique para geocodificar):</span>
                <span className="text-[11px] text-red-700 font-mono font-bold">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </label>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onChangeLocation={(lat, lng) => {
                  handleReverseLookup(lat, lng, true);
                }}
                height="210px"
              />
            </div>
          </div>

          {/* 3. NATUREZA DO DESPACHO (LISTA OFICIAL CBMRS) E DADOS TÉCNICOS */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
              <TreePine className="w-3.5 h-3.5 text-red-600" />
              <span>3. Natureza do Despacho Operacional (e-193 CBMRS)</span>
            </div>

            {/* Relação Oficial de 16 Naturezas de Corte/Vistoria */}
            <div>
              <label className="block text-slate-800 font-extrabold mb-1 flex items-center justify-between">
                <span>Subcategoria / Natureza de Despacho Oficial do CBMRS *</span>
                <span className="text-[10px] text-slate-500 font-normal">(16 opções padronizadas)</span>
              </label>
              <select
                value={dispatchNature}
                onChange={(e) => handleDispatchNatureChange(e.target.value)}
                className="w-full bg-red-50/50 border border-red-200 rounded-lg px-3 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-sm text-xs"
              >
                {OFFICIAL_TREE_DISPATCH_NATURES.map((nature, idx) => (
                  <option key={idx} value={nature}>
                    {nature}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Risco Principal Avaliado *</label>
                <select
                  value={treeRisk}
                  onChange={(e) => setTreeRisk(e.target.value as TreeRiskType)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-medium"
                >
                  <option value="GALHO_SOBRE_FIACAO_ENERGIZADA">Galho sobre Fiação Energizada</option>
                  <option value="QUEDA_SOBRE_RESIDENCIA">Queda sobre Residência</option>
                  <option value="QUEDA_SOBRE_VIA_PUBLICA">Queda sobre Via Pública</option>
                  <option value="RAIZ_EXPOSTA_INSTAVEL">Raiz Exposta / Solo Instável</option>
                  <option value="ARVORE_OCA_PODRE">Tronco Oco / Podridão</option>
                  <option value="VISTORIA_PREVENTIVA_SOLICITADA">Vistoria Preventiva Solicitada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Grau de Urgência *</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as OccurrenceUrgency)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-bold"
                >
                  <option value="BAIXA" className="text-slate-700">Baixa (Sem risco iminente)</option>
                  <option value="MEDIA" className="text-amber-800">Média (Atenção / Preventivo)</option>
                  <option value="ALTA" className="text-orange-700">Alta (Risco a pessoas / tráfego)</option>
                  <option value="CRITICA" className="text-red-700 font-extrabold">Crítica (Queda iminente / Bloqueio total)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Descrição Detalhada do Chamado 193 *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Eucalipto de grande porte tombado sobre fiação elétrica e portão. Solicitante relata estalos no tronco e faíscas na rede."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {/* 4. EMPENHO OPERACIONAL DA VIATURA E GUARNIÇÃO (ESCALA E-193) */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <Truck className="w-3.5 h-3.5 text-red-600" />
                <span>4. Empenho da Viatura (VTR) e Guarnição Escalar</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                Vínculo automático: VTR ➔ Pelotão (PelBM) ➔ Militares
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Selecionar Viatura (VTR) para Atendimento *
                </label>
                <select
                  value={assignedSquadId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setAssignedSquadId(selectedId);
                    const selected = squads.find(s => s.id === selectedId);
                    if (selected && selected.platoonId) {
                      setPlatoonId(selected.platoonId);
                    }
                  }}
                  className="w-full bg-red-50/60 border border-red-300 rounded-lg px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 font-bold text-xs shadow-sm"
                >
                  {squads.map(s => {
                    const plat = platoons.find(p => p.id === s.platoonId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.callSign} — {s.commanderName} [{plat?.name?.split('-')[0]?.trim() || s.unitText || 'PelBM'}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Pelotão de Bombeiro Militar (PelBM) Vinculado *
                </label>
                <select
                  value={platoonId}
                  onChange={(e) => {
                    const newPlatId = e.target.value;
                    setPlatoonId(newPlatId);
                    const platSquads = squads.filter(s => s.platoonId === newPlatId);
                    if (platSquads.length > 0) {
                      setAssignedSquadId(platSquads[0].id);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 font-semibold text-xs"
                >
                  {platoons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Painel Tático da Guarnição Empenhada: VTR + PelBM + Comandante + Efetivo */}
            {(() => {
              const selectedSquad = squads.find(s => s.id === assignedSquadId);
              const selectedPlatoon = platoons.find(p => p.id === (selectedSquad?.platoonId || platoonId));
              if (!selectedSquad) return null;

              return (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-red-700 text-white font-mono font-black text-xs shadow-sm">
                        {selectedSquad.callSign}
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          {selectedPlatoon?.name || selectedSquad.unitText || 'Pelotão BM'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {selectedSquad.unitText || selectedPlatoon?.headquarters}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Comandante: {selectedSquad.commanderName}
                      </span>
                    </div>
                  </div>

                  {/* Militares escalados na viatura */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-red-600" />
                        Militares Escalados na Guarnição ({selectedSquad.members?.length || 0}):
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {selectedSquad.currentShift || 'Turno do Dia'}
                      </span>
                    </div>

                    {selectedSquad.members && selectedSquad.members.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {selectedSquad.members.map((m, idx) => (
                          <div 
                            key={idx}
                            className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <span>{m.name}</span>
                                {m.name === selectedSquad.commanderName && (
                                  <Award className="w-3 h-3 text-amber-600" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Mat: {m.registrationNumber} • {m.roleInSquad}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {m.shiftHours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Nenhum militar registrado nesta viatura.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 5. FOTOS INICIAIS (ATÉ 3) */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" />
                  Fotos Iniciais do Chamado 193 ({photos.length}/3)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Anexe fotos enviadas pelo solicitante ou registradas na triagem inicial.
                </p>
              </div>

              {photos.length < 3 && (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={galleryInputRef}
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Câmera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Galeria</span>
                  </button>
                </div>
              )}
            </div>

            {isProcessingPhoto && (
              <div className="py-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                <span>Processando imagem...</span>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {photos.map((p, idx) => (
                  <div key={p.id} className="relative group bg-slate-100 border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={p.url}
                      alt={`Foto Inicial ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-extrabold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando no 4º BBM...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Despachar Ocorrência 193'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
