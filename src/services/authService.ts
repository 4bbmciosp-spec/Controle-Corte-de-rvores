import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface MilitarUser {
  id: string; // auth.uid
  matricula: string;
  nome_guerra: string;
  posto_graduacao: string;
  perfil: 'COBOM' | 'GUARNICAO';
  pelotao_id?: string;
  guarnicao_id?: string;
  funcao_na_guarnicao?: string;
  is_comandante?: boolean;
  senha_temporaria?: boolean;
  email?: string;
}

export interface AuthState {
  user: MilitarUser | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Format a matricula into the standard internal email format: {matricula}@4bbm.cbm
 */
export const formatMatriculaEmail = (matricula: string): string => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  return `${cleanMatricula}@4bbm.cbm`;
};

/**
 * Authenticate militar using matricula and password via Supabase Auth
 */
export const loginWithMatricula = async (
  matricula: string,
  senha: string
): Promise<{ success: boolean; requiresPasswordChange?: boolean; militar?: MilitarUser; error?: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado no ambiente.' };
    }

    const cleanMatricula = matricula.replace(/\D/g, '').trim();
    if (!cleanMatricula) {
      return { success: false, error: 'Por favor, informe a matrícula do militar.' };
    }

    if (!senha) {
      return { success: false, error: 'Por favor, informe a senha de acesso.' };
    }

    const email = formatMatriculaEmail(cleanMatricula);

    // 1. Try Supabase Auth first
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (!authError && authData.user) {
          // Fetch militar record from 'militares' table
          const { data: militarData, error: militarError } = await supabase
            .from('militares')
            .select('*')
            .eq('matricula', cleanMatricula)
            .maybeSingle();

          if (militarError) {
            console.warn('Aviso ao buscar militar na tabela:', militarError.message);
          }

          const requiresPasswordChange = Boolean(
            militarData?.senha_temporaria || 
            authData.user.user_metadata?.senha_temporaria
          );

          const militar: MilitarUser = {
            id: authData.user.id,
            matricula: cleanMatricula,
            nome_guerra: militarData?.nome_guerra || authData.user.user_metadata?.nome_guerra || `Militar ${cleanMatricula}`,
            posto_graduacao: militarData?.posto_graduacao || authData.user.user_metadata?.posto_graduacao || 'SD',
            perfil: (militarData?.perfil || authData.user.user_metadata?.perfil || 'GUARNICAO') as 'COBOM' | 'GUARNICAO',
            pelotao_id: militarData?.pelotao_id,
            guarnicao_id: militarData?.guarnicao_id,
            funcao_na_guarnicao: militarData?.funcao_na_guarnicao || 'COMBATENTE',
            is_comandante: militarData?.is_comandante || false,
            senha_temporaria: requiresPasswordChange,
            email: authData.user.email,
          };

          return {
            success: true,
            requiresPasswordChange,
            militar,
          };
        }
      } catch (e) {
        console.warn('Tentativa com Supabase Auth retornou erro, verificando escala local:', e);
      }
    }

    // 2. Fallback: Verificação segura para primeiro teste (caso o usuário no Supabase Auth ainda não tenha sido cadastrado na nuvem)
    // Permite testar o sistema com a senha padrão {4_ultimos_digitos}cbm
    const last4 = cleanMatricula.slice(-4);
    const defaultPassword = `${last4}cbm`.toLowerCase();

    // Map of recognized 4º BBM militars from e-193 scale for immediate verification
    const rosterMilitares: Record<string, { nome: string; posto: string; perfil: 'COBOM' | 'GUARNICAO'; pelotao: string; funcao: string }> = {
      '3177360': { nome: 'LUTIERO', posto: 'SD', perfil: 'COBOM', pelotao: 'plat-cobom', funcao: 'OPERADOR COBOM' },
      '3156079': { nome: 'GIOVANI', posto: '2º SGT', perfil: 'COBOM', pelotao: 'plat-cobom', funcao: 'OPERADOR COBOM' },
      '3137341': { nome: 'DOUGLAS', posto: 'SD', perfil: 'COBOM', pelotao: 'plat-cobom', funcao: 'OPERADOR COBOM' },
      '2693038': { nome: 'GONÇALVES', posto: '1º SGT', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'COMANDANTE DE GUARNIÇÃO' },
      '3140687': { nome: 'EVANGELHO', posto: 'SD', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'CHEFE DE LINHA DIREITA' },
      '3706362': { nome: 'GASTÃO', posto: 'SD', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'AUXILIAR DE LINHA DIREITA' },
      '4388240': { nome: 'VIEIRA', posto: 'SD', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'COV / OPERADOR / CONDUTOR' },
      '2682125': { nome: 'SILVA PAZ', posto: '2º SGT', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'COV / OPERADOR / CONDUTOR' },
      '2877384': { nome: 'SIQUEIRA', posto: '2º SGT', perfil: 'GUARNICAO', pelotao: 'plat-1', funcao: 'COV / OPERADOR / CONDUTOR' },
      '2519038': { nome: 'SCHUSTER', posto: '1º SGT', perfil: 'GUARNICAO', pelotao: 'plat-3', funcao: 'COV / OPERADOR / CONDUTOR' },
      '3141551': { nome: 'TATIELI', posto: '1º SGT', perfil: 'GUARNICAO', pelotao: 'plat-3', funcao: 'CHEFE DE LINHA DIREITA' },
      '3705862': { nome: 'REQUIA', posto: 'SD', perfil: 'GUARNICAO', pelotao: 'plat-3', funcao: 'CHEFE DE LINHA ESQUERDA' },
      '2615690': { nome: 'BRUM', posto: '1º SGT', perfil: 'GUARNICAO', pelotao: 'plat-2', funcao: 'CINOTÉCNICO' },
      '2685094': { nome: 'MACHADO', posto: '2º SGT', perfil: 'GUARNICAO', pelotao: 'plat-2', funcao: 'CINOTÉCNICO' },
      '4674260': { nome: 'ULLRICH', posto: 'SD', perfil: 'GUARNICAO', pelotao: 'plat-2', funcao: 'CINOTÉCNICO' },
      '3155331': { nome: 'VASCONCELLOS', posto: '2º SGT', perfil: 'GUARNICAO', pelotao: 'plat-2', funcao: 'MERGULHADOR' },
      '2498110': { nome: 'MEDEIROS', posto: 'CAP QOEM', perfil: 'COBOM', pelotao: 'plat-1', funcao: 'COMANDANTE 1ª CIA / 4º BBM' },
    };

    // Check if custom password was saved in local storage
    const customPassKey = `cbmrs_pwd_${cleanMatricula}`;
    const storedCustomPass = localStorage.getItem(customPassKey);

    const isMatch = storedCustomPass 
      ? (senha === storedCustomPass)
      : (senha.toLowerCase() === defaultPassword);

    if (!isMatch) {
      return { 
        success: false, 
        error: 'Matrícula ou senha incorretos. Caso seja seu primeiro acesso de teste, utilize os 4 últimos dígitos da matrícula seguidos de "cbm" (ex: para 3177360 use 7360cbm).' 
      };
    }

    const militarInfo = rosterMilitares[cleanMatricula] || {
      nome: `Militar ${cleanMatricula}`,
      posto: 'SD',
      perfil: 'GUARNICAO',
      pelotao: 'plat-1',
      funcao: 'COMBATENTE'
    };

    const isFirstAccess = !storedCustomPass;

    const militar: MilitarUser = {
      id: `militar-${cleanMatricula}`,
      matricula: cleanMatricula,
      nome_guerra: militarInfo.nome,
      posto_graduacao: militarInfo.posto,
      perfil: militarInfo.perfil,
      pelotao_id: militarInfo.pelotao,
      funcao_na_guarnicao: militarInfo.funcao,
      is_comandante: militarInfo.funcao.includes('COMANDANTE') || militarInfo.posto.includes('SGT') || militarInfo.posto.includes('CAP'),
      senha_temporaria: isFirstAccess,
      email: `${cleanMatricula}@4bbm.cbm`,
    };

    // Save session locally
    localStorage.setItem('cbmrs_active_session', JSON.stringify(militar));

    return {
      success: true,
      requiresPasswordChange: isFirstAccess,
      militar,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
};

