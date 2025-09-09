const http = require('http');
const {parse: parseUrl} = require('url');

const PORT = process.env.PORT || 3000;
const MOCK = String(process.env.MOCK_PROVIDERS || 'true').toLowerCase() === 'true';

function send(res, code, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();  // guard
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch(e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// normalisasi sangat sederhana (cukup untuk mock)
function toE164(num, countryDefault='ID') {
  const onlyDigits = (s) => (s || '').replace(/[^\d+]/g, '');
  num = onlyDigits(num);

  if (num.startsWith('+')) return num;

  if (countryDefault === 'ID') {
    if (num.startsWith('0')) return '+62' + num.slice(1);
    if (/^\d+$/.test(num)) return '+62' + num;
  }
  // fallback kasar: jika angka polos, prefix + (anggap internasional)
  if (/^\d+$/.test(num)) return '+' + num;
  return num;
}

function mockStatus(e164) {
  // deterministik: pakai digit terakhir untuk status
  const last = e164.replace(/[^\d]/g,'').slice(-1);
  const pick = (d) => {
    if (d === '0' || d === '1' || d === '2') return 'registered';
    if (d === '3' || d === '4' || d === '5') return 'not_registered';
    return 'unknown';
  };
  return { wa_status: pick(last), tg_status: pick(String((Number(last)+3)%10)) };
}

const server = http.createServer(async (req, res) => {
  const { pathname } = parseUrl(req.url || '', true);

  // health
  if (req.method === 'GET' && pathname === '/healthz') {
    return send(res, 200, { ok: true, service: 'gateway' });
  }

  // POST /api/v1/quick-check
  if (req.method === 'POST' && pathname === '/api/v1/quick-check') {
    try {
      const body = await readJson(req);
      const numbers = Array.isArray(body.numbers) ? body.numbers : [];
      const platforms = Array.isArray(body.platforms) ? body.platforms : ['whatsapp','telegram'];
      const countryDefault = body.countryDefault || 'ID';

      const items = numbers.slice(0, 100).map(n => {
        const e164 = toE164(n, countryDefault);
        if (MOCK) {
          const st = mockStatus(e164);
          return {
            e164,
            wa_status: platforms.includes('whatsapp') ? st.wa_status : 'unknown',
            tg_status: platforms.includes('telegram')  ? st.tg_status : 'unknown'
          };
        }
        // kalau nanti real provider, taruh logic di sini
        return { e164, wa_status:'unknown', tg_status:'unknown' };
      });

      const sum = { wa: {registered:0,not_registered:0,unknown:0}, tg: {registered:0,not_registered:0,unknown:0} };
      for (const it of items) {
        sum.wa[it.wa_status] = (sum.wa[it.wa_status]||0)+1;
        sum.tg[it.tg_status] = (sum.tg[it.tg_status]||0)+1;
      }

      return send(res, 200, { items, summary: sum });
    } catch (e) {
      return send(res, 400, { error: 'Invalid JSON body', detail: String(e.message||e) });
    }
  }

  // default
  send(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log('Gateway listening on', PORT);
});
