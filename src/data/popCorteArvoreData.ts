export interface POPSection {
  id: string;
  title: string;
  items: { code?: string; title?: string; text: string }[];
}

export const POP_CORTE_ARVORE_DATA = {
  header: {
    state: 'ESTADO DO RIO GRANDE DO SUL',
    secretariat: 'SECRETARIA DA SEGURANÇA PÚBLICA',
    institution: 'CORPO DE BOMBEIROS MILITAR',
    section: 'SALVAMENTO EM ALTURA',
    subject: 'Corte de Árvore',
    documentType: 'PROCEDIMENTO OPERACIONAL PADRÃO (POP)',
    chamber: 'Câmara Técnica de Salvamento em Altura',
    revisionDate: 'SET 2024'
  },
  purpose: 'Regular os procedimentos adotados na atividade de corte de árvore, realizado por intermédio dos Batalhões de Bombeiro Militar do Corpo de Bombeiros Militar do Estado do Rio Grande do Sul (CBMRS).',
  generalProvisions: [
    {
      code: '2.1',
      text: 'O serviço de corte de árvore realizado pelo CBMRS compreende a supressão total ou parcial de vegetal, o qual somente se aplica em situações emergenciais. Nem toda solicitação para a realização da atividade de corte de árvore requer, necessariamente, a efetiva execução pelo CBMRS.'
    },
    {
      code: '2.2',
      text: 'Nas hipóteses em que, após vistoria do vegetal pelo Corpo de Bombeiros Militar, não forem constatadas a incidência de risco iminente de queda do vegetal, a competência para conceder autorização para a supressão total ou parcial do mesmo, em propriedade pública ou particular, no território do Município é da Prefeitura Municipal, por intermédio da Secretaria de Meio Ambiente ou órgão correlato, assim como Defesa Civil (risco iminente), conforme incisos VI e VII, do artigo 23, da Constituição Federal/88.'
    },
    {
      code: '2.3',
      text: 'Não estando caracterizado o risco iminente com base em critérios objetivos por parte do CBMRS, ainda que haja avaliação de risco e/ou autorização legal para supressão total ou parcial do vegetal por parte do município e/ou Defesa Civil, essa avaliação não condiciona a atuação do CBMRS, que poderá avaliar o caso concreto. Dessa forma, havendo entendimentos divergentes, competirá ao município providenciar o corte por profissionais habilitados para tal.'
    },
    {
      code: '2.4',
      text: 'São aspectos objetivos que caracterizam risco iminente, conforme avaliação do CBMRS, estar o vegetal em estado de deterioração total ou parcial em função de: morte do vegetal; com rachaduras; galhos total ou parcialmente quebrados; inclinação da árvore em função de eventos climáticos, ainda que sem a exposição de suas raízes; galhos escorados ou sobre residências, entre outros.'
    },
    {
      code: '2.5',
      text: 'A Lei Federal nº 9.605 de fevereiro de 1998 dispõe sobre crimes contra o meio ambiente, tipificando a conduta "corte de árvore em floresta considerada de preservação permanente sem permissão da autoridade competente" (artigo 39 – Pena: Detenção de um a três anos e multa) e, também, "a destruição ou dano a plantas de ornamentação de logradouros públicos ou propriedade privada alheia" (artigo 49 – Pena: Detenção de um a três meses e multa).'
    }
  ],
  procedures: [
    {
      code: '3.1',
      text: 'São da atribuição do CBMRS apenas a retirada das árvores ou o corte dos galhos de grande porte que estejam caídos nas vias públicas ou que ofereçam risco iminente de queda e que possam vir a provocar acidentes envolvendo residências, veículos, pessoas, animais etc. Incluem-se vegetais parcialmente tombados e/ou escorados com risco de queda.'
    },
    {
      code: '3.2',
      text: 'O evento de corte de árvore requer atenção máxima tanto no que diz respeito à segurança da Guarnição de Bombeiro Militar (elevado risco de acidentes) quanto à proteção de terceiros e bens materiais.'
    },
    {
      code: '3.3',
      text: 'Serviços com trabalho em altura e risco de quedas de pessoas e/ou equipamentos só podem ocorrer com uso de EPIs adequados e operadores devidamente ancorados por sistemas antiqueda.'
    },
    {
      code: '3.4',
      text: 'As viaturas envolvidas deverão se posicionar afastadas do local do corte a uma distância segura para evitar incidentes, mas de fácil acesso à guarnição e sob vigilância para suprimento de materiais.'
    },
    {
      code: '3.5',
      text: 'Isolamento do local de trabalho: deverá demarcar um círculo ao redor da árvore de raio mínimo igual a 2,5 vezes (duas vezes e meia) a altura do vegetal, salvo avaliação técnica do Comandante de Guarnição ou Oficial BM devidamente justificada no boletim. Utilizar fita de sinalização, cavaletes, cordas e cones.'
    },
    {
      code: '3.6',
      text: 'Avaliação técnica preliminar (reconhecimento do local, tipo de terreno, risco de colapso de estruturas vizinhas, presença de fiação elétrica e condições meteorológicas). Evitar corte com fortes chuvas, vendavais ou período noturno (isolando a área até a cessação das condições adversas), exceto em situação extrema para preservação direta da vida humana.'
    },
    {
      code: '3.7',
      text: 'Tomada de decisão pelo Comandante de Guarnição quanto ao método de corte e solicitação de apoio de concessionária de energia, Defesa Civil, trânsito ou órgãos ambientais.'
    },
    {
      code: '3.8',
      text: 'Equipamentos de Proteção Individual (EPI): capacete, óculos de proteção, luvas, protetor auricular, cinto de salvamento/poda, talabarte, mosquetões, trépas/esporões, cordas específicas de segurança e movimentação em árvore.'
    },
    {
      code: '3.9',
      text: 'Verificação da motosserra: conferir níveis de combustível (mistura correta para evitar fumaça branca ou travamento), nível de óleo lubrificante de corrente, estado da lâmina e tensionamento/afiação antes e após o corte.'
    },
    {
      code: '3.10',
      text: 'Técnicas de corte: Supressão Total (corte de abate com entalhe direcional) ou Supressão Parcial (corte de galhos pendentes com risco) com ou sem balança e guia. Ancoragem obrigatória acima da cabeça do operador. Todo material içado deve estar ancorado. Evitar cortes acima da linha da cintura.'
    },
    {
      code: '3.11',
      text: 'Transporte e operação de motosserra: sabre voltado para trás em deslocamento plano/aclive; não fumar ao abastecer; garras da motosserra firmadas no tronco; atenção redobrada a troncos rachados e estilhaçamento.'
    },
    {
      code: '3.12',
      text: 'Materiais de salvamento e corte: uso de cordas de balanço e guia distintas da corda de segurança do operador; identificação e separação estrita dos materiais de corte em relação aos equipamentos de salvamento em altura pura.'
    },
    {
      code: '3.13',
      text: 'Desobstrução e destinação de resíduos: o CBMRS desobstrui e deixa livres as vias públicas e passagens. A remoção/transporte de troncos e galhos cortados para bota-fora é de responsabilidade da Prefeitura Municipal em vias públicas, e do proprietário em área privada.'
    },
    {
      code: '3.14',
      text: 'Encerramento: após o término definitivo e eliminação de riscos, orientar formalmente solicitantes e agentes de apoio quanto aos procedimentos executados.'
    },
    {
      code: '3.15',
      text: 'Distâncias Mínimas de Segurança em Fiação Elétrica (MTB-35):\n• 13,8 kV: 1,10m\n• 20 kV: 1,15m\n• 34,5 kV: 1,20m\n• 69 kV: 1,35m\n• 88 kV: 1,45m\n• 138 kV: 1,60m\n• 230 kV: 2,20m\n• 345 kV: 3,00m\n• 440 kV: 3,30m\n• 500 kV: 3,80m\nAcionar obrigatoriamente a concessionária de energia para desligamento ou apoio técnico especializado.'
    },
    {
      code: '3.16',
      text: 'Proibição terminante: é vedado o corte sem caráter emergencial (sem risco iminente de colapso) ou para simples limpeza de terrenos, calhas ou conveniência particular.'
    },
    {
      code: '3.17',
      text: 'Fardamento e postura: militares devem permanecer devidamente fardados com mangas baixas durante toda a operação para proteção dérmica e integridade física.'
    }
  ],
  definitions: [
    {
      title: 'Situações Emergenciais',
      text: 'Acontecimentos de alto risco e inesperados, que por sua natureza imutável e de risco extremo, requerem atendimento imediato.'
    },
    {
      title: 'Risco Iminente',
      text: 'Perigo ou possibilidade de perigo que está em via de efetivação imediata (queda sobre estruturas habitadas, via arterial ou rede elétrica).'
    },
    {
      title: 'Ameaça de Queda',
      text: 'Condição informada pela parte interessada a qual requer a avaliação/vistoria de profissional com habilitação legal.'
    },
    {
      title: 'Balança',
      text: 'Técnica utilizada para descer parte do vegetal cortado de forma controlada por meio do uso de cordas (evitando queda livre sobre obstáculos). Deve ser ancorada em tronco/galho distinto da ancoragem do operador.'
    },
    {
      title: 'Guia',
      text: 'Técnica utilizada com emprego de cordas para movimentar e direcionar galhos cortados de um local para outro, desviando de obstáculos e construções.'
    },
    {
      title: 'Supressão Parcial',
      text: 'Corte de galhos ou frações do vegetal que estejam oferecendo risco iminente de queda.'
    },
    {
      title: 'Supressão Total',
      text: 'Corte ou abate total do vegetal (tronco principal e copa) que ofereça risco iminente de colapso.'
    },
    {
      title: 'Equipamentos para Escalada e Movimentação em Árvore',
      text: 'Dispositivos desenvolvidos especificamente para corte de árvores (Rope Wrench, Zigzag, Chicane, talabartes armados), permitindo manobras seguras de ascensão, descensão e posicionamento na copa.'
    }
  ],
  electricalSafetyTable: [
    { voltage: '13,8 kV', distance: '1,10 m' },
    { voltage: '20,0 kV', distance: '1,15 m' },
    { voltage: '34,5 kV', distance: '1,20 m' },
    { voltage: '69,0 kV', distance: '1,35 m' },
    { voltage: '88,0 kV', distance: '1,45 m' },
    { voltage: '138,0 kV', distance: '1,60 m' },
    { voltage: '230,0 kV', distance: '2,20 m' },
    { voltage: '345,0 kV', distance: '3,00 m' },
    { voltage: '440,0 kV', distance: '3,30 m' },
    { voltage: '500,0 kV', distance: '3,80 m' }
  ]
};