/**
 * Update password (and clear senha_temporaria flag)
 */
export const updateMilitarPassword = async (
  novaSenha: string,
  matricula: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (novaSenha.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.updateUser({
          password: novaSenha,
          data: { senha_temporaria: false },
        });

        const cleanMatricula = matricula.replace(/\D/g, '').trim();
        if (cleanMatricula) {
          await supabase
            .from('militares')
            .update({ senha_temporaria: false })
            .eq('matricula', cleanMatricula);
        }
      } catch (e) {
        console.warn('Supabase updateUser retorno:', e);
      }
    }

    // Persist new password and updated state locally
    const cleanMat = matricula.replace(/\D/g, '').trim();
    if (cleanMat) {
      localStorage.setItem(`cbmrs_pwd_${cleanMat}`, novaSenha);
      const rawSession = localStorage.getItem('cbmrs_active_session');
      if (rawSession) {
        try {
          const sess = JSON.parse(rawSession);
          sess.senha_temporaria = false;
          localStorage.setItem('cbmrs_active_session', JSON.stringify(sess));
        } catch {
          // ignore
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
};

/**
 * Log out current militar
 */
export const logoutMilitar = async (): Promise<void> => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Erro ao deslogar no Supabase:', err);
  } finally {
    localStorage.removeItem('cbmrs_active_session');
  }
};

