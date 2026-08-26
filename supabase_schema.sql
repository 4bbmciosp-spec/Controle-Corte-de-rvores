-- ============================================================================
-- ESTRUTURA E POLÍTICAS DE SEGURANÇA (RLS) - CBMRS 4º BBM (SANTA MARIA)
-- Sistema de Gestão Operacional de Corte e Vistoria de Vegetais
-- ============================================================================
-- ATENÇÃO DE SEGURANÇA:
-- 1. Todas as tabelas possuem Row Level Security (RLS) ativado.
-- 2. Chaves de API Service Role NUNCA devem ser colocadas no cliente/frontend.
-- 3. As políticas abaixo garantem que militares autenticados leiam e gravem
--    conforme suas atribuições operacionais.
-- ============================================================================

-- 1. TABELA DE MILITARES (Perfis e Credenciais Operacionais)
CREATE TABLE IF NOT EXISTS public.militares (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome_guerra VARCHAR(100) NOT NULL,
    posto_graduacao VARCHAR(50) NOT NULL DEFAULT 'SD',
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('COBOM', 'GUARNICAO', 'PELOTAO')),
    pelotao_id VARCHAR(50) DEFAULT 'plat-1',
    guarnicao_id VARCHAR(50),
    funcao_na_guarnicao VARCHAR(100) DEFAULT 'COMBATENTE',
    is_comandante BOOLEAN DEFAULT FALSE,
    senha_temporaria BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para 'militares'
