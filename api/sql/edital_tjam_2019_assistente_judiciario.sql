-- ══════════════════════════════════════════════════════════
-- AprendAI — Seed do edital: TJAM (Tribunal de Justiça do Amazonas)
-- Cargo 12: Assistente Judiciário | Nível Médio | Banca: Cebraspe
-- (Edital nº 1-TJAM/2019) | Área: Judiciária
--
-- Rode este script uma vez no SQL Editor do Supabase para inserir
-- (ou atualizar, se o id já existir) este edital na tabela "editais".
-- Conteúdo programático extraído do edital verticalizado oficial.
-- ══════════════════════════════════════════════════════════

insert into public.editais (id, orgao, cargo, banca, ano, area, comuns, disciplinas, ordem, ativo)
values (
  'tjam-2019-assistente-judiciario',
  'TJAM',
  'Assistente Judiciário',
  'Cebraspe',
  2019,
  'judiciario',
  '[]'::jsonb,
  '[
    {
      "nome": "Língua Portuguesa",
      "modulos": [
        "Compreensão e interpretação de textos de gêneros variados",
        "Reconhecimento de tipos e gêneros textuais",
        "Domínio da ortografia oficial: emprego das letras; emprego da acentuação gráfica",
        "Domínio dos mecanismos de coesão textual: emprego de elementos de referenciação, substituição e repetição, de conectores e outros elementos de sequenciação textual; emprego/correlação de tempos e modos verbais",
        "Domínio da estrutura morfossintática do período: relações de coordenação entre orações e entre termos da oração; relações de subordinação entre orações e entre termos da oração; emprego dos sinais de pontuação; concordância verbal e nominal; emprego do sinal indicativo de crase; colocação dos pronomes átonos"
      ]
    },
    {
      "nome": "Geografia do Amazonas",
      "modulos": [
        "Municípios do estado do Amazonas: área, limites, hidrografia, distância da cidade de Manaus",
        "Distribuição de municípios em microrregiões",
        "Aspectos humanos (população e grupos)",
        "Aspectos econômicos (Zona Franca de Manaus, indústria, impactos urbanos e sociais)"
      ]
    },
    {
      "nome": "Legislação Institucional e do Poder Judiciário",
      "modulos": [
        "Lei Complementar nº 17/1997 e suas alterações (Organização Judiciária do Estado do Amazonas)",
        "Lei Estadual nº 1.762/1986 e suas alterações (Estatuto dos Servidores Públicos Civis do Estado do Amazonas)",
        "Lei Estadual nº 3.226/2008 e suas alterações (Plano de Cargos, Carreiras e Vencimentos dos Servidores do Poder Judiciário do Estado do Amazonas)",
        "Metas Nacionais do Poder Judiciário 2019 (Justiça Estadual)",
        "Resoluções do Conselho Nacional de Justiça (CNJ): nº 46/2007; nº 125/2010 e suas alterações; nº 165/2012 e suas alterações; nº 194/2014; nº 201/2015; nº 230/2016; nº 251/2018; nº 254/2018; nº 270/2018; nº 284/2019"
      ]
    },
    {
      "nome": "Acessibilidade",
      "modulos": [
        "Lei Federal nº 13.146/2015 e suas alterações (Lei Brasileira de Inclusão da Pessoa com Deficiência)"
      ]
    },
    {
      "nome": "Noções de Informática e Processo Digital",
      "modulos": [
        "Sistema Operacional Microsoft Windows (7 e posteriores)",
        "Conceitos básicos de redes de computadores",
        "Internet e Intranet (programas de navegação, e-mail, sites)",
        "Noções de segurança da informação",
        "Lei nº 11.419/2006 e suas alterações (Processo Digital)"
      ]
    },
    {
      "nome": "Noções de Direito Administrativo",
      "modulos": [
        "Noções de organização administrativa",
        "Administração direta e indireta, centralizada e descentralizada",
        "Ato administrativo: conceito, requisitos, atributos, classificação e espécies",
        "Processo administrativo",
        "Agentes públicos: espécies e classificação; cargo, emprego e função públicos",
        "Poderes administrativos: hierárquico, disciplinar, regulamentar e de polícia; uso e abuso do poder",
        "Controle e responsabilização da administração: controles administrativo, judicial e legislativo; responsabilidade civil do Estado"
      ]
    },
    {
      "nome": "Noções de Direito Constitucional",
      "modulos": [
        "Constituição da República Federativa do Brasil de 1988: princípios fundamentais",
        "Direitos e garantias fundamentais: direitos e deveres individuais e coletivos, direitos sociais, nacionalidade, cidadania, direitos políticos, partidos políticos",
        "Administração pública: disposições gerais, servidores públicos",
        "Poder Legislativo: Congresso Nacional, Câmara dos Deputados, Senado Federal, deputados e senadores",
        "Poder Executivo: atribuições do presidente da República e dos ministros de Estado",
        "Poder Judiciário: disposições gerais; órgãos do Poder Judiciário e suas competências; Conselho Nacional de Justiça (CNJ) — composição e competências",
        "Funções essenciais à justiça: Ministério Público, Advocacia Pública e Defensoria Pública"
      ]
    },
    {
      "nome": "Direito Processual Civil",
      "modulos": [
        "Princípios constitucionais do processo civil: princípio do devido processo legal e seus consectários lógicos (contraditório, ampla defesa e juiz natural)",
        "Normas processuais civis",
        "Função jurisdicional",
        "Sujeitos do processo",
        "Atos processuais",
        "Tutela provisória",
        "Formação, suspensão e extinção do processo",
        "Lei nº 9.099/1995 e suas alterações (Juizados Especiais Cíveis e Criminais)"
      ]
    },
    {
      "nome": "Direito Processual Penal",
      "modulos": [
        "Inquérito policial",
        "Ação penal",
        "Competência",
        "Prova",
        "Prisão, medidas cautelares e liberdade provisória",
        "Citações e intimações",
        "Sentença",
        "Lei nº 9.099/1995 e suas alterações (Juizados Especiais Cíveis e Criminais)"
      ]
    },
    {
      "nome": "Noções de Administração",
      "modulos": [
        "Noções de administração: abordagens clássica, burocrática e sistêmica; convergências e diferenças entre gestão pública e gestão privada; excelência nos serviços públicos; excelência na gestão dos serviços públicos",
        "Gestão de pessoas: equilíbrio organizacional; objetivos, desafios e características da gestão de pessoas; gestão de desempenho; gestão do conhecimento; comportamento, clima e cultura organizacional; gestão por competências; liderança, motivação e satisfação no trabalho; educação, treinamento e desenvolvimento (educação corporativa; educação a distância); qualidade de vida no trabalho",
        "Gestão organizacional: planejamento estratégico — definições de estratégia, condições necessárias para desenvolver a estratégia, questões-chave em estratégia; metas estratégicas e resultados pretendidos; indicadores de desempenho; ferramentas de análise de cenário interno e externo"
      ]
    }
  ]'::jsonb,
  0,
  true
)
on conflict (id) do update set
  orgao = excluded.orgao,
  cargo = excluded.cargo,
  banca = excluded.banca,
  ano = excluded.ano,
  area = excluded.area,
  comuns = excluded.comuns,
  disciplinas = excluded.disciplinas,
  ordem = excluded.ordem,
  ativo = excluded.ativo;