/**
 * Get the currently authenticated session and profile
 */
export const getCurrentMilitar = async (): Promise<MilitarUser | null> => {
  try {
    // 1. Check Supabase session first
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || '';
          const matriculaFromEmail = email.replace('@4bbm.cbm', '');

          const { data: militarData } = await supabase
            .from('militares')
            .select('*')
            .eq('matricula', matriculaFromEmail)
            .maybeSingle();

          const requiresPasswordChange = Boolean(
            militarData?.senha_temporaria || 
            session.user.user_metadata?.senha_temporaria
          );

          return {
            id: session.user.id,
            matricula: militarData?.matricula || matriculaFromEmail,
            nome_guerra: militarData?.nome_guerra || session.user.user_metadata?.nome_guerra || `Militar ${matriculaFromEmail}`,
            posto_graduacao: militarData?.posto_graduacao || session.user.user_metadata?.posto_graduacao || 'SD',
            perfil: (militarData?.perfil || session.user.user_metadata?.perfil || 'GUARNICAO') as 'COBOM' | 'GUARNICAO',
            pelotao_id: militarData?.pelotao_id,
            guarnicao_id: militarData?.guarnicao_id,
            funcao_na_guarnicao: militarData?.funcao_na_guarnicao || 'COMBATENTE',
            is_comandante: militarData?.is_comandante || false,
            senha_temporaria: requiresPasswordChange,
            email: session.user.email,
          };
        }
      } catch (e) {
        console.warn('Erro ao consultar sessão remota:', e);
      }
    }

    // 2. Check local active session
    const rawSession = localStorage.getItem('cbmrs_active_session');
    if (rawSession) {
      return JSON.parse(rawSession) as MilitarUser;
    }

    return null;
  } catch (err) {
    console.error('Erro ao recuperar militar atual:', err);
    return null;
  }
};

