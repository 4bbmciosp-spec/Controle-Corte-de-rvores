import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface MilitarUser {
  id: string; // uuid PK da tabela militares
  matricula: string;
  nome_guerra: string;
  posto_graduacao: string;
  perfil: 'COBOM' | 'GUARNICAO' | 'PELOTAO';
  squad_atual_id?: string | null;
  platoon_atual_id?: string | null;
  auth_user_id?: string | null;
  senha_temporaria: boolean;
  email?: string;
  // Campos de compatibilidade com interfaces do app
  pelotao_id?: string;
  guarnicao_id?: string;
  funcao_na_guarnicao?: string;
  is_comandante?: boolean;
}

export interface AuthState {
  user: MilitarUser | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Formata uma matrícula no padrão interno oficial do 4º BBM: {matricula}@4bbm.cbm
 */
export const formatMatriculaEmail = (matricula: string): string => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  return `${cleanMatricula}@4bbm.cbm`;
};

/**
 * Autentica o militar via Supabase Auth usando sua matrícula e senha.
 * SEM fallback local ou dados simulados.
 */
export const loginWithMatricula = async (
  matricula: string,
  senha: string
): Promise<{ success: boolean; requiresPasswordChange?: boolean; militar?: MilitarUser; error?: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Configuração do Supabase não encontrada no ambiente.' };
    }

    const cleanMatricula = matricula.replace(/\D/g, '').trim();
    if (!cleanMatricula) {
      return { success: false, error: 'Por favor, informe a matrícula do militar.' };
    }

    if (!senha) {
      return { success: false, error: 'Por favor, informe a senha de acesso.' };
    }

    const email = formatMatriculaEmail(cleanMatricula);

    // 1. Autentica no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (authError || !authData.user) {
      const errMsg = authError?.message?.includes('Invalid login credentials')
        ? 'Matrícula ou senha incorretos. Verifique suas credenciais do CBMRS.'
        : authError?.message || 'Falha na autenticação com o Supabase.';
      return { success: false, error: errMsg };
    }

    // 2. Busca o registro do militar na tabela 'militares' usando apenas colunas reais do schema
    let { data: militarData, error: militarError } = await supabase
      .from('militares')
      .select('id, matricula, posto_graduacao, nome_guerra, auth_user_id, created_at, perfil, squad_atual_id, platoon_atual_id, senha_temporaria')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    // Se não encontrou por auth_user_id, busca por matrícula
    if (!militarData) {
      const { data: byMatricula, error: matErr } = await supabase
        .from('militares')
        .select('id, matricula, posto_graduacao, nome_guerra, auth_user_id, created_at, perfil, squad_atual_id, platoon_atual_id, senha_temporaria')
        .eq('matricula', cleanMatricula)
        .maybeSingle();

      if (matErr) {
        return { success: false, error: `Erro ao buscar dados do militar: ${matErr.message}` };
      }
      militarData = byMatricula;

      // Se encontrado por matrícula mas sem auth_user_id preenchido, atualiza
      if (militarData && !militarData.auth_user_id) {
        await supabase
          .from('militares')
          .update({ auth_user_id: authData.user.id })
          .eq('matricula', cleanMatricula);
      }
    }

    if (militarError && !militarData) {
      return { success: false, error: `Erro ao consultar militar no banco: ${militarError.message}` };
    }

    if (!militarData) {
      return { success: false, error: 'Registro do militar não encontrado na tabela de efetivo.' };
    }

    const requiresPasswordChange = Boolean(militarData.senha_temporaria);

    const militar: MilitarUser = {
      id: militarData.id,
      matricula: militarData.matricula,
      nome_guerra: militarData.nome_guerra,
      posto_graduacao: militarData.posto_graduacao,
      perfil: militarData.perfil as 'COBOM' | 'GUARNICAO' | 'PELOTAO',
      squad_atual_id: militarData.squad_atual_id,
      platoon_atual_id: militarData.platoon_atual_id,
      auth_user_id: militarData.auth_user_id || authData.user.id,
      senha_temporaria: requiresPasswordChange,
      email: authData.user.email,
      pelotao_id: militarData.platoon_atual_id || undefined,
      guarnicao_id: militarData.squad_atual_id || undefined,
      funcao_na_guarnicao: militarData.perfil === 'COBOM' ? 'OPERADOR COBOM' : 'COMBATENTE',
      is_comandante: militarData.posto_graduacao.includes('SGT') || militarData.posto_graduacao.includes('TEN') || militarData.posto_graduacao.includes('CAP'),
    };

    return {
      success: true,
      requiresPasswordChange,
      militar,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
};

/**
 * Atualiza a senha do militar autenticado no Supabase Auth e desmarca a flag senha_temporaria em 'militares'.
 * SEM fallback local.
 */
