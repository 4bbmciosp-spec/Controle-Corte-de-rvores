import React, { useState, useEffect } from 'react';
import { 
  getAllMilitares, 
  saveOrUpdateMilitar, 
  deleteMilitar, 
  resetMilitarPassword, 
  MilitarUser 
} from '../services/authService';
import { Platoon, Squad, User } from '../types';
import { 
  X, 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Truck, 
  Radio, 
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';

interface MilitaryManagementModalProps {
  platoons: Platoon[];
  squads: Squad[];
  currentUser: User;
  onClose: () => void;
  onMilitaryUpdated?: () => void;
}

const POSTOS_GRADUACOES = [
  'CEL QOEM',
  'TEN CEL QOEM',
  'MAJ QOEM',
  'CAP QOEM',
  '1º TEN QOEG',
  '2º TEN QOEG',
  'ASP OF',
  '1º SGT',
  '2º SGT',
  '3º SGT',
  'CB',
  'SD'
];

export const MilitaryManagementModal: React.FC<MilitaryManagementModalProps> = ({
  platoons,
  squads,
  currentUser,
  onClose,
  onMilitaryUpdated,
}) => {
  const [militares, setMilitares] = useState<MilitarUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerfil, setSelectedPerfil] = useState<'TODOS' | 'COBOM' | 'GUARNICAO'>('TODOS');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form de Edição / Cadastro
  const [isEditing, setIsEditing] = useState(false);
  const [editMilitar, setEditMilitar] = useState<Partial<MilitarUser> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadMilitares = async () => {
    setLoading(true);
    try {
      const list = await getAllMilitares();
      setMilitares(list);
    } catch (e) {
      console.error('Erro ao carregar militares:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilitares();
  }, []);

  const handleStartCreate = () => {
    setIsNew(true);
    setEditMilitar({
      matricula: '',
      nome_guerra: '',
      posto_graduacao: 'SD',
      perfil: 'GUARNICAO',
      pelotao_id: platoons[0]?.id || 'plat-1',
      guarnicao_id: squads[0]?.id || 'squad-abt-1496',
      funcao_na_guarnicao: 'COMBATENTE',
      is_comandante: false,
      senha_temporaria: true,
    });
    setIsEditing(true);
  };

  const handleStartEdit = (m: MilitarUser) => {
    setIsNew(false);
    setEditMilitar({ ...m });
    setIsEditing(true);
  };

  const handleSaveMilitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMilitar) return;

    if (!editMilitar.matricula?.trim()) {
      setFeedback({ type: 'error', message: 'Informe a matrícula funcional do militar.' });
      return;
    }
    if (!editMilitar.nome_guerra?.trim()) {
      setFeedback({ type: 'error', message: 'Informe o nome de guerra do militar.' });
      return;
    }

    const cleanMatricula = editMilitar.matricula.replace(/\D/g, '').trim();

    const payload: MilitarUser = {
      id: editMilitar.id || `mil-${cleanMatricula}`,
      matricula: cleanMatricula,
      nome_guerra: editMilitar.nome_guerra.trim().toUpperCase(),
      posto_graduacao: editMilitar.posto_graduacao || 'SD',
      perfil: (editMilitar.perfil || 'GUARNICAO') as 'COBOM' | 'GUARNICAO',
      pelotao_id: editMilitar.pelotao_id,
      guarnicao_id: editMilitar.guarnicao_id,
      funcao_na_guarnicao: editMilitar.funcao_na_guarnicao?.trim().toUpperCase() || 'COMBATENTE',
      is_comandante: Boolean(editMilitar.is_comandante),
      senha_temporaria: isNew ? true : Boolean(editMilitar.senha_temporaria),
      email: `${cleanMatricula}@4bbm.cbm`,
    };

    await saveOrUpdateMilitar(payload);
    await loadMilitares();
    if (onMilitaryUpdated) onMilitaryUpdated();
    setIsEditing(false);
    setEditMilitar(null);
    setFeedback({
      type: 'success',
      message: `Militar ${payload.posto_graduacao} ${payload.nome_guerra} salvo com sucesso no banco!`
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteMilitar = async (m: MilitarUser) => {
    if (confirm(`Atenção: Deseja realmente remover o militar ${m.posto_graduacao} ${m.nome_guerra} (Matrícula ${m.matricula}) do sistema e do banco de dados?`)) {
      await deleteMilitar(m.matricula);
      await loadMilitares();
      if (onMilitaryUpdated) onMilitaryUpdated();
      setFeedback({
        type: 'success',
        message: `Militar ${m.posto_graduacao} ${m.nome_guerra} removido do sistema.`
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleResetPassword = async (m: MilitarUser) => {
    const last4 = m.matricula.slice(-4);
    if (confirm(`Deseja redefinir a senha do militar ${m.posto_graduacao} ${m.nome_guerra} para o padrão (${last4}cbm)?\nO militar será obrigado a definir uma nova senha no próximo acesso.`)) {
      await resetMilitarPassword(m.matricula);
      await loadMilitares();
      if (onMilitaryUpdated) onMilitaryUpdated();
      setFeedback({
        type: 'success',
        message: `Senha do militar ${m.nome_guerra} redefinida para ${last4}cbm!`
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredMilitares = militares.filter(m => {
    const matchesSearch = 
      m.nome_guerra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.matricula.includes(searchTerm) ||
      m.posto_graduacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.funcao_na_guarnicao && m.funcao_na_guarnicao.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPerfil = selectedPerfil === 'TODOS' || m.perfil === selectedPerfil;

    return matchesSearch && matchesPerfil;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Gestão de Efetivo & Militares</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                  Exclusivo COBOM
                </span>
              </div>
              <p className="text-xs text-red-200">
                Cadastro, edição de perfis, alteração de postos e reset de senhas do 4º BBM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 border-b ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome de guerra, matrícula ou graduação..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
              <select
                value={selectedPerfil}
                onChange={(e) => setSelectedPerfil(e.target.value as any)}
                className="py-2 px-3 text-xs border border-slate-300 rounded-lg font-bold text-slate-700 bg-white"
              >
                <option value="TODOS">Todos os Perfis</option>
                <option value="COBOM">Apenas COBOM</option>
                <option value="GUARNICAO">Apenas Guarnições</option>
              </select>
            </div>

            <button
              onClick={handleStartCreate}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Cadastrar Militar</span>
            </button>
          </div>

          {/* Form de Edição / Cadastro (Modal Inline) */}
          {isEditing && editMilitar && (
            <form onSubmit={handleSaveMilitar} className="p-5 bg-slate-50 border-2 border-red-200 rounded-xl space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-red-700" />
                  <span>{isNew ? 'Cadastrar Novo Militar' : `Editando Militar: ${editMilitar.nome_guerra}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditMilitar(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matrícula Funcional *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isNew}
                    value={editMilitar.matricula || ''}
                    onChange={(e) => setEditMilitar({ ...editMilitar, matricula: e.target.value })}
                    placeholder="Ex: 3177360"
                    className="w-full p-2 text-xs border border-slate-300 rounded font-mono font-bold uppercase bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Posto / Graduação *
                  </label>
                  <select
                    value={editMilitar.posto_graduacao || 'SD'}
                    onChange={(e) => setEditMilitar({ ...editMilitar, posto_graduacao: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold bg-white"
                  >
                    {POSTOS_GRADUACOES.map(pg => (
                      <option key={pg} value={pg}>{pg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome de Guerra *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMilitar.nome_guerra || ''}
                    onChange={(e) => setEditMilitar({ ...editMilitar, nome_guerra: e.target.value.toUpperCase() })}
                    placeholder="Ex: SILVA PAZ"
                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold uppercase bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Perfil de Acesso no Sistema *
                  </label>
                  <select
                    value={editMilitar.perfil || 'GUARNICAO'}
                    onChange={(e) => setEditMilitar({ ...editMilitar, perfil: e.target.value as any })}
                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold bg-white"
                  >
                    <option value="GUARNICAO">GUARNICAO (Viatura em Campo)</option>
                    <option value="COBOM">COBOM (Central de Operações / Administrador)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pelotão
                  </label>
                  <select
                    value={editMilitar.pelotao_id || platoons[0]?.id}
                    onChange={(e) => setEditMilitar({ ...editMilitar, pelotao_id: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-800"
                  >
                    {platoons.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Guarnição / Viatura Base
                  </label>
                  <select
                    value={editMilitar.guarnicao_id || ''}
                    onChange={(e) => setEditMilitar({ ...editMilitar, guarnicao_id: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="">Nenhuma / COBOM</option>
                    {squads.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.callSign})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Função Operacional
                </label>
                <input
                  type="text"
                  value={editMilitar.funcao_na_guarnicao || ''}
                  onChange={(e) => setEditMilitar({ ...editMilitar, funcao_na_guarnicao: e.target.value.toUpperCase() })}
                  placeholder="Ex: COMANDANTE DE GUARNIÇÃO, COV / CONDUTOR, OPERADOR COBOM"
                  className="w-full p-2 text-xs border border-slate-300 rounded uppercase bg-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditMilitar(null); }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Militar no Banco</span>
                </button>
              </div>
            </form>
          )}

          {/* Listagem de Militares */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              Carregando dados do efetivo...
            </div>
          ) : filteredMilitares.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium border border-dashed rounded-xl p-8">
              Nenhum militar encontrado com os filtros informados.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Graduação & Nome</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3">Função / Pelotão</th>
                    <th className="p-3 text-right">Ações COBOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMilitares.map((m) => {
                    const platoon = platoons.find(p => p.id === m.pelotao_id);
                    const squad = squads.find(s => s.id === m.guarnicao_id);
                    const isCobomPerfil = m.perfil === 'COBOM';

                    return (
                      <tr key={m.matricula} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-mono">
                              {m.posto_graduacao}
                            </span>
                            <span>{m.nome_guerra}</span>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-slate-600 font-semibold">
                          {m.matricula}
                        </td>

                        <td className="p-3">
                          {isCobomPerfil ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200">
                              <Radio className="w-3 h-3 text-red-600" />
                              COBOM 193
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              <Truck className="w-3 h-3 text-blue-600" />
                              Guarnição
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-slate-600 text-[11px]">
                          <div className="font-semibold text-slate-800">{m.funcao_na_guarnicao || 'COMBATENTE'}</div>
                          <div className="text-slate-400 text-[10px]">
                            {squad ? squad.name : platoon?.name || '4º BBM'}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetPassword(m)}
                              title="Resetar senha para o padrão e forçar alteração"
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded border border-amber-200 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(m)}
                              title="Editar dados do militar"
                              className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-300 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMilitar(m)}
                              title="Excluir militar do sistema"
                              className="p-1.5 text-red-700 hover:text-red-900 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono text-[11px]">Total: {militares.length} militares registrados no 4º BBM</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
