import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cidadePorCoordenadas } from "../lib/maps";

// Cidade escolhida pelo visitante: { nome, lat, lng, origem: "gps" | "busca" } ou null.
// Fica salva no navegador para não pedir a localização a cada visita.
const KEY = "rv-cidade";

function lerSalva() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch (e) {
    return null;
  }
}

const Ctx = createContext(null);

export function CidadeProvider({ children }) {
  const [cidade, setCidade] = useState(lerSalva);
  const [status, setStatus] = useState("parado"); // parado | localizando | negado | indisponivel

  useEffect(() => {
    try {
      if (cidade) localStorage.setItem(KEY, JSON.stringify(cidade));
      else localStorage.removeItem(KEY);
    } catch (e) {
      /* sem persistência */
    }
  }, [cidade]);

  const localizar = useCallback(() => {
    if (!navigator.geolocation) return setStatus("indisponivel");
    setStatus("localizando");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        let nome = null;
        try {
          nome = await cidadePorCoordenadas(lat, lng);
        } catch (e) {
          /* serviço de endereços fora do ar: segue só com as coordenadas */
        }
        setCidade({ nome: nome || "Perto de você", semNome: !nome, lat, lng, origem: "gps" });
        setStatus("parado");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "negado" : "indisponivel"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  // Primeira visita: tenta descobrir a cidade automaticamente
  useEffect(() => {
    if (!cidade) localizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ cidade, status, localizar, definir: (c) => { setCidade(c); setStatus("parado"); }, limpar: () => setCidade(null) }),
    [cidade, status, localizar]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCidade() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCidade precisa estar dentro de CidadeProvider");
  return ctx;
}
