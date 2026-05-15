// BTC Oracle — Proxy Yahoo Finance
// Este archivo corre en los servidores de Vercel, no en el navegador
// Por eso puede llamar a Yahoo Finance sin problema de CORS

export default async function handler(req, res) {
  // Permitir llamadas desde cualquier origen (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60'); // Cache 60 segundos en Vercel

  const symbols = {
    '%5EGSPC': 'sp500',   // S&P 500
    '%5EIXIC': 'nasdaq',  // NASDAQ
    'GC%3DF':  'gold',    // Oro
    'DX-Y.NYB':'dxy',     // Dólar Index
    'CL%3DF':  'oil',     // Petróleo WTI
  };

  const results = {};

  for (const [encoded, key] of Object.entries(symbols)) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        }
      });
      if (!response.ok) continue;
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;
      const closes = result.indicators?.quote?.[0]?.close || [];
      const valid = closes.filter(v => v != null);
      if (valid.length < 2) continue;
      const latest = valid[valid.length - 1];
      const prev = valid[valid.length - 2];
      const chg = ((latest - prev) / prev * 100);
      results[key] = { price: parseFloat(latest.toFixed(2)), change: parseFloat(chg.toFixed(2)) };
    } catch(e) {
      console.error('Yahoo error:', key, e.message);
    }
  }

  res.status(200).json(results);
}
