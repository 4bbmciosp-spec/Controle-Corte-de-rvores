import { createClient } from '@supabase/supabase-js';

// Supabase credentials (uses env vars if set, otherwise falls back to project credentials)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uibguglpgomydpolotfx.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eAdb82nfoo53shqAWvpztQ_lDXNUbW4';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project'));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Helper to test the connection to Supabase
 */
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; data?: unknown }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase URL ou chave pública não configurada.' };
    }

    // Query normal (não HEAD) para garantir que o corpo do erro venha preenchido
    const { data, error, status } = await supabase
      .from('militares')
      .select('matricula')
      .limit(1);

    if (error) {
      const isPermissionIssue =
        error.code === 'PGRST301' ||
        error.code === '42501' ||
        status === 401 ||
        (error.message ?? '').toLowerCase().includes('permission denied');

      if (isPermissionIssue) {
        return {
          success: true,
          message: 'Conectado com sucesso ao Supabase! (RLS ativo — acesso anônimo bloqueado corretamente)',
          data: { rlsProtected: true },
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso!',
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Falha na conexão: ${errorMsg}` };
  }
};
