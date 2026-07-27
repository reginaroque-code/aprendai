// /api/welcome-email.js
// Envia o e-mail de boas-vindas personalizado assim que um aluno cria a conta.
// Chamado pelo próprio index.html (função doCad) logo após o cadastro no Supabase.
//
// Autenticação: o pedido precisa vir com o cabeçalho
//   Authorization: Bearer <access_token do Supabase do próprio aluno recém-criado>
// O token é validado contra o Supabase Auth — assim ninguém consegue usar este
// endpoint para mandar e-mail em nome do AprendAI para um endereço qualquer.
//
// Envio feito via API da Resend (https://resend.com) usando só fetch, sem SDK.
// Variáveis de ambiente necessárias:
//   RESEND_API_KEY  -> chave da Resend
//   EMAIL_FROM      -> remetente, ex: "AprendAI <boasvindas@aprendai.net.br>"
//   SITE_URL        -> opcional, ex: "https://aprendai.net.br" (usado nos links do e-mail)

const SB_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iGmTY-Ry_S90JyK9L5QZNg_k1hmJlos';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'AprendAI <boasvindas@aprendai.net.br>';
const SITE_URL = process.env.SITE_URL || 'https://aprendai.net.br';

async function usuarioDoToken(token) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = await r.json();
  return user && user.id ? user : null;
}

function montarEmailHtml(nome) {
  const primeiroNome = (nome || 'Aluno').trim().split(' ')[0];
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#0a1628,#1a2a4a);padding:32px 40px;text-align:center;">
  <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-.5px;">Aprend<span style="color:#f0b429;">AI</span></span>
</td></tr>

<tr><td style="padding:36px 40px 8px;">
  <h1 style="margin:0 0 4px;font-size:22px;color:#1e293b;">Bem-vindo(a), ${primeiroNome}! 🎉</h1>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">
    Sua conta no AprendAI foi criada com sucesso e seus <strong>7 dias grátis</strong> já começaram.
    A partir de agora você pode gerar apostilas com IA feitas sob medida para o seu concurso.
  </p>
</td></tr>

<tr><td style="padding:24px 40px 8px;">
  <h2 style="margin:0 0 12px;font-size:15px;color:#0a1628;text-transform:uppercase;letter-spacing:1px;">Como começar em 3 passos</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;">
        <strong style="color:#f0b429;">1.</strong> Escolha a banca, disciplina e assunto (ou selecione um edital pronto).
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;">
        <strong style="color:#f0b429;">2.</strong> Clique em "Gerar Apostila com IA" e receba, em minutos, o material com Teoria, Ancoragem e Alerta.
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-size:14px;color:#334155;">
        <strong style="color:#f0b429;">3.</strong> Pratique com o teste imediato, misturando questões reais de prova com questões geradas no padrão da banca.
      </td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:8px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
    <tr><td style="padding:18px 20px;">
      <h2 style="margin:0 0 8px;font-size:14px;color:#0a1628;">⚠️ Pontos importantes para ficar de olho</h2>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.8;color:#475569;">
        <li>Seu teste grátis dura <strong>7 dias</strong>; depois disso, escolha o plano Essencial (30 apostilas/mês) ou Pro (150 apostilas/mês) para continuar gerando.</li>
        <li>Toda apostila gerada fica salva automaticamente em <strong>"Minhas Apostilas"</strong>, no seu painel — você pode reabrir quando quiser, sem gastar novo crédito.</li>
        <li>Se o seu e-mail pedir confirmação, verifique também a caixa de <strong>spam/lixo eletrônico</strong>.</li>
        <li>Dúvidas a qualquer momento: <a href="mailto:contato@aprendai.net.br" style="color:#0a1628;">contato@aprendai.net.br</a>.</li>
      </ul>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:28px 40px 8px;">
  <h2 style="margin:0 0 12px;font-size:15px;color:#0a1628;text-transform:uppercase;letter-spacing:1px;">O que o AprendAI tem que outras plataformas não têm</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;vertical-align:top;width:28px;">🧠</td>
      <td style="padding:8px 0;font-size:14px;color:#334155;"><strong>IA treinada por banca</strong> — o conteúdo é pensado para o que FCC, CEBRASPE e FGV realmente cobram, não um resumo genérico de internet.</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;vertical-align:top;">📄</td>
      <td style="padding:8px 0;font-size:14px;color:#334155;"><strong>Estrutura Teoria + Ancoragem + Alerta</strong> — cada apostila já destaca os pontos que a banca gosta de usar em pegadinha.</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;vertical-align:top;">🎯</td>
      <td style="padding:8px 0;font-size:14px;color:#334155;"><strong>Raio-X da Banca incluso</strong> — você já sabe o estilo de cobrança antes de começar a estudar o tema.</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;vertical-align:top;">🗺️</td>
      <td style="padding:8px 0;font-size:14px;color:#334155;"><strong>Mapa mental gerado por IA</strong> — visualização pronta do assunto, sem precisar montar do zero.</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;vertical-align:top;">✅</td>
      <td style="padding:8px 0;font-size:14px;color:#334155;"><strong>Questões reais + geradas por IA</strong> — teste imediato com gabarito comentado, sem sair da tela.</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:32px 40px;text-align:center;">
  <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#f0b429,#e6a817);color:#0a1628;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
    Gerar minha primeira apostila →
  </a>
</td></tr>

<tr><td style="padding:20px 40px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">
    Você recebeu este e-mail porque criou uma conta em AprendAI.<br/>
    Dúvidas? Fale com a gente em <a href="mailto:contato@aprendai.net.br" style="color:#94a3b8;">contato@aprendai.net.br</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso ausente.' });
  }

  const usuario = await usuarioDoToken(token);
  if (!usuario) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY não configurada — e-mail de boas-vindas não enviado.');
    return res.status(200).json({ ok: true, ignorado: 'envio de e-mail não configurado' });
  }

  try {
    const nome = (usuario.user_metadata && usuario.user_metadata.full_name) || usuario.email.split('@')[0];

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: usuario.email,
        subject: `🎉 Bem-vindo(a) ao AprendAI, ${nome.split(' ')[0]}!`,
        html: montarEmailHtml(nome),
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Erro ao enviar e-mail de boas-vindas:', data);
      return res.status(200).json({ ok: false, erro: data });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (erro) {
    console.error('Erro no envio do e-mail de boas-vindas:', erro);
    return res.status(200).json({ ok: false, erro: String(erro) });
  }
}
