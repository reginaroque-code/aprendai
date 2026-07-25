// /api/questoes.js
// Endpoint PÚBLICO — usado pelo próprio site (index.html) para buscar
// questões REAIS já cadastradas de um assunto, para misturar com as
// questões geradas por IA na tela "Praticar questões".
// Só devolve questões com ativo = true. Não precisa de senha.
//
// GET /api/questoes?banca=CEBRASPE&disciplina=Legislação%20de%20Trânsito&assunto=Infrações%20e%20penalidades&limite=10

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const disciplina = (req.query.disciplina || '').trim();
  const assunto = (req.query.assunto || '').trim();
  const banca = (req.query.banca || '').trim();
  let limite = parseInt(req.query.limite, 10);
  if (!Number.isFinite(limite) || limite <= 0) limite = 10;
  if (limite > 10) limite = 10;

  if (!disciplina || !assunto) {
    return res.status(400).json({ error: 'Informe disciplina e assunto.' });
  }

  try {
    const SB_URL = process.env.SUPABASE_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const params = new URLSearchParams();
    params.set('select', 'id,banca,disciplina,assunto,orgao,ano,tipo,enunciado,alternativas,gabarito,comentario');
    params.set('ativo', 'eq.true');
    params.set('disciplina', `ilike.${disciplina}`);
    params.set('assunto', `ilike.${assunto}`);
    if (banca) params.set('banca', `ilike.${banca}`);
    params.set('order', 'ano.desc.nullslast');
    params.set('limit', String(limite));

    const r = await fetch(`${SB_URL}/rest/v1/questoes?${params.toString()}`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      },
    });

    const rows = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: 'Erro ao buscar questões', detalhe: rows });
    }

    return res.status(200).json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
