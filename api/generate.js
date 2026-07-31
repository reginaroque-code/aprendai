export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt ausente.' });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('[generate] Erro Anthropic:', JSON.stringify(data));
      return res.status(resp.status).json({ error: data?.error?.message || 'Erro na IA.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[generate] Erro interno:', err);
    return res.status(500).json({ error: 'Erro de conexão com a IA.' });
  }
}