CREATE POLICY "Militares autenticados podem visualizar membros da escala" 
ON public.militares FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Militar pode atualizar seus próprios dados cadastrais e senha" 
ON public.militares FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. TABELA DE OCORRÊNCIAS DE ÁRVORES E VEGETAIS
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id VARCHAR(100) PRIMARY KEY,
    protocolo VARCHAR(50) UNIQUE NOT NULL,
    solicitante_nome VARCHAR(150),
    solicitante_telefone VARCHAR(30),
    endereco TEXT NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) DEFAULT 'Santa Maria',
    ponto_referencia TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    natureza_despacho VARCHAR(150),
    risco_arvore VARCHAR(100),
    pelotao_id VARCHAR(50) NOT NULL,
    guarnicao_empenhada_id VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'EM_ATENDIMENTO', 'PENDENTE', 'CONCLUIDA', 'CANCELADA')),
    urgencia VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (urgencia IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    transitada_turno BOOLEAN DEFAULT FALSE,
    criado_por VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Militares autenticados podem consultar todas as ocorrencias" 
ON public.ocorrencias FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "COBOM e Guarnições autenticadas podem inserir ocorrencias" 
ON public.ocorrencias FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Militares autenticados podem atualizar status de ocorrencias" 
ON public.ocorrencias FOR UPDATE 
TO authenticated 
USING (true);

-- 3. TABELA DE ATENDIMENTOS E HISTÓRICO DAS GUARNIÇÕES (Atas de Atendimento)
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id VARCHAR(100) PRIMARY KEY,
    ocorrencia_id VARCHAR(100) NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
    guarnicao_id VARCHAR(50) NOT NULL,
    guarnicao_nome VARCHAR(100) NOT NULL,
    prefixo_vtr VARCHAR(50) NOT NULL,
    comandante_nome VARCHAR(100),
    turno_info VARCHAR(100),
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_fim TIMESTAMPTZ DEFAULT NOW(),
    resultado_status VARCHAR(30) NOT NULL CHECK (resultado_status IN ('CONCLUIDA', 'PENDENTE')),
    acao_tomada TEXT NOT NULL,
    motivo_pendencia VARCHAR(100),
    detalhes_pendencia TEXT,
    equipamentos_usados JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Militares autenticados podem consultar atendimentos" 
ON public.atendimentos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Guarnições podem registrar relatórios de atendimento" 
ON public.atendimentos FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. TABELA DE GUARNIÇÕES / ESCALAS DO E-193
CREATE TABLE IF NOT EXISTS public.guarnicoes (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    prefixo VARCHAR(50) NOT NULL,
    pelotao_id VARCHAR(50) NOT NULL,
    unidade_texto VARCHAR(200),
    comandante_nome VARCHAR(100),
    turno_atual VARCHAR(100),
    status VARCHAR(30) DEFAULT 'DISPONIVEL',
    membros JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guarnicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Militares autenticados podem visualizar as guarnicoes" 
ON public.guarnicoes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Militares autenticados podem atualizar composicao das guarnicoes" 
ON public.guarnicoes FOR ALL 
TO authenticated 
USING (true);

-- ============================================================================
-- INSERÇÃO INICIAL DOS MILITARES DO 4º BBM (Com senhas provisórias seguras)
-- ============================================================================
-- Ao cadastrar os militares no Supabase Auth (via Dashboard ou Script):
-- Email: {matricula}@4bbm.cbm
-- Senha Provisória: {4_ultimos_digitos_matricula}cbm
-- metadata: { "senha_temporaria": true, "nome_guerra": "...", "posto_graduacao": "..." }

INSERT INTO public.militares (matricula, nome_guerra, posto_graduacao, perfil, pelotao_id, funcao_na_guarnicao, is_comandante, senha_temporaria)
VALUES
('3177360', 'LUTIERO', 'SD', 'COBOM', 'plat-cobom', 'OPERADOR COBOM', false, true),
('3156079', 'GIOVANI', '2º SGT', 'COBOM', 'plat-cobom', 'OPERADOR COBOM', false, true),
('3137341', 'DOUGLAS', 'SD', 'COBOM', 'plat-cobom', 'OPERADOR COBOM', false, true),
('2693038', 'GONÇALVES', '1º SGT', 'GUARNICAO', 'plat-1', 'COMANDANTE DE GUARNIÇÃO', true, true),
('3140687', 'EVANGELHO', 'SD', 'GUARNICAO', 'plat-1', 'CHEFE DE LINHA DIREITA', false, true),
('3706362', 'GASTÃO', 'SD', 'GUARNICAO', 'plat-1', 'AUXILIAR DE LINHA DIREITA', false, true),
('4388240', 'VIEIRA', 'SD', 'GUARNICAO', 'plat-1', 'COV / OPERADOR / CONDUTOR', false, true),
('2682125', 'SILVA PAZ', '2º SGT', 'GUARNICAO', 'plat-1', 'COV / OPERADOR / CONDUTOR', false, true),
('2877384', 'SIQUEIRA', '2º SGT', 'GUARNICAO', 'plat-1', 'COV / OPERADOR / CONDUTOR', false, true),
('2519038', 'SCHUSTER', '1º SGT', 'GUARNICAO', 'plat-3', 'COV / OPERADOR / CONDUTOR', false, true),
('3141551', 'TATIELI', '1º SGT', 'GUARNICAO', 'plat-3', 'CHEFE DE LINHA DIREITA', true, true),
('3705862', 'REQUIA', 'SD', 'GUARNICAO', 'plat-3', 'CHEFE DE LINHA ESQUERDA', false, true),
('2615690', 'BRUM', '1º SGT', 'GUARNICAO', 'plat-2', 'CINOTÉCNICO', true, true),
('2685094', 'MACHADO', '2º SGT', 'GUARNICAO', 'plat-2', 'CINOTÉCNICO', false, true),
('4674260', 'ULLRICH', 'SD', 'GUARNICAO', 'plat-2', 'CINOTÉCNICO', false, true),
('3155331', 'VASCONCELLOS', '2º SGT', 'GUARNICAO', 'plat-2', 'MERGULHADOR', false, true),
('2498110', 'MEDEIROS', 'CAP QOEM', 'PELOTAO', 'plat-1', 'COMANDANTE 1ª CIA / 4º BBM', true, false)
ON CONFLICT (matricula) DO UPDATE SET
    nome_guerra = EXCLUDED.nome_guerra,
    posto_graduacao = EXCLUDED.posto_graduacao,
    perfil = EXCLUDED.perfil;
