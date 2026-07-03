// /api/admin-disciplinas.js
// Endpoint PROTEGIDO por senha — usado só pela página admin.html.
// Permite listar TODAS as disciplinas (inclusive inativas), criar, editar e apagar.
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
    // ───────────── LISTAR TODAS (inclusive inativas) ─────────────
    if (req.method === 'GET') {
      const r = await fetch(
        `${SB_URL}/rest/v1/disciplinas?select=*&order=ordem.asc`,
        { headers: headersSB }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
      return res.status(200).json(data);
    }

    // ───────────── CRIAR OU ATUALIZAR (upsert por nome) ─────────────
    if (req.method === 'POST') {
      const { nome, modulos, palavras_chave, ordem, ativo } = req.body || {};

      if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'O nome da disciplina é obrigatório.' });
      }
      if (!Array.isArray(modulos) || modulos.length === 0) {
        return res.status(400).json({ error: 'Inclua pelo menos um assunto.' });
      }

      const payload = {
        nome: nome.trim(),
        modulos,
        palavras_chave: Array.isArray(palavras_chave) ? palavras_chave : [],
        ordem: Number.isFinite(ordem) ? ordem : 0,
        ativo: ativo !== false,
      };

      const r = await fetch(
        `${SB_URL}/rest/v1/disciplinas?on_conflict=nome`,
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
      if (!id) return res.status(400).json({ error: 'Faltou o id da disciplina.' });

      const r = await fetch(
        `${SB_URL}/rest/v1/disciplinas?id=eq.${encodeURIComponent(id)}`,
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
