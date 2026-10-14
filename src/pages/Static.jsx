import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { PlaceCard, Vazio, Reveal, Campo } from "../components/ui";
import Icon from "../components/Icon";

export function About() {
  return (
    <div className="container pagina-texto">
      <Reveal>
        <span className="kicker">Sobre</span>
        <h1>Um guia feito com <em>carinho e curadoria.</em></h1>
        <p className="lead">O Rolês Veganos reúne lugares veganos e informações confiáveis para quem quer comer, comprar e conviver com mais consciência, no seu ritmo.</p>
      </Reveal>
      <div className="grid-3">
        {[
          ["folha", "Curadoria", "Cada lugar é conferido pela equipe antes de entrar no mapa."],
          ["coracao", "Comunidade", "Avaliações de quem já foi ajudam você a escolher."],
          ["globo", "Sem radicalismo", "Incentivamos pequenas trocas que se sustentam no tempo."],
        ].map(([ic, t, d], i) => (
          <Reveal key={t} delay={i * 0.08}>
            <div className="pilar">
              <span className="pilar-icone"><Icon nome={ic} tamanho={22} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function Contact() {
  const { toast } = useApp();
  const [f, setF] = useState({ nome: "", email: "", assunto: "Indicar um lugar", mensagem: "" });
  const [erros, setErros] = useState({});

  function enviar(e) {
    e.preventDefault();
    const err = {};
    if (f.nome.trim().length < 2) err.nome = "Informe seu nome.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = "E-mail inválido.";
    if (f.mensagem.trim().length < 10) err.mensagem = "Escreva pelo menos 10 caracteres.";
    setErros(err);
    if (Object.keys(err).length) return;
    // Sem backend: a mensagem não é enviada. Ligue a um endpoint ou serviço de e-mail (ex.: Formspree).
    toast("Mensagem recebida. Obrigado!");
    setF({ nome: "", email: "", assunto: "Indicar um lugar", mensagem: "" });
  }

  return (
    <div className="container pagina-pequena">
      <Reveal>
        <span className="kicker">Contato</span>
        <h1>Fale com a gente</h1>
        <p className="lead">Conhece um lugar vegano que não está aqui? Viu uma informação errada? Manda pra gente.</p>
        <form className="painel-form form" onSubmit={enviar} noValidate>
          <div className="grid-2">
            <Campo label="Nome" erro={erros.nome}><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
            <Campo label="E-mail" erro={erros.email}><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
          </div>
          <Campo label="Assunto">
            <select value={f.assunto} onChange={(e) => setF({ ...f, assunto: e.target.value })}>
              <option>Indicar um lugar</option>
              <option>Correção de informação</option>
              <option>Parceria</option>
              <option>Outro</option>
            </select>
          </Campo>
          <Campo label="Mensagem" erro={erros.mensagem}>
            <textarea rows={5} value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} maxLength={800} placeholder="Nome do lugar, endereço, o que tem de bom..." />
          </Campo>
          <button className="btn primario" type="submit">Enviar mensagem</button>
        </form>
      </Reveal>
    </div>
  );
}

export function Favorites() {
  const { state, dispatch } = useApp();
  const salvos = state.places.filter((p) => state.favorites.includes(p.id) && p.status === "aprovado");
  return (
    <div className="container">
      <Reveal>
        <div className="cabeca">
          <span className="kicker">Salvos</span>
          <h1>Sua lista de rolês</h1>
          <p className="muted">{salvos.length} {salvos.length === 1 ? "lugar salvo" : "lugares salvos"} neste navegador.</p>
        </div>
      </Reveal>
      <div className="grid-lugares">
        {salvos.length ? salvos.map((p, i) => (
          <PlaceCard key={p.id} place={p} delay={i * 0.05} favorito onFav={() => dispatch({ type: "fav/toggle", id: p.id })} />
        )) : (
          <Vazio titulo="Sua lista está vazia" texto="Toque no coração dos lugares que você quer visitar.">
            <Link className="btn primario" to="/">Explorar lugares</Link>
          </Vazio>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container pagina-vazia">
      <Vazio titulo="Página não encontrada" texto="O endereço que você abriu não existe.">
        <Link className="btn primario" to="/">Voltar ao início</Link>
      </Vazio>
    </div>
  );
}