export const updateMilitarPassword = async (
  novaSenha: string,
  matricula: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (novaSenha.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado.' };
    }

    // 1. Atualiza a senha no Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (authError) {
      return { success: false, error: `Falha ao atualizar senha: ${authError.message}` };
    }

    // 2. Atualiza a coluna senha_temporaria na tabela 'militares'
    const cleanMatricula = matricula.replace(/\D/g, '').trim();
    if (cleanMatricula) {
      const { error: dbError } = await supabase
        .from('militares')
        .update({ senha_temporaria: false })
        .eq('matricula', cleanMatricula);

      if (dbError) {
        return { success: false, error: `Senha alterada, mas falha ao atualizar flag no banco: ${dbError.message}` };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
};

/**
 * Obtém a sessão ativa oficial no Supabase e recupera o militar através do auth_user_id (FK oficial).
 */
export const getCurrentMilitar = async (): Promise<MilitarUser | null> => {
  try {
    if (!isSupabaseConfigured()) return null;

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }

    // Busca o militar pela FK auth_user_id
    let { data: militarData, error: militarError } = await supabase
      .from('militares')
      .select('id, matricula, posto_graduacao, nome_guerra, auth_user_id, created_at, perfil, squad_atual_id, platoon_atual_id, senha_temporaria')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (!militarData && session.user.email) {
      const matriculaFromEmail = session.user.email.replace('@4bbm.cbm', '').trim();
      const { data: byMat } = await supabase
        .from('militares')
        .select('id, matricula, posto_graduacao, nome_guerra, auth_user_id, created_at, perfil, squad_atual_id, platoon_atual_id, senha_temporaria')
        .eq('matricula', matriculaFromEmail)
        .maybeSingle();
      militarData = byMat;
    }

    if (militarError || !militarData) {
      return null;
    }

    const requiresPasswordChange = Boolean(militarData.senha_temporaria);

    return {
      id: militarData.id,
      matricula: militarData.matricula,
      nome_guerra: militarData.nome_guerra,
      posto_graduacao: militarData.posto_graduacao,
      perfil: militarData.perfil as 'COBOM' | 'GUARNICAO' | 'PELOTAO',
      squad_atual_id: militarData.squad_atual_id,
      platoon_atual_id: militarData.platoon_atual_id,
      auth_user_id: militarData.auth_user_id || session.user.id,
      senha_temporaria: requiresPasswordChange,
      email: session.user.email,
      pelotao_id: militarData.platoon_atual_id || undefined,
      guarnicao_id: militarData.squad_atual_id || undefined,
      funcao_na_guarnicao: militarData.perfil === 'COBOM' ? 'OPERADOR COBOM' : 'COMBATENTE',
      is_comandante: militarData.posto_graduacao.includes('SGT') || militarData.posto_graduacao.includes('TEN') || militarData.posto_graduacao.includes('CAP'),
    };
  } catch (err) {
    console.error('Erro ao recuperar militar autenticado no Supabase:', err);
    return null;
  }
};

/**
 * Encerra a sessão no Supabase Auth e remove quaisquer dados residuais.
 */
export const logoutMilitar = async (): Promise<void> => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Erro ao efetuar signOut no Supabase:', err);
  }
};

/**
 * Busca todos os militares cadastrados no Supabase.
 */
export const getAllMilitares = async (): Promise<MilitarUser[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }

  const { data, error } = await supabase
    .from('militares')
    .select('id, matricula, posto_graduacao, nome_guerra, auth_user_id, created_at, perfil, squad_atual_id, platoon_atual_id, senha_temporaria')
    .order('nome_guerra', { ascending: true });

  if (error) {
    throw new Error(`Falha ao buscar militares do Supabase: ${error.message}`);
  }

  if (!data) return [];

  return data.map(row => ({
    id: row.id,
    matricula: row.matricula,
    nome_guerra: row.nome_guerra,
    posto_graduacao: row.posto_graduacao,
    perfil: row.perfil as 'COBOM' | 'GUARNICAO' | 'PELOTAO',
    squad_atual_id: row.squad_atual_id,
    platoon_atual_id: row.platoon_atual_id,
    auth_user_id: row.auth_user_id,
    senha_temporaria: Boolean(row.senha_temporaria),
    email: `${row.matricula}@4bbm.cbm`,
    pelotao_id: row.platoon_atual_id || undefined,
    guarnicao_id: row.squad_atual_id || undefined,
    funcao_na_guarnicao: row.perfil === 'COBOM' ? 'OPERADOR COBOM' : 'COMBATENTE',
    is_comandante: row.posto_graduacao.includes('SGT') || row.posto_graduacao.includes('TEN') || row.posto_graduacao.includes('CAP'),
  }));
};

/**
 * Salva ou Atualiza um militar no banco Supabase (Exclusivo COBOM)
 */
export const saveOrUpdateMilitar = async (militar: Partial<MilitarUser> & { matricula: string; nome_guerra: string; posto_graduacao: string; perfil: 'COBOM' | 'GUARNICAO' | 'PELOTAO' }): Promise<boolean> => {
  const cleanMatricula = militar.matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) throw new Error('Matrícula inválida.');

  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const payload = {
    matricula: cleanMatricula,
    nome_guerra: militar.nome_guerra,
    posto_graduacao: militar.posto_graduacao,
    perfil: militar.perfil,
    squad_atual_id: militar.squad_atual_id || militar.guarnicao_id || null,
    platoon_atual_id: militar.platoon_atual_id || militar.pelotao_id || null,
    senha_temporaria: militar.senha_temporaria !== undefined ? Boolean(militar.senha_temporaria) : true,
  };

  const { error } = await supabase
    .from('militares')
    .upsert(payload, { onConflict: 'matricula' });

  if (error) {
    throw new Error(`Falha ao salvar militar no Supabase: ${error.message}`);
  }

  return true;
};

/**
 * Exclui um militar no Supabase (Exclusivo COBOM)
 */
export const deleteMilitar = async (matricula: string): Promise<boolean> => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) throw new Error('Matrícula inválida.');

  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const { error } = await supabase
    .from('militares')
    .delete()
    .eq('matricula', cleanMatricula);

  if (error) {
    throw new Error(`Falha ao excluir militar no Supabase: ${error.message}`);
  }

  return true;
};

/**
 * Reseta a flag senha_temporaria para true no Supabase (força troca de senha)
 */
export const resetMilitarPassword = async (matricula: string): Promise<boolean> => {
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) throw new Error('Matrícula inválida.');

  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const { error } = await supabase
    .from('militares')
    .update({ senha_temporaria: true })
    .eq('matricula', cleanMatricula);

  if (error) {
    throw new Error(`Falha ao resetar senha no Supabase: ${error.message}`);
  }

  return true;
};
