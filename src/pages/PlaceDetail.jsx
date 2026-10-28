import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp, mediaDoLugar } from "../store/AppContext";
import { Estrelas, Capa, PlaceCard, RedesSociais, Vazio, Reveal } from "../components/ui";
import Mapa from "../components/Mapa";
import Icon from "../components/Icon";

export default function PlaceDetail() {
  const { id } = useParams();
  const { state, dispatch, usuario, toast } = useApp();
  const lugar = state.places.find((p) => p.id === id);
  const admin = usuario?.role === "admin";
  const pino = useMemo(() => (lugar ? [{ ...lugar, media: mediaDoLugar(lugar) }] : []), [lugar]);

  if (!lugar || (lugar.status !== "aprovado" && !admin)) {
    return (
      <div className="container pagina-vazia">
        <Vazio titulo="Lugar não encontrado" texto="Ele pode ter sido removido.">
          <Link to="/" className="btn primario">Voltar para Explorar</Link>
        </Vazio>
      </div>
    );
  }

  const media = mediaDoLugar(lugar);
  const totalGoogle = Number(lugar.totalGoogle) || 0;
  const favorito = state.favorites.includes(id);
  const similares = state.places
    .filter((p) => p.id !== id && p.status === "aprovado" && (p.tipo === lugar.tipo || p.cidade === lugar.cidade))
    .slice(0, 3);

  function compartilhar() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: lugar.nome, text: `${lugar.nome} · Rolês Veganos`, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => toast("Link copiado"));
  }

  // Busca pelo nome + endereço + cidade: o Google acha o estabelecimento exato.
  // As coordenadas salvas podem ser aproximadas (centro da rua), então só entram se não houver endereço.
  const busca = [lugar.nome, lugar.endereco?.replace(/\s+—\s+/g, ", "), lugar.cidade].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    lugar.endereco ? busca : `${lugar.lat},${lugar.lng}`
  )}`;

  return (
    <div className="container detalhe">
      <Link to="/" className="voltar"><Icon nome="voltar" tamanho={16} /> Explorar</Link>

      <Reveal>
        <div className="detalhe-capa">
          <Capa nome={lugar.nome} cor={lugar.cor} imagem={lugar.imagem} />
          <div className="detalhe-titulo">
            {lugar.status !== "aprovado" && <span className="status rascunho">Rascunho: só você vê</span>}
            <h1>{lugar.nome}</h1>
            <div className="meta">
              {media ? <Estrelas nota={media} /> : null}
              {totalGoogle ? <span>{totalGoogle.toLocaleString("pt-BR")} avaliações no Google</span> : null}
              <span>{lugar.tipo}</span>
              {lugar.cidade && <span>{lugar.cidade}</span>}
            </div>
            <div className="etiquetas">
              {lugar.tags.map((t) => <span key={t} className="etq">{t}</span>)}
            </div>
            <div className="acoes-detalhe">
              <button className={`btn ${favorito ? "primario" : ""}`} onClick={() => dispatch({ type: "fav/toggle", id })} aria-pressed={favorito}>
                <Icon nome="coracao" tamanho={16} cheio={favorito} /> {favorito ? "Salvo" : "Salvar"}
              </button>
              <button className="btn" onClick={compartilhar}><Icon nome="compartilhar" tamanho={16} /> Compartilhar</button>
              <a className="btn" href={mapsUrl} target="_blank" rel="noreferrer"><Icon nome="externo" tamanho={16} /> Abrir no Google Maps</a>
              {admin && (
                <Link className="btn escuro" to={`/admin?aba=lugares&editar=${id}`}><Icon nome="editar" tamanho={16} /> Editar</Link>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="detalhe-grid">
        <div>
          <Reveal delay={0.05}>
            <section className="bloco-info">
              <h2>Sobre</h2>
              <p>{lugar.descricao}</p>
              <ul className="dados">
                <li><Icon nome="pin" /><span>{lugar.endereco}</span></li>
                <li><Icon nome="relogio" /><span>{lugar.horario || "Horário não informado"}</span></li>
                {lugar.telefone && <li><Icon nome="telefone" /><a href={`tel:${lugar.telefone.replace(/\D/g, "")}`}>{lugar.telefone}</a></li>}
                {lugar.site && <li><Icon nome="globo" /><a href={lugar.site} target="_blank" rel="noreferrer">Site</a></li>}
              </ul>
              <RedesSociais redes={lugar.redes} className="redes-detalhe" />
              <p className="aviso-info">Confira horários e cardápio no local antes de ir.</p>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="bloco-info">
              <div className="linha-topo">
                <h2>Avaliações</h2>
                <a className="btn" href={mapsUrl} target="_blank" rel="noreferrer"><Icon nome="externo" tamanho={16} /> Ver avaliações no Google</a>
              </div>
              {media ? (
                <p className="nota-resumo">
                  <Estrelas nota={media} /> no Google{totalGoogle ? `, com ${totalGoogle.toLocaleString("pt-BR")} avaliações` : ""}.
                </p>
              ) : (
                <p className="muted">Ainda não temos a nota deste lugar. Veja o que as pessoas dizem no Google.</p>
              )}
            </section>
          </Reveal>
        </div>

        <aside className="detalhe-lado">
          <Reveal delay={0.12}>
            <div className="mini-mapa">
              <Mapa lugares={pino} compacto zoomUnico={16} />
            </div>
          </Reveal>
          {similares.length > 0 && (
            <Reveal delay={0.18}>
              <div className="bloco-info">
                <h3>Você também pode gostar</h3>
                <div className="lista-mini">
                  {similares.map((p) => <PlaceCard key={p.id} place={p} />)}
                </div>
              </div>
            </Reveal>
          )}
        </aside>
      </div>
    </div>
  );
}
