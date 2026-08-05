// /api/editais.js
// Endpoint PÚBLICO — usado pelo próprio site (index.html) para carregar
// a lista de editais na aba "Por Edital". Só devolve editais com ativo = true.
// Não precisa de senha.
//
// Também atende, no mesmo arquivo, a busca de legislação (antigo /api/legislacao.js,
// consolidado aqui pra não passar do limite de 12 funções serverless do plano
// Hobby da Vercel):
//   GET /api/editais?legislacao=true              -> toda a legislação cadastrada
//   GET /api/editais?legislacao=true&q=8.112        -> filtra por nome/descrição
//   GET /api/editais?legislacao=true&edital_id=X    -> só a legislação daquele edital

export default async function handler(req, res) {
    if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Método não permitido' });
    }

  // Remove acentos e caixa alta pra busca funcionar independente de acentuação
  // (ex: "transito" encontra "Trânsito").
  function normalizarTexto(v) {
        return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  try {
        const SB_URL = process.env.SUPABASE_URL;
        const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const { legislacao, q, edital_id, disciplina } = req.query || {};

      // ═══════════ MODO LEGISLAÇÃO ═══════════
      if (legislacao === 'true') {
              let filtro = 'ativo=eq.true';
              if (edital_id) filtro += `&id=eq.${encodeURIComponent(edital_id)}`;

          const r = await fetch(
                    `${SB_URL}/rest/v1/editais?select=id,orgao,cargo,banca,ano,legislacao&${filtro}&order=ordem.asc`,
            { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
                  );
              if (!r.ok) {
                        const errText = await r.text();
                        return res.status(500).json({ error: 'Erro ao buscar legislação', detalhe: errText });
              }
              const editaisRows = await r.json();

          let itens = [];
              editaisRows.forEach((ed) => {
                        const leis = Array.isArray(ed.legislacao) ? ed.legislacao : [];
                        leis.forEach((lei) => {
                                    if (!lei || !lei.nome || !lei.link) return;
                                    itens.push({
                                                  nome: lei.nome,
                                                  descricao: lei.descricao || '',
                                                  link: lei.link,
                                                  disciplina: lei.disciplina || '',
                                                  edital_id: ed.id,
                                                  edital_orgao: ed.orgao,
                                                  edital_cargo: ed.cargo,
                                                  edital_banca: ed.banca,
                                    });
                        });
              });

          if (q && String(q).trim()) {
                    const termo = normalizarTexto(q);
                    itens = itens.filter((it) => normalizarTexto(it.nome + ' ' + it.descricao).indexOf(termo) !== -1);
          }
              if (disciplina && String(disciplina).trim()) {
                        const d = normalizarTexto(disciplina);
                        itens = itens.filter((it) => normalizarTexto(it.disciplina).indexOf(d) !== -1);
              }

          res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
              return res.status(200).json(itens);
      }

      // ═══════════ MODO PADRÃO: lista de editais (comportamento original, intocado) ═══════════
      const r = await fetch(
              `${SB_URL}/rest/v1/editais?select=id,orgao,cargo,banca,ano,area,comuns,disciplinas&ativo=eq.true&order=ordem.asc`,
        {
                  headers: {
                              apikey: SB_KEY,
                              Authorization: `Bearer ${SB_KEY}`,
                  },
        }
            );

      if (!r.ok) {
              const errText = await r.text();
              return res.status(500).json({ error: 'Erro ao buscar editais', detalhe: errText });
      }

      const rows = await r.json();

      // Cache leve de 5 minutos — a lista de editais não muda a toda hora
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(rows);
  } catch (err) {
        return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
