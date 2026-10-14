import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import { Reveal, Vazio } from "../components/ui";
import Icon from "../components/Icon";

export const CATEGORIAS_CUPOM = ["Alimentação", "Mercado", "Cosméticos", "Moda", "Delivery", "Outros"];

export function cupomVencido(c) {
  return Boolean(c.validade) && c.validade < new Date().toISOString().slice(0, 10);
}

const dataBR = (iso) => iso?.split("-").reverse().join("/");

export default function Cupons() {
  const { state, usuario } = useApp();
  const admin = usuario?.role === "admin";
  const [cat, setCat] = useState("Todos");

  // Visitante vê só os publicados e dentro da validade; o admin vê todos, com aviso
  const visiveis = useMemo(
    () => (state.cupons || []).filter((c) => admin || (c.status === "publicado" && !cupomVencido(c))),
    [state.cupons, admin]
  );
  const categorias = ["Todos", ...CATEGORIAS_CUPOM.filter((k) => visiveis.some((c) => c.categoria === k))];
  const lista = visiveis.filter((c) => cat === "Todos" || c.categoria === cat);

  return (
    <div className="container">
      <Reveal>
        <div className="cabeca">
          <span className="kicker">Cupons</span>
          <h1>Descontos para o <em>seu rolê.</em></h1>
          <p className="lead">Cupons de lojas e restaurantes veganos parceiros. Copie o código e use no site da marca.</p>
        </div>
      </Reveal>

      {categorias.length > 2 && (
        <div className="chips" role="group" aria-label="Categorias">
          {categorias.map((k) => (
            <button key={k} className={`chip ${cat === k ? "ativo" : ""}`} aria-pressed={cat === k} onClick={() => setCat(k)}>{k}</button>
          ))}
        </div>
      )}

      <div className="grid-cupons">
        {lista.length ? lista.map((c, i) => (
          <Reveal key={c.id} delay={Math.min(i, 6) * 0.06}>
            <CartaoCupom cupom={c} admin={admin} />
          </Reveal>
        )) : (
          <Vazio titulo="Nenhum cupom no momento" texto="Novos descontos aparecem aqui. Volte em breve." />
        )}
      </div>

      <Reveal>
        <p className="aviso-info">As condições de cada cupom (valor mínimo, validade e produtos) são definidas pela loja. Confira no site antes de finalizar a compra.</p>
      </Reveal>
    </div>
  );
}

function CartaoCupom({ cupom: c, admin }) {
  const { toast } = useApp();
  const [copiado, setCopiado] = useState(false);
  const vencido = cupomVencido(c);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(c.codigo);
    } catch (e) {
      // Navegadores sem permissão de área de transferência: seleciona para copiar à mão
      const t = document.createElement("textarea");
      t.value = c.codigo;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    toast(`Cupom ${c.codigo} copiado`);
    setTimeout(() => setCopiado(false), 2200);
  }

  return (
    <article className={`cupom ${vencido ? "vencido" : ""}`} style={{ "--c": c.cor || "#1f6b2c" }}>
      <div className="cupom-topo">
        {c.imagem ? <img className="cupom-logo" src={c.imagem} alt="" /> : <span className="cupom-logo letra">{c.loja.charAt(0)}</span>}
        <div>
          <strong>{c.loja}</strong>
          <small>{c.categoria}</small>
        </div>
        {c.desconto && <span className="cupom-desconto">{c.desconto}</span>}
      </div>

      {admin && (c.status !== "publicado" || vencido) && (
        <em className={`status ${vencido ? "perigo" : "rascunho"}`}>{vencido ? "vencido: oculto para visitantes" : "rascunho: só você vê"}</em>
      )}

      <p className="cupom-desc">{c.descricao}</p>

      <div className="cupom-corte" aria-hidden="true" />

      <div className="cupom-codigo">
        <code aria-label={`Código do cupom: ${c.codigo}`}>{c.codigo}</code>
        <button className={`btn ${copiado ? "copiado" : "primario"}`} onClick={copiar} disabled={vencido && !admin}>
          <Icon nome={copiado ? "check" : "copiar"} tamanho={16} /> {copiado ? "Copiado!" : "Copiar cupom"}
        </button>
      </div>

      <div className="cupom-rodape">
        <span className="muted">{c.validade ? `Válido até ${dataBR(c.validade)}` : "Sem data de validade"}</span>
        {c.link && (
          <a className="link" href={c.link} target="_blank" rel="noopener noreferrer sponsored">
            Ir ao site <Icon nome="externo" tamanho={14} />
          </a>
        )}
      </div>
    </article>
  );
}
