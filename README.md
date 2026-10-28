# Rolês Veganos (React)

Guia de lugares veganos por cidade, com mapa gratuito (OpenStreetMap), história do veganismo, documentários, receitas, blog, cupons e painel de gestão. Feito com React, Vite, React Router e Leaflet. Não tem backend: todo o conteúdo fica em `src/data/dados.json`, embutido no site.

## Como rodar

```bash
npm install
npm run dev
```

Produção: `npm run build` (saída em `dist/`).

## Publicar de graça (Vercel)

1. Suba o projeto para um repositório **privado** no GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório. A Vercel reconhece o Vite sozinha.
3. Clique em **Deploy**. Não precisa de variável de ambiente.

Para atualizar: `git add -A && git commit -m "..." && git push`. A Vercel publica de novo sozinha.

## Mapa e localização (gratuitos, sem chave)

- **Mapa:** [Leaflet](https://leafletjs.com) com os tiles do [OpenStreetMap](https://www.openstreetmap.org/copyright). As cores são suavizadas por CSS (`.mapa .leaflet-tile-pane` em `src/styles.css`).
- **Busca de cidade:** lista local com os 5.570 municípios do IBGE (`public/municipios.json`, dados de [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), licença MIT). É instantânea e funciona sem serviço externo. Cidades com o mesmo nome são ordenadas pela proximidade de quem busca.
- **Busca de endereço (painel):** [Photon](https://photon.komoot.io), baseado no OpenStreetMap. Leva alguns segundos e preenche cidade, latitude e longitude.
- **Cidade a partir do GPS:** [Nominatim](https://nominatim.org), do OpenStreetMap.

Todos são gratuitos para uso leve. Os tiles do OpenStreetMap são mantidos por voluntários. Se o site crescer muito (milhares de visitas por dia), troque a URL de `TILES` em `src/lib/maps.js` por um provedor com cota gratuita maior, como MapTiler ou Stadia, que pedem cadastro.

Lugares aparecem quando estão a até 40 km do centro da cidade escolhida (`RAIO_KM` em `src/pages/Explore.jsx`).

## Rotas

| Rota | Página |
|---|---|
| `/` | Explorar: cidade, busca, lista e mapa |
| `/lugar/:id` | Detalhe, mini mapa e avaliações |
| `/veganismo` | O que é veganismo e linha do tempo |
| `/documentarios` | Documentários com filtro por tema |
| `/blog`, `/blog/:slug` | Artigos e comentários |
| `/cupons` | Cupons de desconto: copiar código e ir ao site |
| `/salvos` | Lugares salvos (no navegador, sem login) |
| `/sobre`, `/contato` | Institucional |
| `/acesso` | **Login oculto** (sem link no site; mude em `VITE_ROTA_LOGIN`) |
| `/admin` | Painel. Para quem não está logado, aparece como página 404 |

## Painel de gestão

Só quem entra pelo login oculto pode adicionar e editar. O painel tem:

- **Lugares**: fila **Para aprovar** (sugestões ficam ocultas até você aprovar), publicados e rascunhos. O endereço tem sugestões do OpenStreetMap e preenche cidade, latitude e longitude.
- **Blog**: artigos com imagem de capa, data e rascunho (oculto para visitantes), além da moderação de comentários. Cada artigo tem um botão **Editar artigo** que só o admin vê. No texto, `## ` cria subtítulo, `- ` cria item de lista e `**texto**` deixa em negrito.
- **Documentários**: pôster (link ou arquivo enviado), link do filme completo e selo "Grátis".
- **Cupons**: loja, código, destaque do desconto, condições, link, validade (o cupom some do site depois da data), logo e rascunho.
- **Avaliações**: as dos visitantes chegam como "para revisar".
- **Configurações**: troca de e-mail e senha, exportar, importar e restaurar dados.

O lugar também tem um botão **Editar**, que aparece só para o admin.

O e-mail e a senha do admin ficam em `src/data/dados.json` (a senha só como hash SHA-256). Para trocar, use Gestão > Configurações > Minha conta e exporte os dados.

## Como publicar o que você editou

O que você edita no painel fica salvo **só no seu navegador**. Para todo mundo ver (com `npm run dev`, use também o botão **Salvar no projeto**):

1. Painel > Configurações > **Exportar dados**. Isso baixa o arquivo `dados.json`.
2. Substitua `src/data/dados.json` por esse arquivo.
3. Rode `npm run build` e publique de novo.

O arquivo tem um número de versão. Quando um visitante abre o site publicado com dados mais novos, o navegador dele recebe o conteúdo atualizado, e os lugares salvos dele são mantidos.

## Abertura e loading

- A animação de abertura com a logo fica em `index.html`, para aparecer antes de o React carregar. Ela roda completa na primeira visita da sessão; depois disso vira um loading curto. Clique ou Esc pula a animação, e ela respeita "reduzir movimento" do sistema.
- O loading das páginas e do mapa está em `src/components/Carregando.jsx`.
- Os pôsteres ficam em `public/docs/`. Vieram das páginas da Wikipedia de cada filme e são material de divulgação dos produtores.
- `public/logo-marca.webp` é a logo com fundo transparente. A `logo.png` original foi mantida.

## Limites atuais (importante)

- **O login não é segurança de verdade**: sem servidor, qualquer pessoa com conhecimento técnico consegue mexer nos dados do próprio navegador. Avaliações e comentários dos visitantes ficam só no navegador de quem escreveu.
- **O `dados.json` guarda o e-mail e o hash da senha do admin.** Mantenha o repositório do GitHub **privado**.
- **O formulário de contato não envia nada.** Ligue a um serviço como o Formspree.
- Os seis lugares "Exemplo" e os três cupons "Exemplo" (rascunho) são fictícios. Exclua-os quando cadastrar os reais.
