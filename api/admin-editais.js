// /api/admin-editais.js
// Endpoint PROTEGIDO por senha - usado so pela pagina admin-editais.html.
// Permite listar TODOS os editais (inclusive inativos), criar, editar e apagar.
//
// Autenticacao: o pedido precisa vir com o cabecalho
//   x-admin-password: <valor de ADMIN_PASSWORD>
// Se a senha nao bater, devolve 401 e nao faz nada.
//
// Tambem atende, no mesmo arquivo, a gestao de legislacao (antigo
// /api/admin-legislacao.js, consolidado aqui pra nao passar do limite de 12
// funcoes serverless do plano Hobby da Vercel). Ativado com ?modo=legislacao:
//   GET  /api/admin-editais?modo=legislacao   -> lista editais + legislacao atual
//   POST /api/admin-editais?modo=legislacao   -> substitui a legislacao de UM edital
//     body: { edital_id: "prf-2021", legislacao: [{nome,descricao,link,disciplina}, ...] }
//   Esse modo so mexe no campo "legislacao" do edital - nunca toca em
//   orgao/cargo/banca/disciplinas/etc do cadastro normal.

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
    const modoLegislacao = (req.query || {}).modo === 'legislacao';

  try {
        // ============ MODO LEGISLACAO ============
      if (modoLegislacao) {
              // ----------- LISTAR TODOS OS EDITAIS + LEGISLACAO ATUAL -----------
          if (req.method === 'GET') {
                    const r = await fetch(
                                `${SB_URL}/rest/v1/editais?select=id,orgao,cargo,banca,ano,legislacao&order=ordem.asc`,
                      { headers: headersSB }
                              );
                    const data = await r.json();
                    if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
                    return res.status(200).json(data);
          }

          // ----------- SUBSTITUIR A LEGISLACAO DE UM EDITAL -----------
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
                                return res.status(404).json({ error: 'Edital nao encontrado.' });
                    }
                    return res.status(200).json(data[0]);
          }

          return res.status(405).json({ error: 'Metodo nao permitido' });
      }

      // ============ MODO PADRAO: gestao completa do edital (comportamento original, intocado) ============
      // ----------- LISTAR TODOS (inclusive inativos) -----------
      if (req.method === 'GET') {
              const r = await fetch(
                        `${SB_URL}/rest/v1/editais?select=*&order=ordem.asc`,
                { headers: headersSB }
                      );
              const data = await r.json();
              if (!r.ok) return res.status(500).json({ error: 'Erro ao listar', detalhe: data });
              return res.status(200).json(data);
      }

      // ----------- CRIAR OU ATUALIZAR (upsert por id) -----------
      if (req.method === 'POST') {
              const { id, orgao, cargo, banca, ano, area, comuns, disciplinas, ordem, ativo } = req.body || {};

          if (!id || !id.trim()) {
                    return res.status(400).json({ error: 'O identificador (id) do edital e obrigatorio.' });
          }
              if (!orgao || !orgao.trim()) {
                        return res.status(400).json({ error: 'O orgao e obrigatorio.' });
              }
              if (!cargo || !cargo.trim()) {
                        return res.status(400).json({ error: 'O cargo e obrigatorio.' });
              }
              if (!banca || !banca.trim()) {
                        return res.status(400).json({ error: 'A banca e obrigatoria.' });
              }
              if (!Number.isFinite(ano)) {
                        return res.status(400).json({ error: 'O ano e obrigatorio.' });
              }
              const temComuns = Array.isArray(comuns) && comuns.length > 0;
              const temDisciplinas = Array.isArray(disciplinas) && disciplinas.length > 0;
              if (!temComuns && !temDisciplinas) {
                        return res.status(400).json({ error: 'Inclua pelo menos uma disciplina (comum ou especifica).' });
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

      // ----------- APAGAR -----------
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

      return res.status(405).json({ error: 'Metodo nao permitido' });
  } catch (err) {
        return res.status(500).json({ error: 'Erro de conexao', detalhe: String(err) });
  }
}
