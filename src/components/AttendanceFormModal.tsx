import React, { useState, useRef } from 'react';
import { Occurrence, Squad, User, UnresolvedReason, OccurrencePhoto } from '../types';
import { recordAttendance } from '../services/storageService';
import { processUploadedImage, storePhotoBlob } from '../services/photoStorage';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Upload, 
  Trash2, 
  Clock, 
  Wrench, 
  X, 
  Send, 
  ShieldAlert,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

interface AttendanceFormModalProps {
  occurrence: Occurrence;
  currentSquad: Squad;
  currentUser: User;
  onClose: () => void;
  onSuccess: (updatedOcc: Occurrence) => void;
}

const COMMON_EQUIPMENT = [
  'Motosserra Sabre Longo',
  'Motosserra Poda Alta',
  'EPI Florestal Completo',
  'Cabos e Roldanas de Tração',
  'Guincho da Viatura',
  'Fita Zebrada e Cones',
  'Auto Escada Mecânica (AER)',
  'Cinto de Poda / Esporões',
  'Detector de Tensão Elétrica',
  'Prancha e Maca de Resgate',
  'Escada prolongável'
];

const UNRESOLVED_REASONS: { value: UnresolvedReason; label: string; desc: string }[] = [
  { 
    value: 'NECESSIDADE_APOIO_CEEE_EQUATORIAL', 
    label: '⚡ Apoio da Cia de Energia Necessário', 
    desc: 'Fiação elétrica energizada nos galhos. Risco iminente de choque elétrico.' 
  },
  { 
    value: 'ARVORE_GRANDE_PORTE_GUINDASTE', 
    label: '🏗️ Árvore de Grande Porte / Altura Excessiva', 
    desc: 'Exige Caminhão cesto ou guindaste pesado para corte seguro por seções.' 
  },
  { 
    value: 'CONDICAO_CLIMATICA_TEMPESTADE', 
    label: '⛈️ Condição Climática Adversa / Temporal', 
    desc: 'Ventos fortes, chuva torrencial ou raios impedindo operação segura em altura.' 
  },
  { 
    value: 'FALTA_EQUIPAMENTO_ESPECIFICO', 
    label: '🪓 Falta de Equipamento Específico', 
    desc: 'Necessidade de ferramenta de maior porte, cordame estático extra ou motosserra pesada.' 
  },
  { 
    value: 'AUTORIZACAO_AMBIENTAL_PENDENTE', 
    label: '📜 Autorização Ambiental / SMAM Pendente', 
    desc: 'Espécie protegida sem risco iminente de colapso ou necessidade de laudo botânico.' 
  },
  { 
    value: 'ACESSO_BLOQUEADO_IMPOSSIBILITADO', 
    label: '🚧 Acesso Bloqueado / Área Enclausurada', 
    desc: 'Viatura ou operadores impossibilitados de acessar os fundos do terreno/propriedade.' 
  },
  { 
    value: 'OUTRO', 
    label: '📝 Outro Motivo Operacional', 
    desc: 'Descrever detalhadamente no campo abaixo.' 
  },
];

