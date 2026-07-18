// /api/apostilas.js
// Endpoint do ALUNO LOGADO — histórico de apostilas já geradas ("Minhas Apostilas").
// Autenticação: o pedido precisa vir com o cabeçalho
//   Authorization: Bearer <access_token do Supabase do próprio aluno>
// O token é validado contra o Supabase Auth antes de qualquer leitura/escrita,
// e todo acesso à tabela é sempre filtrado pelo user_id do dono do token.
//
// GET  /api/apostilas          -> lista resumida (id, disciplina, assunto, banca, criado_em),
//                                  mais recente primeiro — usada na barra lateral.
// GET  /api/apostilas?id=...   -> apostila completa (inclui "dados", o conteúdo já gerado)
//                                  para reabrir uma apostila salva. Isso é só LEITURA:
//                                  não gera nada novo e não deve contar no limite do plano.
// POST /api/apostilas          -> salva uma apostila recém-gerada no histórico do aluno.

const SB_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Chave pública (publishable/anon) do Supabase — a mesma já embutida no index.html,
// usada só para validar o token do usuário em /auth/v1/user.
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iGmTY-Ry_S90JyK9L5QZNg_k1hmJlos';

async function usuarioDoToken(token) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = await r.json();
  return user && user.id ? user : null;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso ausente.' });
  }

  const usuario = await usuarioDoToken(token);
  if (!usuario) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  const headersSB = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    if (req.method === 'GET') {
      const id = req.query && req.query.id;

      // ───── apostila específica (reabrir do histórico — NÃO conta como nova geração) ─────
      if (id) {
        const r = await fetch(
          `${SB_URL}/rest/v1/apostilas_geradas?id=eq.${encodeURIComponent(id)}&user_id=eq.${usuario.id}&select=*`,
          { headers: headersSB }
        );
        const rows = await r.json();
        if (!r.ok) return res.status(500).json({ error: 'Erro ao buscar apostila', detalhe: rows });
        if (!rows.length) return res.status(404).json({ error: 'Apostila não encontrada.' });
        return res.status(200).json(rows[0]);
      }

      // ───── lista resumida, mais recente primeiro ─────
      const r = await fetch(
        `${SB_URL}/rest/v1/apostilas_geradas?user_id=eq.${usuario.id}&select=id,disciplina,assunto,banca,edital_orgao,criado_em&order=criado_em.desc`,
        { headers: headersSB }
      );
      const rows = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao listar apostilas', detalhe: rows });
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { disciplina, assunto, banca, modo, edital_orgao, dados } = req.body || {};
      if (!disciplina || !assunto || !dados) {
        return res.status(400).json({ error: 'Dados incompletos para salvar a apostila.' });
      }

      const payload = {
        user_id: usuario.id,
        disciplina,
        assunto,
        banca: banca || null,
        modo: modo || 'livre',
        edital_orgao: edital_orgao || null,
        dados,
      };

      const r = await fetch(`${SB_URL}/rest/v1/apostilas_geradas`, {
        method: 'POST',
        headers: { ...headersSB, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao salvar apostila', detalhe: data });
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