const DEFAULT_ROSTER_MILITARES: MilitarUser[] = [
  { id: 'mil-3177360', matricula: '3177360', nome_guerra: 'LUTIERO', posto_graduacao: 'SD', perfil: 'COBOM', pelotao_id: 'plat-cobom', funcao_na_guarnicao: 'OPERADOR COBOM', is_comandante: false, senha_temporaria: true, email: '3177360@4bbm.cbm' },
  { id: 'mil-3156079', matricula: '3156079', nome_guerra: 'GIOVANI', posto_graduacao: '2º SGT', perfil: 'COBOM', pelotao_id: 'plat-cobom', funcao_na_guarnicao: 'OPERADOR COBOM', is_comandante: false, senha_temporaria: true, email: '3156079@4bbm.cbm' },
  { id: 'mil-3137341', matricula: '3137341', nome_guerra: 'DOUGLAS', posto_graduacao: 'SD', perfil: 'COBOM', pelotao_id: 'plat-cobom', funcao_na_guarnicao: 'OPERADOR COBOM', is_comandante: false, senha_temporaria: true, email: '3137341@4bbm.cbm' },
  { id: 'mil-2498110', matricula: '2498110', nome_guerra: 'MEDEIROS', posto_graduacao: 'CAP QOEM', perfil: 'COBOM', pelotao_id: 'plat-1', funcao_na_guarnicao: 'COMANDANTE 1ª CIA / 4º BBM', is_comandante: true, senha_temporaria: true, email: '2498110@4bbm.cbm' },
  { id: 'mil-2693038', matricula: '2693038', nome_guerra: 'GONÇALVES', posto_graduacao: '1º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1496', funcao_na_guarnicao: 'COMANDANTE DE GUARNIÇÃO', is_comandante: true, senha_temporaria: true, email: '2693038@4bbm.cbm' },
  { id: 'mil-3140687', matricula: '3140687', nome_guerra: 'EVANGELHO', posto_graduacao: 'SD', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1496', funcao_na_guarnicao: 'CHEFE DE LINHA DIREITA', is_comandante: false, senha_temporaria: true, email: '3140687@4bbm.cbm' },
  { id: 'mil-3706362', matricula: '3706362', nome_guerra: 'GASTÃO', posto_graduacao: 'SD', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1496', funcao_na_guarnicao: 'AUXILIAR DE LINHA DIREITA', is_comandante: false, senha_temporaria: true, email: '3706362@4bbm.cbm' },
  { id: 'mil-4388240', matricula: '4388240', nome_guerra: 'VIEIRA', posto_graduacao: 'SD', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1496', funcao_na_guarnicao: 'COV / OPERADOR / CONDUTOR', is_comandante: false, senha_temporaria: true, email: '4388240@4bbm.cbm' },
  { id: 'mil-2682125', matricula: '2682125', nome_guerra: 'SILVA PAZ', posto_graduacao: '2º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1238', funcao_na_guarnicao: 'COV / OPERADOR / CONDUTOR', is_comandante: false, senha_temporaria: true, email: '2682125@4bbm.cbm' },
  { id: 'mil-2877384', matricula: '2877384', nome_guerra: 'SIQUEIRA', posto_graduacao: '2º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-1', guarnicao_id: 'squad-abt-1238', funcao_na_guarnicao: 'COV / OPERADOR / CONDUTOR', is_comandante: false, senha_temporaria: true, email: '2877384@4bbm.cbm' },
  { id: 'mil-2519038', matricula: '2519038', nome_guerra: 'SCHUSTER', posto_graduacao: '1º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-3', guarnicao_id: 'squad-abt-534', funcao_na_guarnicao: 'COV / OPERADOR / CONDUTOR', is_comandante: false, senha_temporaria: true, email: '2519038@4bbm.cbm' },
  { id: 'mil-3141551', matricula: '3141551', nome_guerra: 'TATIELI', posto_graduacao: '1º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-3', guarnicao_id: 'squad-abt-534', funcao_na_guarnicao: 'CHEFE DE LINHA DIREITA', is_comandante: false, senha_temporaria: true, email: '3141551@4bbm.cbm' },
  { id: 'mil-3705862', matricula: '3705862', nome_guerra: 'REQUIA', posto_graduacao: 'SD', perfil: 'GUARNICAO', pelotao_id: 'plat-3', guarnicao_id: 'squad-abt-534', funcao_na_guarnicao: 'CHEFE DE LINHA ESQUERDA', is_comandante: false, senha_temporaria: true, email: '3705862@4bbm.cbm' },
  { id: 'mil-2615690', matricula: '2615690', nome_guerra: 'BRUM', posto_graduacao: '1º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-2', guarnicao_id: 'squad-abc-794', funcao_na_guarnicao: 'CINOTÉCNICO', is_comandante: true, senha_temporaria: true, email: '2615690@4bbm.cbm' },
  { id: 'mil-2685094', matricula: '2685094', nome_guerra: 'MACHADO', posto_graduacao: '2º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-2', guarnicao_id: 'squad-abc-794', funcao_na_guarnicao: 'CINOTÉCNICO', is_comandante: false, senha_temporaria: true, email: '2685094@4bbm.cbm' },
  { id: 'mil-4674260', matricula: '4674260', nome_guerra: 'ULLRICH', posto_graduacao: 'SD', perfil: 'GUARNICAO', pelotao_id: 'plat-2', guarnicao_id: 'squad-abc-794', funcao_na_guarnicao: 'CINOTÉCNICO', is_comandante: false, senha_temporaria: true, email: '4674260@4bbm.cbm' },
  { id: 'mil-3155331', matricula: '3155331', nome_guerra: 'VASCONCELLOS', posto_graduacao: '2º SGT', perfil: 'GUARNICAO', pelotao_id: 'plat-2', guarnicao_id: 'squad-atp-0561', funcao_na_guarnicao: 'MERGULHADOR', is_comandante: false, senha_temporaria: true, email: '3155331@4bbm.cbm' },
];

const STORAGE_MILITARES_KEY = 'cbmrs_militares_roster_v3';

/**
 * Busca todos os militares cadastrados (Supabase com fallback Local)
 */
export const getAllMilitares = async (): Promise<MilitarUser[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('militares')
        .select('*')
        .order('nome_guerra', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: MilitarUser[] = data.map(row => ({
          id: row.id || `mil-${row.matricula}`,
          matricula: row.matricula,
          nome_guerra: row.nome_guerra,
          posto_graduacao: row.posto_graduacao,
          perfil: (row.perfil || 'GUARNICAO') as 'COBOM' | 'GUARNICAO',
          pelotao_id: row.pelotao_id,
          guarnicao_id: row.guarnicao_id,
          funcao_na_guarnicao: row.funcao_na_guarnicao,
          is_comandante: Boolean(row.is_comandante),
          senha_temporaria: Boolean(row.senha_temporaria),
          email: `${row.matricula}@4bbm.cbm`,
        }));
        localStorage.setItem(STORAGE_MILITARES_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Aviso ao consultar lista de militares no Supabase:', e);
    }
  }

  // Fallback Local
  try {
    const raw = localStorage.getItem(STORAGE_MILITARES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  localStorage.setItem(STORAGE_MILITARES_KEY, JSON.stringify(DEFAULT_ROSTER_MILITARES));
  return DEFAULT_ROSTER_MILITARES;
};

/**
 * Salva ou Atualiza um militar (Exclusivo COBOM)
 */
export const saveOrUpdateMilitar = async (militar: MilitarUser): Promise<boolean> => {
  const cleanMatricula = militar.matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) return false;

  const fullMilitar: MilitarUser = {
    ...militar,
    matricula: cleanMatricula,
    email: `${cleanMatricula}@4bbm.cbm`,
    id: militar.id || `mil-${cleanMatricula}`
  };

  // 1. Atualizar Local Storage
  const currentList = await getAllMilitares();
  const index = currentList.findIndex(m => m.matricula === cleanMatricula);
  if (index >= 0) {
    currentList[index] = fullMilitar;
  } else {
    currentList.push(fullMilitar);
  }
  localStorage.setItem(STORAGE_MILITARES_KEY, JSON.stringify(currentList));

  // 2. Atualizar no Supabase
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        matricula: cleanMatricula,
        nome_guerra: fullMilitar.nome_guerra,
        posto_graduacao: fullMilitar.posto_graduacao,
        perfil: fullMilitar.perfil,
        pelotao_id: fullMilitar.pelotao_id || null,
        guarnicao_id: fullMilitar.guarnicao_id || null,
        funcao_na_guarnicao: fullMilitar.funcao_na_guarnicao || null,
        is_comandante: Boolean(fullMilitar.is_comandante),
        senha_temporaria: Boolean(fullMilitar.senha_temporaria),
      };

      await supabase
        .from('militares')
        .upsert(payload, { onConflict: 'matricula' });
    } catch (e) {
      console.warn('Erro ao salvar militar no Supabase:', e);
    }
  }

  return true;
};

/**
 * Exclui um militar (Exclusivo COBOM)
 */
export const deleteMilitar = async (matricula: string): Promise<boolean> => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) return false;

  // 1. Local Storage
  const currentList = await getAllMilitares();
  const filtered = currentList.filter(m => m.matricula !== cleanMatricula);
  localStorage.setItem(STORAGE_MILITARES_KEY, JSON.stringify(filtered));
  localStorage.removeItem(`cbmrs_pwd_${cleanMatricula}`);

  // 2. Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('militares')
        .delete()
        .eq('matricula', cleanMatricula);
    } catch (e) {
      console.warn('Erro ao excluir militar no Supabase:', e);
    }
  }

  return true;
};

/**
 * Reseta a senha de um militar para a padrão ({4_ultimos_digitos}cbm) e força troca no próximo login
 */
export const resetMilitarPassword = async (matricula: string): Promise<boolean> => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) return false;

  localStorage.removeItem(`cbmrs_pwd_${cleanMatricula}`);

  // Marca no roster local
  const currentList = await getAllMilitares();
  const mIndex = currentList.findIndex(m => m.matricula === cleanMatricula);
  if (mIndex >= 0) {
    currentList[mIndex].senha_temporaria = true;
    localStorage.setItem(STORAGE_MILITARES_KEY, JSON.stringify(currentList));
  }

  // Marca no Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('militares')
        .update({ senha_temporaria: true })
        .eq('matricula', cleanMatricula);
    } catch (e) {
      console.warn('Erro ao resetar senha no Supabase:', e);
    }
  }

  return true;
};
