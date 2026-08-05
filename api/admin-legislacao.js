// /api/admin-legislacao.js
// Endpoint PROTEGIDO por senha — usado só pela página admin-legislacao.html.
// Permite ver a legislação cadastrada de cada edital e substituir a lista de leis
// de um edital específico.
//
// Autenticação: o pedido precisa vir com o cabeçalho
//   x-admin-password: <valor de ADMIN_PASSWORD>
// Se a senha não bater, devolve 401 e não faz nada.
//
// GET  /api/admin-legislacao          -> lista todos os editais com sua legislação atual
// POST /api/admin-legislacao          -> substitui a legislação de UM edital
//   body: { edital_id: "prf-2021", legislacao: [{nome,descricao,link,disciplina}, ...] }
//
// Importante: isso só mexe no campo "legislacao" do edital — nunca toca em
// orgao/cargo/banca/disciplinas/etc, então não tem risco de bagunçar o cadastro
// do edital feito por /api/admin-editais.js.

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
    // ───────────── LISTAR TODOS OS EDITAIS + LEGISLAÇÃO ATUAL ─────────────
    if (req.method === 'GET') {
      const r = await fetch(
        `${SB_URL}/rest/v1/editais?select=id,orgao,cargo,banca,ano,legislacao&order=ordem.asc`,
        { headers: headersSB }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
      return res.status(200).json(data);
    }

    // ───────────── SUBSTITUIR A LEGISLAÇÃO DE UM EDITAL ─────────────
    if (req.method === 'POST') {
      const { edital_id, legislacao } = req.body || {};
      if (!edital_id || !String(edital_id).trim()) {
        return res.status(400).json({ error: 'Faltou o edital_id.' });
      }
      if (!Array.isArray(legislacao)) {
        return res.status(400).json({ error: 'legislacao precisa ser uma lista.' });
      }
      for (const item of legislacao) {
        if (!item || !item.nome || !String(item.nome).trim()) {
          return res.status(400).json({ error: 'Toda lei precisa de um nome.' });
        }
        if (!item.link || !String(item.link).trim()) {
          return res.status(400).json({ error: 'Toda lei precisa de um link.' });
        }
      }
      const payloadLimpo = legislacao.map((item) => ({
        nome: String(item.nome).trim(),
        descricao: item.descricao ? String(item.descricao).trim() : '',
        link: String(item.link).trim(),
        disciplina: item.disciplina ? String(item.disciplina).trim() : '',
      }));

      const r = await fetch(
        `${SB_URL}/rest/v1/editais?id=eq.${encodeURIComponent(edital_id)}`,
        {
          method: 'PATCH',
          headers: { ...headersSB, Prefer: 'return=representation' },
          body: JSON.stringify({ legislacao: payloadLimpo }),
        }
      );
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao salvar', detalhe: data });
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ error: 'Edital não encontrado.' });
      }
      return res.status(200).json(data[0]);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
