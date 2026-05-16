// BTC Oracle — Proxy seguro para Claude API
// La API key NUNCA sale al browser — vive solo en Vercel
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error: 'Method not allowed'}); return; }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) { res.status(500).json({error: 'API key no configurada en Vercel'}); return; }

  try {
    const body = req.body;
    // Validación de seguridad — máximo 2000 tokens para evitar abuso
    if (body.max_tokens && body.max_tokens > 2000) body.max_tokens = 2000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({error: data.error?.message || 'Error de Claude API'});
      return;
    }

    // Extraer solo el texto — evita enviar bloques tool_use al browser
    const textContent = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || '';

    res.status(200).json({
      text: textContent,
      usage: data.usage,
      model: data.model,
    });

  } catch(e) {
    console.error('Claude proxy error:', e);
    res.status(500).json({error: 'Error interno del proxy: ' + e.message});
  }
}
