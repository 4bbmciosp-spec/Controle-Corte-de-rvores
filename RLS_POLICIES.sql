-- ==============================================================================
-- CBMRS - 4º Batalhão de Bombeiro Militar (Santa Maria / RS)
-- POLÍTICAS DE SEGURANÇA POR LINHA (ROW LEVEL SECURITY - RLS)
-- Sistema de Gestão Operacional de Corte e Vistoria de Árvores (CBMRS Árvores)
-- ==============================================================================

-- 1. TABELA: militares
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados podem ler militares" ON public.militares;
CREATE POLICY "Todos autenticados podem ler militares"
ON public.militares
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "COBOM pode inserir militares" ON public.militares;
CREATE POLICY "COBOM pode inserir militares"
ON public.militares
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);

DROP POLICY IF EXISTS "COBOM ou proprio militar pode atualizar" ON public.militares;
CREATE POLICY "COBOM ou proprio militar pode atualizar"
ON public.militares
FOR UPDATE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
  OR auth_user_id = auth.uid()
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
  OR auth_user_id = auth.uid()
);

DROP POLICY IF EXISTS "COBOM pode excluir militares" ON public.militares;
CREATE POLICY "COBOM pode excluir militares"
ON public.militares
FOR DELETE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);


-- 2. TABELA: ocorrencias
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem ocorrencias" ON public.ocorrencias;
CREATE POLICY "Todos os perfis autenticados leem ocorrencias"
ON public.ocorrencias
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "COBOM pode inserir ocorrencias" ON public.ocorrencias;
CREATE POLICY "COBOM pode inserir ocorrencias"
ON public.ocorrencias
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem atualizar ocorrencias" ON public.ocorrencias;
CREATE POLICY "COBOM e GUARNICAO podem atualizar ocorrencias"
ON public.ocorrencias
FOR UPDATE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "Apenas COBOM pode excluir ocorrencias" ON public.ocorrencias;
CREATE POLICY "Apenas COBOM pode excluir ocorrencias"
ON public.ocorrencias
FOR DELETE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);


-- 3. TABELA: atendimentos
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem atendimentos" ON public.atendimentos;
CREATE POLICY "Todos os perfis autenticados leem atendimentos"
ON public.atendimentos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem registrar atendimentos" ON public.atendimentos;
CREATE POLICY "COBOM e GUARNICAO podem registrar atendimentos"
ON public.atendimentos
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem atualizar atendimentos" ON public.atendimentos;
CREATE POLICY "COBOM e GUARNICAO podem atualizar atendimentos"
ON public.atendimentos
FOR UPDATE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "Apenas COBOM pode excluir atendimentos" ON public.atendimentos;
CREATE POLICY "Apenas COBOM pode excluir atendimentos"
ON public.atendimentos
FOR DELETE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);


-- 4. TABELA: atendimentos_historico (Apenas leitura; gravação é via TRIGGER)
ALTER TABLE public.atendimentos_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem historico de atendimentos" ON public.atendimentos_historico;
CREATE POLICY "Todos os perfis autenticados leem historico de atendimentos"
ON public.atendimentos_historico
FOR SELECT
TO authenticated
USING (true);


-- 5. TABELA: fotos
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem fotos" ON public.fotos;
CREATE POLICY "Todos os perfis autenticados leem fotos"
ON public.fotos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem inserir fotos" ON public.fotos;
CREATE POLICY "COBOM e GUARNICAO podem inserir fotos"
ON public.fotos
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem atualizar fotos" ON public.fotos;
CREATE POLICY "COBOM e GUARNICAO podem atualizar fotos"
ON public.fotos
FOR UPDATE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "Apenas COBOM pode excluir fotos" ON public.fotos;
CREATE POLICY "Apenas COBOM pode excluir fotos"
ON public.fotos
FOR DELETE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);


-- 6. TABELA: escalas_servico
ALTER TABLE public.escalas_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem escalas_servico" ON public.escalas_servico;
CREATE POLICY "Todos os perfis autenticados leem escalas_servico"
ON public.escalas_servico
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas COBOM pode inserir/modificar escalas" ON public.escalas_servico;
CREATE POLICY "Apenas COBOM pode inserir/modificar escalas"
ON public.escalas_servico
FOR ALL
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);


-- 7. TABELAS: platoons e squads
ALTER TABLE public.platoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os perfis autenticados leem platoons" ON public.platoons;
CREATE POLICY "Todos os perfis autenticados leem platoons"
ON public.platoons
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas COBOM gerencia platoons" ON public.platoons;
CREATE POLICY "Apenas COBOM gerencia platoons"
ON public.platoons
FOR ALL
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);

DROP POLICY IF EXISTS "Todos os perfis autenticados leem squads" ON public.squads;
CREATE POLICY "Todos os perfis autenticados leem squads"
ON public.squads
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "COBOM e GUARNICAO gerenciam squads" ON public.squads;
CREATE POLICY "COBOM e GUARNICAO gerenciam squads"
ON public.squads
FOR ALL
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
)
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);


-- 8. TABELA: notificacoes
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de notificacoes por alvo ou COBOM" ON public.notificacoes;
CREATE POLICY "Leitura de notificacoes por alvo ou COBOM"
ON public.notificacoes
FOR SELECT
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
  OR (SELECT perfil::text FROM public.militares WHERE auth_user_id = auth.uid()) = ANY(perfis_alvo)
  OR squad_alvo_id = (SELECT squad_atual_id FROM public.militares WHERE auth_user_id = auth.uid())
  OR platoon_alvo_id = (SELECT platoon_atual_id FROM public.militares WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "COBOM e GUARNICAO podem criar notificacoes" ON public.notificacoes;
CREATE POLICY "COBOM e GUARNICAO podem criar notificacoes"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) IN ('COBOM', 'GUARNICAO')
);

DROP POLICY IF EXISTS "Atualizacao de notificacoes (marcar como lida)" ON public.notificacoes;
CREATE POLICY "Atualizacao de notificacoes (marcar como lida)"
ON public.notificacoes
FOR UPDATE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
  OR (SELECT perfil::text FROM public.militares WHERE auth_user_id = auth.uid()) = ANY(perfis_alvo)
  OR squad_alvo_id = (SELECT squad_atual_id FROM public.militares WHERE auth_user_id = auth.uid())
  OR platoon_alvo_id = (SELECT platoon_atual_id FROM public.militares WHERE auth_user_id = auth.uid())
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas COBOM pode excluir notificacoes" ON public.notificacoes;
CREATE POLICY "Apenas COBOM pode excluir notificacoes"
ON public.notificacoes
FOR DELETE
TO authenticated
USING (
  (SELECT perfil FROM public.militares WHERE auth_user_id = auth.uid()) = 'COBOM'
);
