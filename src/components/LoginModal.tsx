import React, { useState, useEffect } from 'react';
import { loginWithMatricula, MilitarUser } from '../services/authService';
import { testSupabaseConnection, isSupabaseConfigured } from '../services/supabaseClient';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Flame, 
  Database,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (militar: MilitarUser, requiresPasswordChange: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Connection testing state (Etapa 2 validation)
  const [connectionStatus, setConnectionStatus] = useState<{
    checking: boolean;
    connected: boolean;
    message: string;
  }>({
    checking: true,
    connected: false,
    message: 'Verificando conexão com o Supabase...',
  });

  const checkConnection = async () => {
    setConnectionStatus({ checking: true, connected: false, message: 'Testando conexão com Supabase...' });
    const res = await testSupabaseConnection();
    setConnectionStatus({
      checking: false,
      connected: res.success,
      message: res.message,
    });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanMat = matricula.replace(/\D/g, '').trim();
    if (!cleanMat) {
      setErrorMsg('Informe sua matrícula do CBMRS.');
      setLoading(false);
      return;
    }

    if (!senha) {
      setErrorMsg('Informe sua senha de acesso.');
      setLoading(false);
      return;
    }

    const res = await loginWithMatricula(cleanMat, senha);
    setLoading(false);

    if (res.success && res.militar) {
      onLoginSuccess(res.militar, Boolean(res.requiresPasswordChange));
    } else {
      setErrorMsg(res.error || 'Erro ao realizar login. Verifique seus dados.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-950 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 shadow-inner mb-3">
            <Flame className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-lg font-black tracking-tight uppercase">
            Corpo de Bombeiros Militar do RS
          </h1>
          <p className="text-xs text-red-200 font-medium mt-0.5">
            4º Batalhão de Bombeiro Militar • Gestão Operacional de Vegetais
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-black/30 border border-white/15 rounded-full text-[11px] font-mono text-amber-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autenticação Oficial de Militares (e-193)</span>
          </div>
        </div>

        {/* Supabase Connection Status Badge (ETAPA 2) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Supabase:</span>
            {connectionStatus.checking ? (
              <span className="text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> Testando...
              </span>
            ) : connectionStatus.connected ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conectado
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1" title={connectionStatus.message}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Falha
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={checkConnection}
            className="text-[10px] text-red-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            title="Re-testar conexão com o banco"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Testar
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Atenção no Login:</strong>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Matrícula do Militar (ID Funcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 3177360"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                autoFocus
                required
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Formato de login interno: <code className="font-mono text-slate-700">{matricula ? `${matricula.replace(/\D/g, '')}@4bbm.cbm` : '{matricula}@4bbm.cbm'}</code>
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha de acesso"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                required
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

          {/* First access hint */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Primeiro Acesso ao Sistema?</strong>
              <p className="mt-0.5 text-amber-800">
                A senha padrão inicial consiste nos <strong>4 últimos dígitos da sua matrícula</strong> acrescidos de <code>cbm</code> (exemplo: para matrícula <code>3177360</code>, utilize <code>7360cbm</code>). A troca é obrigatória no primeiro login.
              </p>
            </div>
          </div>

          {/* Atalhos Rápidos para Teste Operacional */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Atalhos de Acesso Rápido para Teste:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMatricula('3177360');
                  setSenha('7360cbm');
                  setErrorMsg(null);
                }}
                className="p-2 text-left bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 text-slate-800 transition-all cursor-pointer"
              >
                <div className="font-bold text-[11px] text-red-900">SD LUTIERO (COBOM)</div>
                <div className="text-[10px] text-slate-500 font-mono">Mat: 3177360 • 7360cbm</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMatricula('2693038');
                  setSenha('3038cbm');
                  setErrorMsg(null);
                }}
                className="p-2 text-left bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 text-slate-800 transition-all cursor-pointer"
              >
                <div className="font-bold text-[11px] text-red-900">1º SGT GONÇALVES (VTR)</div>
                <div className="text-[10px] text-slate-500 font-mono">Mat: 2693038 • 3038cbm</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Autenticando Militar...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 font-mono">
          4º BBM • Santa Maria / RS • Segurança & RLS Ativos
        </div>

      </div>
    </div>
  );
};
