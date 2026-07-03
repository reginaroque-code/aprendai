// /api/disciplinas.js
// Endpoint PÚBLICO — usado pelo próprio site (index.html) para carregar
// a lista de disciplinas e assuntos na tela de geração de apostilas.
// Só devolve disciplinas com ativo = true. Não precisa de senha.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const SB_URL = process.env.SUPABASE_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const r = await fetch(
      `${SB_URL}/rest/v1/disciplinas?select=nome,modulos,palavras_chave&ativo=eq.true&order=ordem.asc`,
      {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
        },
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: 'Erro ao buscar disciplinas', detalhe: errText });
    }

    const rows = await r.json();

    // Converte a lista do banco no mesmo formato que o site já usa (objeto DISCS)
    const discs = {};
    rows.forEach((row) => {
      discs[row.nome] = {
        mod: row.modulos || [],
        ext: row.palavras_chave || [],
      };
    });

    // Cache leve de 5 minutos — a lista de disciplinas não muda a toda hora
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(discs);
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
