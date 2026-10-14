import { useEffect, useId, useState } from "react";
import { buscarSugestoes, normalizar } from "../lib/maps";
import Icon from "./Icon";

/*
  Campo com sugestões do OpenStreetMap (Photon), gratuito e sem chave.
  - tipos: ["cidade"] para sugerir só cidades; vazio para endereços e estabelecimentos.
  - locais: lista de { principal, secundario, valor } que aparece primeiro (ex.: cidades com lugares cadastrados)
    e sozinha se o serviço de busca estiver fora do ar.
  - onEscolher(resultado): { nome, endereco, cidade, lat, lng }.
  - onTextoLivre(texto): Enter sem escolher sugestão.
*/
export default function Autocomplete({
  valor,
  onChange,
  onEscolher,
  onTextoLivre,
  tipos,
  perto,
  locais = [],
  placeholder,
  icone = "busca",
  rotulo,
  inputRef,
  className = "",
}) {
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [buscando, setBuscando] = useState(false);
  const listaId = useId();

  useEffect(() => {
    const texto = valor.trim();
    if (texto.length < 2) {
      setSugestoes([]);
      return;
    }
    const n = normalizar(texto);
    const daCasa = locais.filter((s) => normalizar(s.principal).includes(n)).slice(0, 3);
    setSugestoes(daCasa);
    // Espera a pessoa parar de digitar e cancela a busca anterior
    const controle = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBuscando(true);
        const res = await buscarSugestoes(texto, { tipos, perto, sinal: controle.signal });
        const repetida = (s) => daCasa.some((c) => normalizar(c.principal) === normalizar(s.principal));
        setSugestoes([...daCasa, ...res.filter((s) => !repetida(s))].slice(0, 6));
      } catch (e) {
        /* serviço fora do ar: ficam só as sugestões da casa */
      } finally {
        if (!controle.signal.aborted) setBuscando(false);
      }
    }, tipos?.includes("cidade") ? 120 : 350);
    return () => {
      clearTimeout(t);
      controle.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  function escolher(s) {
    setAberto(false);
    setAtivo(-1);
    onEscolher(s.valor);
  }

  function teclas(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => Math.min(sugestoes.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (aberto && ativo >= 0 && sugestoes[ativo]) escolher(sugestoes[ativo]);
      else if (aberto && sugestoes.length > 0 && valor.trim()) escolher(sugestoes[0]);
      else {
        setAberto(false);
        onTextoLivre?.(valor.trim());
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  const soCidade = tipos?.includes("cidade");
  const mostrar = aberto && (sugestoes.length > 0 || (buscando && !soCidade));

  return (
    <div className={`auto ${mostrar ? "aberto" : ""} ${className}`}>
      <Icon nome={icone} className="auto-icone" />
      <input
        ref={inputRef}
        type="text"
        value={valor}
        placeholder={placeholder}
        aria-label={rotulo || placeholder}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={ativo >= 0 ? `${listaId}-${ativo}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
          setAtivo(-1);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={teclas}
      />
      {buscando && <span className="auto-giro" aria-hidden="true" />}
      {mostrar && (
        <ul className="auto-lista" id={listaId} role="listbox">
          {sugestoes.map((s, i) => (
            <li
              key={s.id || s.principal}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === ativo}
              className={i === ativo ? "ativo" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(s);
              }}
              onMouseEnter={() => setAtivo(i)}
              style={{ "--i": i }}
            >
              <Icon nome="pin" tamanho={16} />
              <span>
                <b>{s.principal}</b>
                {s.secundario && <small>{s.secundario}</small>}
              </span>
            </li>
          ))}
          {buscando && !soCidade && <li className="auto-buscando" aria-live="polite">Buscando endereços…</li>}
          <li className="auto-google" aria-hidden="true">{soCidade ? "Municípios: IBGE" : "© OpenStreetMap"}</li>
        </ul>
      )}
    </div>
  );
}
