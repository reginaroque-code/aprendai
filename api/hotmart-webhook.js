// ══════════════════════════════════════════════════════════
// AprendAI — Webhook Hotmart → Supabase
// Recebe notificações do Hotmart e ativa/cancela o plano
// do aluno automaticamente, sem precisar de ação manual.
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK;

// Código da oferta (o que vem depois de "off=" no link de checkout) → plano correspondente
const OFFER_TO_PLAN = {
  'aqho4mg0': 'essencial', // Essencial mensal
  '3hmm9l46': 'essencial', // Essencial anual
  'z74o6jlh': 'pro',       // Pro mensal
  't8v8if3i': 'pro'        // Pro anual
};

// Eventos do Hotmart que ATIVAM ou RENOVAM o plano
const EVENTOS_ATIVACAO = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];

// Eventos do Hotmart que CANCELAM o plano (aluno volta para o Teste Grátis)
const EVENTOS_CANCELAMENTO = [
  'PURCHASE_CANCELED',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_EXPIRED',
  'PURCHASE_PROTEST',
  'SUBSCRIPTION_CANCELLATION'
];

// Busca um usuário do Supabase pelo e-mail, percorrendo as páginas de resultados
// (a API do Supabase não filtra de forma confiável por e-mail via query string,
// então comparamos manualmente até encontrar a conta certa)
async function encontrarUsuarioPorEmail(email) {
  var emailAlvo = String(email).trim().toLowerCase();
  var porPagina = 200;
  for (var pagina = 1; pagina <= 15; pagina++) {
    var resp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${pagina}&per_page=${porPagina}`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    );
    var json = await resp.json();
    var usuarios = json.users || [];
    var achado = usuarios.find(function (u) {
      return (u.email || '').trim().toLowerCase() === emailAlvo;
    });
    if (achado) return achado;
    if (usuarios.length < porPagina) break; // acabaram as páginas
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // 1) Confirma que a notificação realmente veio do Hotmart (não de qualquer pessoa)
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

    // 2) Procura o aluno no Supabase pelo e-mail dele
    //    (o filtro "?email=" da API do Supabase não é confiável, então
    //    percorremos as páginas de usuários e comparamos o e-mail manualmente)
    const usuario = await encontrarUsuarioPorEmail(email);

    if (!usuario) {
      // A pessoa comprou mas ainda não tem conta no AprendAI (ou usou e-mail diferente)
      return res.status(200).json({ ok: true, ignorado: `e-mail ${email} não encontrado no AprendAI` });
    }

    var novaMeta = Object.assign({}, usuario.user_metadata);

    if (EVENTOS_ATIVACAO.indexOf(evento) !== -1) {
      var plano = OFFER_TO_PLAN[offerCode];
      if (!plano) {
        return res.status(200).json({ ok: true, ignorado: `oferta ${offerCode} não reconhecida` });
      }
      novaMeta.plano = plano;
      novaMeta.apostilas_mes = 0; // zera a contagem a cada ativação ou renovação mensal
      novaMeta.hotmart_offer = offerCode;
      novaMeta.plano_ativado_em = new Date().toISOString();
    } else if (EVENTOS_CANCELAMENTO.indexOf(evento) !== -1) {
      novaMeta.plano = 'trial';
      novaMeta.plano_cancelado_em = new Date().toISOString();
    } else {
      // Evento que não precisa de ação (ex: boleto impresso, aguardando pagamento)
      return res.status(200).json({ ok: true, ignorado: `evento ${evento} não tratado` });
    }

    // 3) Atualiza o cadastro do aluno no Supabase
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
