// ══════════════════════════════════════════════════════════
// AprendAI — Webhook Hotmart → Supabase
// Recebe notificações do Hotmart e ativa/cancela o plano
// do aluno automaticamente, sem precisar de ação manual.
// ══════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK;

// Código da oferta → plano + ciclo de cobrança correspondente
const OFFER_INFO = {
  'aqho4mg0': { plano: 'essencial', ciclo: 'mensal' },
  '3hmm9l46': { plano: 'essencial', ciclo: 'anual'  },
  'z74o6jlh': { plano: 'pro',       ciclo: 'mensal' },
  't8v8if3i': { plano: 'pro',       ciclo: 'anual'  }
};

const EVENTOS_ATIVACAO = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
const EVENTOS_CANCELAMENTO = [
  'PURCHASE_CANCELED',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_EXPIRED',
  'PURCHASE_PROTEST',
  'SUBSCRIPTION_CANCELLATION'
];

// Soma 1 mês ou 1 ano a uma data ISO, mantendo o "mesmo dia" e corrigindo
// meses mais curtos (ex: 31/jan + 1 mês = 28/fev, não 03/mar)
function proximaRenovacao(dataAtivacaoISO, ciclo) {
  var d = new Date(dataAtivacaoISO);
  var diaOriginal = d.getUTCDate();
  var r = new Date(d.getTime());
  if (ciclo === 'anual') r.setUTCFullYear(r.getUTCFullYear() + 1);
  else r.setUTCMonth(r.getUTCMonth() + 1);
  if (r.getUTCDate() !== diaOriginal) r.setUTCDate(0); // volta pro último dia do mês certo
  return r.toISOString();
}

async function encontrarUsuarioPorEmail(email) {
  var emailAlvo = String(email).trim().toLowerCase();
  var porPagina = 200;
  for (var pagina = 1; pagina <= 15; pagina++) {
    var resp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${pagina}&per_page=${porPagina}`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    var json = await resp.json();
    var usuarios = json.users || [];
    var achado = usuarios.find(function (u) {
      return (u.email || '').trim().toLowerCase() === emailAlvo;
    });
    if (achado) return achado;
    if (usuarios.length < porPagina) break;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  const hottokRecebido = req.headers['x-hotmart-hottok'];
  if (!HOTMART_HOTTOK || hottokRecebido !== HOTMART_HOTTOK) {
    console.warn('Hottok inválido ou ausente na requisição.');
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    const body = req.body || {};
    const evento = body.event;
    const dados = body.data || {};
    const email = dados.buyer && dados.buyer.email;
    const offerCode = dados.purchase && dados.purchase.offer && dados.purchase.offer.code;
    if (!email) {
      return res.status(200).json({ ok: true, ignorado: 'payload sem e-mail do comprador' });
    }
    const usuario = await encontrarUsuarioPorEmail(email);
    if (!usuario) {
      return res.status(200).json({ ok: true, ignorado: `e-mail ${email} não encontrado no AprendAI` });
    }
    var novaMeta = Object.assign({}, usuario.user_metadata);
    if (EVENTOS_ATIVACAO.indexOf(evento) !== -1) {
      var info = OFFER_INFO[offerCode];
      if (!info) {
        return res.status(200).json({ ok: true, ignorado: `oferta ${offerCode} não reconhecida` });
      }
      var agora = new Date().toISOString();
      novaMeta.plano = info.plano;
      novaMeta.apostilas_mes = 0;
      novaMeta.hotmart_offer = offerCode;
      novaMeta.plano_ativado_em = agora;
      // guarda a data do PRIMEIRO pagamento (nunca sobrescreve) — usada para
      // saber quem pagou em junho/2026 e tem direito ao preço de lançamento na renovação
      if (!novaMeta.primeiro_pagamento_em) novaMeta.primeiro_pagamento_em = agora;
      // data de renovação sempre calculada por nós (mesmo dia do mês/ano seguinte),
      // não confiamos no date_next_charge do Hotmart pois ele nem sempre bate com essa regra
      novaMeta.proxima_renovacao = proximaRenovacao(agora, info.ciclo);
    } else if (EVENTOS_CANCELAMENTO.indexOf(evento) !== -1) {
      novaMeta.plano = 'trial';
      novaMeta.plano_cancelado_em = new Date().toISOString();
    } else {
      return res.status(200).json({ ok: true, ignorado: `evento ${evento} não tratado` });
    }
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${usuario.id}`, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_metadata: novaMeta })
    });
    console.log(`Plano atualizado: ${email} → ${novaMeta.plano} (evento: ${evento})`);
    return res.status(200).json({ ok: true, email_da_compra: email, conta_encontrada: usuario.email, evento: evento, plano: novaMeta.plano });
  } catch (erro) {
    console.error('Erro no webhook Hotmart:', erro);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
