// /api/perfil.js
// Endpoint do ALUNO LOGADO — perfil de estudo (nível, tempo de estudo, objetivo, edital-alvo).
// Autenticação: o pedido precisa vir com o cabeçalho
//   Authorization: Bearer <access_token do Supabase do próprio aluno>
// O token é validado contra o Supabase Auth antes de qualquer leitura/escrita,
// e todo acesso à tabela é sempre filtrado pelo user_id do dono do token.
//
// GET  /api/perfil   -> devolve o perfil do usuário logado, ou null se ainda não preencheu
//                        (front-end usa isso para decidir se mostra o onboarding).
// POST /api/perfil    -> cria ou atualiza o perfil (upsert por user_id).
//                        O nível (iniciante/intermediario/avancado) é calculado no servidor
//                        a partir do tempo_estudo, a menos que nivel_manual=true seja enviado
//                        junto com um nivel válido (usuário ajustou manualmente).

const SB_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEMPOS_VALIDOS = ['nunca', 'menos_6m', '6m_2anos', 'mais_2anos'];
const OBJETIVOS_VALIDOS = ['primeira_tentativa', 'reforco_materia', 'reta_final'];
const NIVEIS_VALIDOS = ['iniciante', 'intermediario', 'avancado'];

function calcularNivel(tempo_estudo) {
  if (tempo_estudo === 'mais_2anos') return 'avancado';
  if (tempo_estudo === '6m_2anos') return 'intermediario';
  return 'iniciante'; // 'nunca' ou 'menos_6m'
}

async function usuarioDoToken(token) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
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
    // ───────────── LER PERFIL ─────────────
    if (req.method === 'GET') {
      const r = await fetch(
        `${SB_URL}/rest/v1/perfis_usuario?user_id=eq.${usuario.id}&select=*`,
        { headers: headersSB }
      );
      const rows = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao buscar perfil', detalhe: rows });
      return res.status(200).json(rows.length ? rows[0] : null);
    }

    // ───────────── CRIAR OU ATUALIZAR (upsert por user_id) ─────────────
    if (req.method === 'POST') {
      const { tempo_estudo, horas_semana, objetivo, edital_alvo, banca_alvo, nivel_manual, nivel } = req.body || {};

      if (!TEMPOS_VALIDOS.includes(tempo_estudo)) {
        return res.status(400).json({ error: 'Informe há quanto tempo você estuda.' });
      }
      if (objetivo && !OBJETIVOS_VALIDOS.includes(objetivo)) {
        return res.status(400).json({ error: 'Objetivo inválido.' });
      }

      const usaNivelManual = nivel_manual === true && NIVEIS_VALIDOS.includes(nivel);
      const payload = {
        user_id: usuario.id,
        tempo_estudo,
        horas_semana: Number.isFinite(horas_semana) ? horas_semana : null,
        objetivo: objetivo || null,
        edital_alvo: edital_alvo || null,
        banca_alvo: (banca_alvo && String(banca_alvo).trim()) || null,
        nivel: usaNivelManual ? nivel : calcularNivel(tempo_estudo),
        nivel_manual: usaNivelManual,
        atualizado_em: new Date().toISOString(),
      };

      const r = await fetch(`${SB_URL}/rest/v1/perfis_usuario?on_conflict=user_id`, {
        method: 'POST',
        headers: { ...headersSB, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Erro ao salvar perfil', detalhe: data });
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro de conexão', detalhe: String(err) });
  }
}
