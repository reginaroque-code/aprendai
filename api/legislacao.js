// /api/legislacao.js
// Endpoint PÚBLICO — usado pela área de membros (aba "Legislação") pra buscar
// as leis relacionadas aos editais cadastrados. Só devolve dados de editais ativos.
// Não precisa de senha (mesmo padrão de /api/editais.js).
//
// A legislação fica guardada dentro de cada edital (campo JSONB "legislacao"),
// então este endpoint busca todos os editais ativos, "achata" as leis de todos
// eles numa lista só (marcando de qual concurso cada lei veio) e filtra pelo
// termo de busca, se houver.
//
// GET /api/legislacao                       -> toda a legislação cadastrada
// GET /api/legislacao?q=8.112                -> filtra por nome/descrição
// GET /api/legislacao?edital_id=prf-2021      -> só a legislação daquele edital

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const SB_URL = process.env.SUPABASE_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { q, edital_id, disciplina } = req.query;

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

    // achata a legislação de todos os editais numa lista só, anexando o contexto do edital
    let itens = [];
    editaisRows.forEach((ed) => {
      const leis = Array.isArray(ed.legislacao) ? ed.legislacao : [];
      leis.forEach((lei) => {
        if (!lei || !lei.nome || !lei.link) return; // ignora entradas incompletas
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
      const termo = String(q).trim().toLowerCase();
      itens = itens.filter(
        (it) => (it.nome + ' ' + it.descricao).toLowerCase().indexOf(termo) !== -1
      );
    }
    if (disciplina && String(disciplina).trim()) {
      const d = String(disciplina).trim().toLowerCase();
      itens = itens.filter((it) => it.disciplina.toLowerCase().indexOf(d) !== -1);
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
