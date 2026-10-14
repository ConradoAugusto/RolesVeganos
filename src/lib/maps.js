// Mapas e localização com serviços gratuitos, sem chave de API:
// - Mapa: Leaflet + tiles do OpenStreetMap (cores suavizadas no CSS)
// - Sugestões de cidade e endereço: Photon (photon.komoot.io), busca baseada no OpenStreetMap
// - Cidade a partir do GPS: Nominatim (nominatim.openstreetmap.org), uso leve permitido

export const TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  atribuicao: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdominios: "",
};

// Limita as buscas ao Brasil (oeste, sul, leste, norte)
const BBOX_BRASIL = "-74,-34,-34,5.5";

/* ===== Helpers ===== */

export function normalizar(txt = "") {
  return txt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Distância em km entre dois pontos {lat, lng} (fórmula de Haversine)
export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(km) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}

/* ===== Sugestões (Photon) ===== */

function rotulos(p, soCidade) {
  if (soCidade) return { principal: p.name, secundario: [p.state, p.country].filter(Boolean).join(", ") };
  const rua = [p.street || (p.type === "street" ? p.name : null), p.housenumber].filter(Boolean).join(", ");
  const local = p.type === "street" || p.type === "house" ? rua || p.name : p.name;
  return {
    principal: local,
    secundario: [p.type !== "street" && p.type !== "house" ? rua : null, p.district || p.locality, p.city, p.state].filter(Boolean).join(", "),
  };
}

/* ===== Cidades: lista local dos municípios do IBGE (instantânea, sem serviço externo) ===== */

// public/municipios.json: [nome, UF, lat, lng], capitais primeiro. Baixado só quando alguém busca uma cidade.
let municipiosPromessa = null;
function municipios() {
  if (!municipiosPromessa) {
    municipiosPromessa = fetch("/municipios.json")
      .then((r) => r.json())
      .then((lista) => lista.map(([nome, uf, lat, lng]) => ({ nome, uf, lat, lng, chave: normalizar(nome) })))
      .catch((e) => {
        municipiosPromessa = null;
        throw e;
      });
  }
  return municipiosPromessa;
}

async function buscarCidades(texto, perto) {
  const q = normalizar(texto);
  const lista = await municipios();
  const ranqueados = [];
  for (const m of lista) {
    // 0: começa com o texto; 1: alguma palavra começa com o texto; 2: contém o texto
    const r = m.chave.startsWith(q) ? 0 : m.chave.includes(` ${q}`) ? 1 : m.chave.includes(q) ? 2 : -1;
    if (r >= 0) ranqueados.push({ m, r, d: perto?.lat != null ? distanciaKm(perto, m) : 0 });
  }
  ranqueados.sort((a, b) => a.r - b.r || a.d - b.d || a.m.nome.length - b.m.nome.length);
  return ranqueados.slice(0, 6).map(({ m }) => ({
    id: `${m.nome}-${m.uf}`,
    principal: m.nome,
    secundario: m.uf,
    valor: { nome: m.nome, cidade: m.nome, endereco: `${m.nome}, ${m.uf}`, lat: m.lat, lng: m.lng },
  }));
}

// tipos: ["cidade"] para sugerir só cidades; vazio para endereços e estabelecimentos.
export async function buscarSugestoes(texto, { tipos, sinal, perto } = {}) {
  const soCidade = tipos?.includes("cidade");
  if (soCidade) return buscarCidades(texto, perto);
  const params = new URLSearchParams({ q: texto, limit: "8", bbox: BBOX_BRASIL });
  if (soCidade) params.append("layer", "city");
  if (perto?.lat != null) {
    params.set("lat", perto.lat);
    params.set("lon", perto.lng);
  }
  const r = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: sinal });
  if (!r.ok) throw new Error(`photon ${r.status}`);
  const { features } = await r.json();
  const vistos = new Set();
  return features
    .map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      const { principal, secundario } = rotulos(p, soCidade);
      return {
        id: `${p.osm_type}${p.osm_id}`,
        principal,
        secundario,
        valor: {
          nome: p.name,
          endereco: [principal, secundario].filter(Boolean).join(" — "),
          cidade: soCidade ? p.name : p.city || p.name,
          lat,
          lng,
        },
      };
    })
    .filter((s) => {
      const k = normalizar(s.principal + s.secundario);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, 6);
}

/* ===== Cidade a partir de coordenadas (Nominatim) ===== */

export async function cidadePorCoordenadas(lat, lng) {
  const params = new URLSearchParams({ format: "jsonv2", lat, lon: lng, zoom: "10", "accept-language": "pt-BR" });
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
  if (!r.ok) throw new Error(`nominatim ${r.status}`);
  const j = await r.json();
  const a = j.address || {};
  return a.city || a.town || a.municipality || a.village || null;
}
