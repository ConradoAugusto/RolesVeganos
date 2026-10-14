import { Link } from "react-router-dom";
import { Reveal } from "../components/ui";
import Icon from "../components/Icon";

const LINHA = [
  { ano: "séc. VI a.C.", titulo: "Pitágoras e o ahimsa", texto: "Na Grécia, Pitágoras defende uma dieta sem carne: até o século XIX, vegetarianos eram chamados de “pitagóricos”. Na Índia, o jainismo e o budismo difundem o ahimsa, o princípio de não causar mal a nenhum ser vivo." },
  { ano: "1847", titulo: "Nasce a Vegetarian Society", texto: "Na Inglaterra é fundada a primeira sociedade vegetariana organizada. Parte dos membros já questiona também o consumo de ovos e leite." },
  { ano: "1944", titulo: "A palavra “vegan”", texto: "Em novembro, Donald Watson, Dorothy Morgan e outras pessoas fundam a The Vegan Society. O nome junta o começo e o fim de “vegetarian”: o veganismo seria o começo e o fim do vegetarianismo." },
  { ano: "1949", titulo: "A primeira definição", texto: "Leslie Cross propõe que o veganismo é o princípio de emancipar os animais da exploração pelo ser humano, indo além do prato." },
  { ano: "1975", titulo: "Libertação Animal", texto: "O filósofo Peter Singer publica o livro que leva a discussão sobre direitos e sofrimento animal para universidades e para o grande público." },
  { ano: "1979", titulo: "A definição de hoje", texto: "A Vegan Society se torna instituição beneficente e registra a definição usada até hoje (veja acima)." },
  { ano: "1994", titulo: "Dia Mundial do Veganismo", texto: "Nos 50 anos da Vegan Society, Louise Wallis cria o World Vegan Day, celebrado em 1º de novembro." },
  { ano: "2003", titulo: "SVB no Brasil", texto: "É fundada a Sociedade Vegetariana Brasileira, que depois cria o Selo Vegano para identificar produtos sem ingredientes de origem animal nem testes em animais." },
  { ano: "2014", titulo: "Veganuary e a era digital", texto: "A campanha de experimentar o veganismo em janeiro surge no Reino Unido e se espalha pelo mundo, junto com receitas, perfis e documentários nas redes." },
];

const PILARES = [
  { icone: "coracao", titulo: "Pelos animais", texto: "A base do movimento: animais sentem dor e medo, e não deveriam ser tratados como produtos." },
  { icone: "globo", titulo: "Pelo planeta", texto: "A FAO estima que a pecuária responde por cerca de 14,5% das emissões de gases de efeito estufa causadas por humanos, além de usar muita terra e água." },
  { icone: "folha", titulo: "Pela saúde", texto: "Entidades de nutrição consideram dietas veganas bem planejadas adequadas em todas as fases da vida. A vitamina B12 precisa ser suplementada." },
];

const COMPARA = [
  { titulo: "Vegetariano", itens: ["Não come nenhum tipo de carne: boi, frango, peixe, frutos do mar", "Pode consumir ovos, leite e mel"] },
  { titulo: "Vegetariano estrito", itens: ["Não consome nenhum ingrediente de origem animal na alimentação", "A escolha fica no prato"] },
  { titulo: "Vegano", itens: ["Alimentação 100% vegetal", "Evita couro, lã, seda e cosméticos testados em animais", "Recusa entretenimento com animais, como rodeios e aquários"], destaque: true },
];

export default function Veganismo() {
  return (
    <div className="veganismo">
      <section className="container pagina-texto">
        <Reveal>
          <span className="kicker">O que é veganismo</span>
          <h1>Mais que uma dieta: <em>um jeito de viver.</em></h1>
          <p className="lead">O veganismo nasceu da pergunta “por que usamos animais?” e virou um movimento global que toca comida, roupa, ciência e cultura.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <blockquote className="definicao">
            <p>“Veganismo é uma filosofia e um modo de vida que busca excluir, na medida do possível e praticável, todas as formas de exploração e crueldade contra animais, seja para alimentação, vestuário ou qualquer outra finalidade.”</p>
            <cite>Definição da The Vegan Society (tradução livre)</cite>
          </blockquote>
        </Reveal>
      </section>

      <section className="container secao">
        <Reveal><h2 className="titulo-secao">Por que as pessoas se tornam veganas</h2></Reveal>
        <div className="grid-3">
          {PILARES.map((p, i) => (
            <Reveal key={p.titulo} delay={i * 0.08}>
              <div className="pilar">
                <span className="pilar-icone"><Icon nome={p.icone} tamanho={22} /></span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container secao">
        <Reveal><h2 className="titulo-secao">Vegano e vegetariano não são a mesma coisa</h2></Reveal>
        <div className="grid-3">
          {COMPARA.map((c, i) => (
            <Reveal key={c.titulo} delay={i * 0.08}>
              <div className={`compara ${c.destaque ? "destaque" : ""}`}>
                <h3>{c.titulo}</h3>
                <ul>{c.itens.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container secao">
        <Reveal>
          <h2 className="titulo-secao">Uma história de mais de 2.500 anos</h2>
        </Reveal>
        <ol className="linha-tempo">
          {LINHA.map((m, i) => (
            <Reveal as="li" key={m.ano} delay={0.04} className={i % 2 ? "dir" : "esq"}>
              <span className="lt-ano">{m.ano}</span>
              <div className="lt-cartao">
                <h3>{m.titulo}</h3>
                <p>{m.texto}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="container secao">
        <Reveal>
          <div className="cta-final">
            <div>
              <h2>Quer ir mais fundo?</h2>
              <p>Separamos documentários para quem está começando e para quem quer entender melhor o movimento.</p>
            </div>
            <div className="acoes-detalhe">
              <Link className="btn primario" to="/documentarios"><Icon nome="play" tamanho={16} cheio /> Ver documentários</Link>
              <Link className="btn" to="/">Achar um rolê vegano</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
