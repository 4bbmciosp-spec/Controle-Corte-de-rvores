/**
 * Serviço de Geocodificação Direta e Reversa (4º BBM - Santa Maria)
 * Suporte a formatos de coordenadas GPS, preenchimento automático de endereço,
 * cache de proximidade geográfica, fallback em cascata e não-bloqueio de interface.
 */

export interface GeocodeAddressResult {
  success: boolean;
  address: string;         // Logradouro / Rua e Número
  road: string;            // Rua isolada
  houseNumber: string;     // Número
  neighborhood: string;    // Bairro
  city: string;            // Cidade (Padrão: Santa Maria)
  state: string;           // UF (RS)
  latitude: number;
  longitude: number;
  fullDisplayName?: string;
  fromCache?: boolean;
  isFallback?: boolean;
  message?: string;
}

// LocalStorage cache key
const LOCAL_GEOCODE_CACHE_KEY = 'cbmrs_geocode_cache_v1';

function getLocalCache(): Record<string, { timestamp: number; data: GeocodeAddressResult }> {
  try {
    const raw = localStorage.getItem(LOCAL_GEOCODE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalCache(key: string, data: GeocodeAddressResult) {
  try {
    const cache = getLocalCache();
    cache[key] = { timestamp: Date.now(), data };
    // Limit cache size to 200 entries
    const keys = Object.keys(cache);
    if (keys.length > 200) {
      delete cache[keys[0]];
    }
    localStorage.setItem(LOCAL_GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Falha ao gravar cache de geocodificação local:', e);
  }
}

/**
 * Analisa e extrai Latitude e Longitude de diferentes formatos de entrada de texto.
 * Exemplo aceito:
 * - "-29.623693597713423, -53.76663587856028"
 * - "-29.623693597713423 -53.76663587856028"
 * - "-29.623693597713423;-53.76663587856028"
 * - "Lat: -29.62369, Lng: -53.76663"
 */
export function parseCoordinateInput(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;

  const clean = input.trim();
  if (!clean) return null;

  // Regex para capturar dois números decimais (positivos ou negativos)
  const coordRegex = /([-+]?[0-9]{1,3}\.[0-9]{3,20})[\s,;/:|]+([-+]?[0-9]{1,3}\.[0-9]{3,20})/;
  const match = clean.match(coordRegex);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Fallback: Se for separado por vírgula simples ex: "-29.684, -53.806"
  const parts = clean.split(/[,;\s]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
  if (parts.length >= 2) {
    const lat = parts[0];
    const lng = parts[1];
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Geocodificação Reversa: Coordenadas GPS (Lat, Lng) -> Endereço Completo
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeAddressResult> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  // 1. Checa Cache Local do Navegador
  const localCache = getLocalCache();
  if (localCache[cacheKey] && Date.now() - localCache[cacheKey].timestamp < 7 * 24 * 60 * 60 * 1000) {
    return {
      ...localCache[cacheKey].data,
      fromCache: true
    };
  }

  // 2. Chama API Backend Segura (/api/geocode/reverse) com Timeout de 4s
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: GeocodeAddressResult = await response.json();
      if (data && data.success) {
        setLocalCache(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[ReverseGeocode] Erro ou timeout na chamada do backend, tentando fallback direto:', err);
  }

  // 3. Fallback Direto ao OpenStreetMap (Caso o backend esteja inacessível ou em modo offline)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR,pt`;
    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const road = addr.road || addr.pedestrian || addr.footway || addr.street || addr.avenue || addr.square || addr.path || '';
      const houseNumber = addr.house_number || addr.building || '';
      const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || 'Centro';
      const city = addr.city || addr.town || addr.municipality || 'Santa Maria';

      let formattedStreet = 'Logradouro não identificado';
      if (road && houseNumber) {
        formattedStreet = `${road}, ${houseNumber}`;
      } else if (road) {
        formattedStreet = road;
      }

      const result: GeocodeAddressResult = {
        success: true,
        address: formattedStreet,
        road: road || 'Logradouro não identificado',
        houseNumber,
        neighborhood,
        city,
        state: addr.state || 'RS',
        latitude,
        longitude,
        fullDisplayName: data.display_name,
        fromCache: false
      };

      setLocalCache(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[ReverseGeocode] Fallback direto também falhou:', err);
  }

  // 4. Fallback Seguro: Nunca quebra o formulário
  return {
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
  };
}

/**
 * Geocodificação Direta: Endereço / Texto -> Coordenadas GPS (Lat, Lng)
 */
export async function forwardGeocode(addressQuery: string, neighborhoodHint?: string, cityHint?: string): Promise<GeocodeAddressResult | null> {
  const clean = addressQuery.trim();
  if (!clean || clean.length < 3) return null;

  const targetCity = cityHint?.trim() || 'Santa Maria';
  const targetNb = neighborhoodHint?.trim() || '';
  const fullSearch = `${clean}${targetNb ? `, ${targetNb}` : ''}, ${targetCity}, RS, Brasil`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`/api/geocode/forward?q=${encodeURIComponent(fullSearch)}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[ForwardGeocode] Backend forward falhou, tentando fallback direto:', err);
  }

  // Fallback Direto
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(fullSearch)}&addressdetails=1&countrycodes=br&limit=1&viewbox=-54.1,-29.9,-53.5,-29.4`;
    const response = await fetch(url, { signal: controller.signal });

    clearTimeout(timeoutId);

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        const item = results[0];
        const addr = item.address || {};
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const road = addr.road || addr.pedestrian || addr.street || addr.avenue || '';
        const houseNumber = addr.house_number || '';

        return {
          success: true,
          latitude: lat,
          longitude: lon,
          address: road ? (houseNumber ? `${road}, ${houseNumber}` : road) : clean,
          road,
          houseNumber,
          neighborhood: addr.suburb || addr.neighbourhood || 'Centro',
          city: addr.city || addr.town || targetCity,
          state: addr.state || 'RS',
          fullDisplayName: item.display_name
        };
      }
    }
  } catch (err) {
    console.warn('[ForwardGeocode] Fallback direto falhou:', err);
  }

  return null;
}
