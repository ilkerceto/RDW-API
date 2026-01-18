// Simple Express API that proxies RDW vehicle endpoints, with caching & rate limiting.
const express = require('express');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // cache 5 minutes (5*60 seconds)

app.use(cors()); // configure as needed (restrict origins in production)
app.use(express.json());

// Basic rate limiting: adjust window/max to suit your needs
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

function normalizePlate(raw) {
  if (!raw) return '';
  return String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function fetchJson(url) {
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Upstream error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

app.get('/api/vehicle', async (req, res) => {
  try {
    const rawPlate = req.query.plate || req.query.kenteken || '';
    const plate = normalizePlate(rawPlate);

    if (!plate) {
      return res.status(400).json({ error: 'Kenteken is verplicht' });
    }

    // Use cache key per normalized plate
    const key = `vehicle:${plate}`;
    const cached = cache.get(key);
    if (cached) return res.json({ cached: true, ...cached });

    const basicUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${encodeURIComponent(plate)}`;
    const fuelUrl = `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${encodeURIComponent(plate)}`;

    // Parallel fetch
    const [basicData, fuelData] = await Promise.all([
      fetchJson(basicUrl).catch((e) => { throw e; }),
      fetchJson(fuelUrl).catch((e) => { throw e; })
    ]);

    if (!Array.isArray(basicData) || basicData.length === 0) {
      return res.status(404).json({ error: 'Geen voertuig gevonden', plate });
    }

    const payload = {
      plate,
      basic: basicData[0],
      fuel: Array.isArray(fuelData) ? fuelData : []
    };

    cache.set(key, payload);
    return res.json({ cached: false, ...payload });

  } catch (err) {
    console.error('API error:', err && err.message ? err.message : err);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: 'Er ging iets mis bij het ophalen van gegevens' });
  }
});

// Healthcheck
app.get('/_health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RDW proxy API listening on port ${PORT}`));
