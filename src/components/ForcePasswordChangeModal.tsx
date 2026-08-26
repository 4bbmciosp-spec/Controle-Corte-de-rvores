import React, { useState } from 'react';
import { updateMilitarPassword, MilitarUser } from '../services/authService';
import { 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface ForcePasswordChangeModalProps {
  militar: MilitarUser;
  onPasswordChanged: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  militar,
  onPasswordChanged,
}) => {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (novaSenha.length < 6) {
      setErrorMsg('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErrorMsg('A confirmação da senha não confere com a nova senha digitada.');
      return;
    }

    // Check if new password is just the default password
    const last4 = militar.matricula.slice(-4);
    if (novaSenha.toLowerCase() === `${last4}cbm`.toLowerCase()) {
      setErrorMsg('A nova senha não pode ser igual à senha provisória padrão.');
      return;
    }

    setLoading(true);
    const res = await updateMilitarPassword(novaSenha, militar.matricula);
    setLoading(false);

    if (res.success) {
      onPasswordChanged();
    } else {
      setErrorMsg(res.error || 'Erro ao atualizar a senha no Supabase.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-300 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 shadow-inner mb-3">
            <KeyRound className="w-8 h-8 text-amber-200" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">
            Definição Obrigatória de Senha
          </h2>
          <p className="text-xs text-amber-100 font-medium mt-0.5">
            Primeiro Acesso Detectado • Segurança da Conta Operacional
          </p>
        </div>

        {/* Militar Details */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Militar Identificado</span>
              <strong className="text-slate-900 font-extrabold text-sm">
                {militar.posto_graduacao} {militar.nome_guerra}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Matrícula</span>
              <span className="font-mono font-bold text-red-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {militar.matricula}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Por diretriz de segurança do CBMRS, sua senha provisória deve ser substituída por uma senha pessoal e intransferível antes de prosseguir ao sistema.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Atenção:</strong>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nova Senha (Mínimo 6 dígitos)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite sua nova senha"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Atualizando Senha no Supabase...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Gravar Nova Senha e Acessar</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
