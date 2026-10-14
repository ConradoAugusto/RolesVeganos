import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILES } from "../lib/maps";
import Carregando from "./Carregando";

const BRASIL = [-14.235, -51.925];

/*
  Mapa (Leaflet + OpenStreetMap) com um pino por lugar.
  lugares: [{ id, nome, lat, lng, media }]
  centro: { lat, lng } usado quando não há lugares para enquadrar.
*/
export default function Mapa({ lugares, ativoId, onSelect, onHover, centro, zoomUnico = 15, compacto = false }) {
  const caixa = useRef(null);
  const mapa = useRef(null);
  const marcadores = useRef(new Map());
  const callbacks = useRef({ onSelect, onHover });
  callbacks.current = { onSelect, onHover };
  const [carregando, setCarregando] = useState(true);

  // Cria o mapa uma vez
  useEffect(() => {
    const m = L.map(caixa.current, {
      center: centro?.lat != null ? [centro.lat, centro.lng] : BRASIL,
      zoom: centro?.lat != null ? 12 : 4,
      zoomControl: false,
      scrollWheelZoom: !compacto,
      dragging: !compacto || !L.Browser.mobile,
    });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    m.attributionControl.setPrefix(false);
    const camada = L.tileLayer(TILES.url, { attribution: TILES.atribuicao, maxZoom: 19 }).addTo(m);
    camada.once("load", () => setCarregando(false));
    mapa.current = m;

    // O contêiner pode mudar de tamanho (alternar lista/mapa no celular)
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(caixa.current);

    return () => {
      ro.disconnect();
      m.remove();
      mapa.current = null;
      marcadores.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza os pinos e enquadra
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const atuais = marcadores.current;
    const validos = lugares.filter((p) => p.lat != null && p.lng != null);
    const ids = new Set(validos.map((p) => p.id));

    for (const [id, mk] of atuais) {
      if (!ids.has(id)) {
        mk.remove();
        atuais.delete(id);
      }
    }

    validos.forEach((p, i) => {
      let mk = atuais.get(p.id);
      if (!mk) {
        mk = L.marker([p.lat, p.lng], {
          title: p.nome,
          riseOnHover: true,
          icon: L.divIcon({ className: "pino-leaflet", html: `<div class="pino" style="--i:${i}"><span class="pino-bolha"></span></div>`, iconSize: null }),
        }).addTo(m);
        mk.on("click", () => callbacks.current.onSelect?.(p.id));
        mk.on("mouseover", () => callbacks.current.onHover?.(p.id));
        mk.on("mouseout", () => callbacks.current.onHover?.(null));
        atuais.set(p.id, mk);
      } else {
        mk.setLatLng([p.lat, p.lng]);
      }
      const bolha = mk.getElement()?.querySelector(".pino-bolha");
      if (bolha) bolha.textContent = p.media ? `★ ${Number(p.media).toFixed(1)}` : "Novo";
    });

    if (validos.length > 1) {
      m.fitBounds(L.latLngBounds(validos.map((p) => [p.lat, p.lng])), { padding: [56, 56], maxZoom: 15 });
    } else if (validos.length === 1) {
      m.setView([validos[0].lat, validos[0].lng], zoomUnico);
    } else if (centro?.lat != null) {
      m.setView([centro.lat, centro.lng], 12);
    }
  }, [lugares, centro, zoomUnico]);

  // Destaque do pino ativo (hover na lista)
  useEffect(() => {
    for (const [id, mk] of marcadores.current) {
      const on = id === ativoId;
      mk.getElement()?.querySelector(".pino")?.classList.toggle("ativo", on);
      mk.setZIndexOffset(on ? 1000 : 0);
    }
  }, [ativoId, lugares]);

  return (
    <div className={`mapa-wrap ${compacto ? "compacto" : ""}`}>
      <div ref={caixa} className="mapa" />
      {carregando && (
        <div className="mapa-camada"><Carregando texto="Carregando mapa" /></div>
      )}
    </div>
  );
}