export const AttendanceFormModal: React.FC<AttendanceFormModalProps> = ({
  occurrence,
  currentSquad,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [statusResult, setStatusResult] = useState<'CONCLUIDA' | 'PENDENTE'>('CONCLUIDA');
  const [actionTaken, setActionTaken] = useState('');
  const [unresolvedReason, setUnresolvedReason] = useState<UnresolvedReason>('NECESSIDADE_APOIO_CEEE_EQUATORIAL');
  const [unresolvedDetails, setUnresolvedDetails] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'Motosserra Sabre Longo',
    'EPI Florestal Completo',
    'Fita Zebrada e Cones'
  ]);
  
  // Fotos do atendimento (máximo 3)
  const [photos, setPhotos] = useState<{ id: string; url: string; caption: string }[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const toggleEquipment = (eq: string) => {
    if (selectedEquipment.includes(eq)) {
      setSelectedEquipment(selectedEquipment.filter(e => e !== eq));
    } else {
      setSelectedEquipment([...selectedEquipment, eq]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      alert('Limite de 3 fotos por registro de atendimento. Selecione até 3 imagens.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (photos.length + i >= 3) break;
        const file = files[i];
        const base64Data = await processUploadedImage(file);
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        await storePhotoBlob(photoId, base64Data);

        setPhotos(prev => [
          ...prev,
          {
            id: photoId,
            url: base64Data,
            caption: statusResult === 'CONCLUIDA' ? 'Foto de conclusão do corte/vistoria' : 'Registro da pendência no local'
          }
        ]);
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

  const updatePhotoCaption = (index: number, caption: string) => {
    const updated = [...photos];
    updated[index].caption = caption;
    setPhotos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!actionTaken.trim()) {
      setErrorMsg('Por favor, descreva as ações realizadas pela guarnição.');
      return;
    }

    if (statusResult === 'PENDENTE') {
      if (!unresolvedReason) {
        setErrorMsg('É obrigatório selecionar o motivo pelo qual a ocorrência não foi concluída.');
        return;
      }
      if (!unresolvedDetails.trim()) {
        setErrorMsg('Por favor, informe os detalhes do motivo de não conclusão para o próximo turno.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const attendancePhotos: OccurrencePhoto[] = photos.map(p => ({
        id: p.id,
        occurrenceId: occurrence.id,
        url: p.url,
        caption: p.caption,
        uploadedAt: nowIso,
        uploadedBySquadName: currentSquad.name,
        stage: statusResult === 'CONCLUIDA' ? 'FINALIZACAO' : 'DURANTE_ATENDIMENTO'
      }));

      const updated = await recordAttendance(
        occurrence.id,
        {
          squadId: currentSquad.id,
          squadName: currentSquad.name,
          callSign: currentSquad.callSign,
          commanderName: `${currentUser.rank} ${currentUser.name}`,
          shiftInfo: currentSquad.currentShift,
          startedAt: occurrence.lastAttendanceAt || new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          finishedAt: nowIso,
          statusResult,
          actionTaken,
          unresolvedReason: statusResult === 'PENDENTE' ? unresolvedReason : undefined,
          unresolvedDetails: statusResult === 'PENDENTE' ? unresolvedDetails : undefined,
          equipmentUsed: selectedEquipment,
          photos: attendancePhotos
        },
        currentUser
      );

      onSuccess(updated);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro ao salvar registro de atendimento no Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white text-red-800 text-xs px-2 py-0.5 rounded font-mono font-extrabold shadow-sm">
                {occurrence.protocol}
              </span>
              <h3 className="font-extrabold text-white text-base">Registrar Atendimento em Campo</h3>
            </div>
            <p className="text-xs text-red-100 mt-0.5 font-medium">
              VTR: <strong className="text-white font-mono">{currentSquad.callSign}</strong> • Pelotão: <strong className="text-white">{currentSquad.unitText || currentSquad.name}</strong> • Cmt: <strong className="text-white">{currentSquad.commanderName || `${currentUser.rank} ${currentUser.name}`}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-800 bg-slate-50">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Ocorrência Info Resumida */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1 shadow-sm">
            <div className="font-bold text-slate-900">📍 {occurrence.address} - {occurrence.neighborhood}, {occurrence.city}</div>
            <div className="text-slate-600 line-clamp-2">{occurrence.description}</div>
          </div>

          {/* DADOS DE RESPONSABILIDADE OPERACIONAL (CG vs PREENCHIDO POR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-100/90 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                ⭐ Comandante da Guarnição (CG)
              </span>
              <span className="font-extrabold text-slate-800">
                {occurrence.cgGuarnicaoDespachoName || currentSquad.commanderName || 'Comandante da VTR'}
              </span>
              <span className="text-[10px] text-slate-700">
                Snapshot capturado no despacho da viatura {currentSquad.callSign}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                ✍️ Preenchido por (Militar Autenticado)
              </span>
              <span className="font-extrabold text-slate-800">
                {currentUser.rank} {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-700 font-mono">
                Matrícula: {currentUser.registrationNumber || 'N/D'} (Não editável)
              </span>
            </div>
          </div>

          {/* DESFECHO DO ATENDIMENTO (BIG BUTTONS) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Desfecho do Atendimento no Local *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatusResult('CONCLUIDA')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                  statusResult === 'CONCLUIDA'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    1. Concluída
                  </span>
                  {statusResult === 'CONCLUIDA' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Corte, poda ou vistoria totalmente finalizados. Local seguro e desobstruído.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStatusResult('PENDENTE')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                  statusResult === 'PENDENTE'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    2. Não Concluída (Pendente)
                  </span>
                  {statusResult === 'PENDENTE' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Continua ativa para o próximo turno assumir. Obrigatório informar motivo.
                </p>
              </button>
            </div>
          </div>

          {/* SE PENDENTE -> SELEÇÃO OBRIGATÓRIA DE MOTIVO */}
          {statusResult === 'PENDENTE' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Motivo Obrigatório da Não Conclusão *</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {UNRESOLVED_REASONS.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                      unresolvedReason === r.value
                        ? 'bg-amber-100 border-amber-500 text-amber-950 font-medium'
                        : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="unresolvedReason"
                      value={r.value}
                      checked={unresolvedReason === r.value}
                      onChange={() => setUnresolvedReason(r.value)}
                      className="mt-0.5 text-amber-700 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{r.label}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Detalhamento Operacional para o Próximo Turno *
                </label>
                <textarea
                  rows={2}
                  value={unresolvedDetails}
                  onChange={(e) => setUnresolvedDetails(e.target.value)}
                  placeholder="Ex: Aberto protocolo 8923 com a CEEE para desenergizar a linha às 09h. Local isolado com fita zebrada. Próxima guarnição deve levar motosserra pesada."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-amber-600 focus:border-amber-600 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>
          )}

          {/* O QUE FOI FEITO */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Histórico conforme E-193 *
            </label>
            <textarea
              rows={3}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Descreva o histórico operacional conforme registro no e-193 (ex: Isolamento de área, corte de galhos com motosserra, retirada de galhada da via, orientação ao morador...)"
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:ring-1 focus:ring-red-600 focus:border-red-600 placeholder:text-slate-400 shadow-sm"
              required
            />
          </div>

          {/* EQUIPAMENTOS UTILIZADOS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              Equipamentos Empregados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EQUIPMENT.map(eq => {
                const active = selectedEquipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'bg-red-800 border-red-900 text-white font-bold shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{eq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* UPLOAD DE ATÉ 3 FOTOS POR ATENDIMENTO */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" />
                  Fotos do Atendimento ({photos.length}/3)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Anexe até 3 fotos do serviço (corte, árvore, risco ou fiação).
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
                    className="bg-red-800 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Câmera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Galeria</span>
                  </button>
                </div>
              )}
            </div>

            {isProcessingPhoto && (
              <div className="py-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                <span>Processando e compactando imagem com carimbo operacional...</span>
              </div>
            )}

            {photos.length === 0 && !isProcessingPhoto && (
              <div className="py-5 border-2 border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500 bg-slate-50">
                <ImageIcon className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                <span>Nenhuma foto anexada ainda. Clique em Câmera ou Galeria acima.</span>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {photos.map((p, idx) => (
                  <div key={p.id} className="relative group bg-slate-100 border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={p.url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-28 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer shadow"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 bg-white border-t border-slate-200">
                      <input
                        type="text"
                        value={p.caption}
                        onChange={(e) => updatePhotoCaption(idx, e.target.value)}
                        placeholder="Legenda da foto..."
                        className="w-full bg-slate-50 text-[10px] text-slate-800 px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botoes de Salvar */}
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
              className={`px-5 py-2.5 rounded-lg text-xs font-extrabold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                statusResult === 'CONCLUIDA'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{statusResult === 'CONCLUIDA' ? 'Finalizar e Concluir Ocorrência' : 'Salvar e Repassar para Próximo Turno'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
