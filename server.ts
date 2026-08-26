import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Geocode Cache (Coords rounded to 4 decimals ~ 11m radius)
interface CachedGeocode {
  timestamp: number;
  data: any;
}
const reverseGeocodeCache = new Map<string, CachedGeocode>();
const forwardGeocodeCache = new Map<string, CachedGeocode>();
let totalGeocodeRequests = 0;

// Log API request metrics periodically
function logGeocodeUsage(type: string, query: string, hit: boolean) {
  totalGeocodeRequests++;
  console.log(`[GEOCODE-LOG] #${totalGeocodeRequests} ${type} - "${query}" | Cache: ${hit ? 'HIT' : 'MISS'}`);
}

/**
 * Endpoint de Geocodificação Reversa (Coordenadas -> Endereço)
 * GET /api/geocode/reverse?lat=-29.62369&lng=-53.76663
 */
app.get("/api/geocode/reverse", async (req, res) => {
  const { lat, lng, lon } = req.query;
  const latitude = parseFloat((lat as string) || '');
  const longitude = parseFloat(((lng || lon) as string) || '');

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ 
      success: false, 
      error: "Coordenadas inválidas. Informe 'lat' e 'lng' numéricos." 
    });
  }

  // Cache key com 4 casas decimais (~11 metros de precisão)
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h cache
    logGeocodeUsage('REVERSE', cacheKey, true);
    return res.json({
      ...cached.data,
      fromCache: true
    });
  }

  try {
    logGeocodeUsage('REVERSE', cacheKey, false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR,pt`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CBMRS-4BBM-Ocorrencias/1.0 (4bbmciosp@gmail.com)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim error status: ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    // Cascata de Fallbacks para Logradouro / Rua
    const road = addr.road || addr.pedestrian || addr.footway || addr.street || addr.avenue || addr.path || addr.square || addr.suburb || '';
    const houseNumber = addr.house_number || addr.building || addr.door || '';
    
    // Cascata de Fallbacks para Bairro
    const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.city_district || addr.borough || 'Centro';

    // Cascata de Fallbacks para Cidade (Padrão 4º BBM: Santa Maria)
    const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || 'Santa Maria';
    const state = addr.state || 'RS';

    let formattedStreet = '';
    if (road && houseNumber) {
      formattedStreet = `${road}, ${houseNumber}`;
    } else if (road) {
      formattedStreet = road;
    } else {
      formattedStreet = 'Logradouro não identificado';
    }

    const result = {
      success: true,
      address: formattedStreet,
      road: road || 'Logradouro não identificado',
      houseNumber: houseNumber || '',
      neighborhood: neighborhood,
      city: city,
      state: state,
      fullDisplayName: data.display_name || '',
      latitude,
      longitude,
      fromCache: false
    };

    // Salva no cache
    reverseGeocodeCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return res.json(result);
  } catch (err: any) {
    console.warn('[GEOCODE] Falha ou timeout na geocodificação reversa:', err?.message || err);
    // Retorna fallback gracioso sem travar o cliente
    return res.json({
      success: false,
      isFallback: true,
      address: 'Logradouro não identificado',
      road: 'Logradouro não identificado',
      houseNumber: '',
      neighborhood: 'Centro',
      city: 'Santa Maria',
      state: 'RS',
      latitude,
      longitude,
      message: 'Endereço não identificado automaticamente - preencher manualmente'
    });
  }
});

/**
 * Endpoint de Geocodificação Direta (Endereço -> Coordenadas)
 * GET /api/geocode/forward?q=Av+Rio+Branco+450+Santa+Maria
 */
app.get("/api/geocode/forward", async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.status(400).json({ success: false, error: "Parâmetro 'q' obrigatório." });
  }

  const normalizedQuery = query.toLowerCase();
  const cached = forwardGeocodeCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    logGeocodeUsage('FORWARD', normalizedQuery, true);
    return res.json({ ...cached.data, fromCache: true });
  }

  try {
    logGeocodeUsage('FORWARD', normalizedQuery, false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // Prioriza busca na região de Santa Maria / RS
    const searchTarget = query.toLowerCase().includes('santa maria') ? query : `${query}, Santa Maria, RS, Brasil`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchTarget)}&addressdetails=1&countrycodes=br&limit=1&viewbox=-54.1,-29.9,-53.5,-29.4`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CBMRS-4BBM-Ocorrencias/1.0 (4bbmciosp@gmail.com)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim forward status: ${response.status}`);
    }

    const results = await response.json();
    if (results && results.length > 0) {
      const item = results[0];
      const addr = item.address || {};

      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      const road = addr.road || addr.pedestrian || addr.footway || addr.street || addr.avenue || '';
      const houseNumber = addr.house_number || '';
      const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || 'Centro';
      const city = addr.city || addr.town || addr.municipality || 'Santa Maria';

      const result = {
        success: true,
        latitude: lat,
        longitude: lon,
        address: road ? (houseNumber ? `${road}, ${houseNumber}` : road) : query,
        road,
        houseNumber,
        neighborhood,
        city,
        state: addr.state || 'RS',
        fullDisplayName: item.display_name
      };

      forwardGeocodeCache.set(normalizedQuery, {
        timestamp: Date.now(),
        data: result
      });

      return res.json(result);
    } else {
      return res.json({
        success: false,
        message: 'Coordenadas não encontradas para o endereço informado.'
      });
    }
  } catch (err: any) {
    console.warn('[GEOCODE] Erro na busca direta de endereço:', err?.message || err);
    return res.json({
      success: false,
      message: 'Não foi possível buscar coordenadas para este endereço no momento.'
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CBMRS 4º BBM Backend" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
