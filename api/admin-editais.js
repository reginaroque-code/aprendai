// /api/admin-editais.js
// Endpoint PROTEGIDO por senha — usado só pela página admin-editais.html.
// Permite listar TODOS os editais (inclusive inativos), criar, editar e apagar.
//
// Autenticação: o pedido precisa vir com o cabeçalho
//   x-admin-password: <valor de ADMIN_PASSWORD>
// Se a senha não bater, devolve 401 e não faz nada.

export default async function handler(req, res) {
  const senhaEnviada = req.headers['x-admin-password'];
  if (!senhaEnviada || senhaEnviada !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta ou ausente.' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headersSB = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // ───────────── LISTAR TODOS (inclusive inativos) ─────────────
    if (req.method === 'GET') {
      const r = await fetch(
        `${SB_URL}/rest/v1/editais?select=*&order=ordem.asc`,
        { headers: headersSB }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
      return res.status(200).json(data);
    }

    // ───────────── CRIAR OU ATUALIZAR (upsert por id) ─────────────
    if (req.method === 'POST') {
      const { id, orgao, cargo, banca, ano, area, comuns, disciplinas, ordem, ativo } = req.body || {};

      if (!id || !id.trim()) {
        return res.status(400).json({ error: 'O identificador (id) do edital é obrigatório.' });
      }
      if (!orgao || !orgao.trim()) {
        return res.status(400).json({ error: 'O órgão é obrigatório.' });
      }
      if (!cargo || !cargo.trim()) {
        return res.status(400).json({ error: 'O cargo é obrigatório.' });
      }
      if (!banca || !banca.trim()) {
        return res.status(400).json({ error: 'A banca é obrigatória.' });
      }
      if (!Number.isFinite(ano)) {
        return res.status(400).json({ error: 'O ano é obrigatório.' });
      }
      const temComuns = Array.isArray(comuns) && comuns.length > 0;
      const temDisciplinas = Array.isArray(disciplinas) && disciplinas.length > 0;
      if (!temComuns && !temDisciplinas) {
        return res.status(400).json({ error: 'Inclua pelo menos uma disciplina (comum ou específica).' });
      }

      const payload = {
        id: id.trim(),
        orgao: orgao.trim(),
        cargo: cargo.trim(),
        banca: banca.trim(),
        ano,
        area: (area && area.trim()) || 'administrativo',
        comuns: Array.isArray(comuns) ? comuns : [],
        disciplinas: Array.isArray(disciplinas) ? disciplinas : [],
        ordem: Number.isFinite(ordem) ? ordem : 0,
        ativo: ativo !== false,
      };

      const r = await fetch(
        `${SB_URL}/rest/v1/editais?on_conflict=id`,
        {
          method: 'POST',
          headers: {
            ...headersSB,
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao salvar', detalhe: data });
      return res.status(200).json(data);
    }

    // ───────────── APAGAR ─────────────
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Faltou o id do edital.' });

      const r = await fetch(
        `${SB_URL}/rest/v1/editais?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: headersSB }
      );
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: 'Erro ao apagar', detalhe: errText });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
