// /api/admin-questoes.js
// Endpoint PROTEGIDO por senha — usado só pela página admin-questoes.html.
// Permite listar, criar/editar (upsert por id) e apagar questões reais.
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
    // ───────────── LISTAR TODAS ─────────────
    if (req.method === 'GET') {
      const r = await fetch(
        `${SB_URL}/rest/v1/questoes?select=*&order=criado_em.desc`,
        { headers: headersSB }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
      return res.status(200).json(data);
    }

    // ───────────── CRIAR OU ATUALIZAR (upsert por id) ─────────────
    if (req.method === 'POST') {
      const {
        id, banca, disciplina, assunto, orgao, ano, tipo,
        enunciado, alternativas, gabarito, comentario, ativo,
      } = req.body || {};

      if (!id || !id.trim()) {
        return res.status(400).json({ error: 'Identificador (id) ausente.' });
      }
      if (!banca || !banca.trim()) return res.status(400).json({ error: 'A banca é obrigatória.' });
      if (!disciplina || !disciplina.trim()) return res.status(400).json({ error: 'A disciplina é obrigatória.' });
      if (!assunto || !assunto.trim()) return res.status(400).json({ error: 'O assunto é obrigatório.' });
      if (!enunciado || !enunciado.trim()) return res.status(400).json({ error: 'O enunciado é obrigatório.' });
      if (!gabarito || !gabarito.trim()) return res.status(400).json({ error: 'O gabarito é obrigatório.' });

      const tipoFinal = tipo === 'certo_errado' ? 'certo_errado' : 'multipla';

      const payload = {
        id: id.trim(),
        banca: banca.trim(),
        disciplina: disciplina.trim(),
        assunto: assunto.trim(),
        orgao: (orgao && orgao.trim()) || null,
        ano: Number.isFinite(ano) ? ano : null,
        tipo: tipoFinal,
        enunciado: enunciado.trim(),
        alternativas: tipoFinal === 'multipla' ? (alternativas || null) : null,
        gabarito: gabarito.trim(),
        comentario: (comentario && comentario.trim()) || null,
        ativo: ativo !== false,
      };

      const r = await fetch(
        `${SB_URL}/rest/v1/questoes?on_conflict=id`,
        {
          method: 'POST',
          headers: { ...headersSB, Prefer: 'resolution=merge-duplicates,return=representation' },
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
      if (!id) return res.status(400).json({ error: 'Faltou o id da questão.' });

      const r = await fetch(
        `${SB_URL}/rest/v1/questoes?id=eq.${encodeURIComponent(id)}`,
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
