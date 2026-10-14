# Rolês Veganos (React)

Guia de lugares veganos por cidade, com mapa gratuito (OpenStreetMap), história do veganismo, documentários, receitas, blog, cupons e painel de gestão. Feito com React, Vite, React Router e Leaflet, com backend no Supabase.

## Como rodar

```bash
npm install
npm run dev
```

Produção: `npm run build` (saída em `dist/`).

O site tem dois modos:

- **Com servidor (Supabase):** quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas. Login real, edições salvas na hora para todo mundo, avaliações e comentários dos visitantes chegam ao painel e as imagens ficam no Supabase Storage.
- **Local:** sem essas variáveis. O conteúdo vem de `src/data/dados.json` e as edições ficam no navegador (veja "Modo local" no fim).

## Publicar de graça (Vercel + Supabase)

### 1. Supabase (banco, login e imagens)

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (plano Free). Guarde a senha do banco.
2. Em **SQL Editor > New query**, cole todo o arquivo `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Users > Add user > Create new user**, crie o seu usuário de admin (e-mail e senha). Marque **Auto Confirm User**.
4. De volta ao **SQL Editor**, rode (trocando o e-mail):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'seu@email.com';
   ```
5. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.

### 2. GitHub

1. Crie um repositório **privado** em [github.com/new](https://github.com/new) (sem README).
2. No terminal, dentro da pasta do projeto:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/roles-veganos.git
   git push -u origin main
   ```

### 3. Vercel (site)

1. Entre em [vercel.com](https://vercel.com) com a conta do GitHub e clique em **Add New > Project**.
2. Importe o repositório. A Vercel reconhece o Vite sozinha.
3. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do passo 1.5.
4. Clique em **Deploy**. Em cerca de 1 minuto o site fica no ar em `https://seu-projeto.vercel.app`.
5. No Supabase, em **Authentication > URL Configuration**, coloque esse endereço em **Site URL**.

### 4. Primeira vez no site publicado

1. Abra `https://seu-projeto.vercel.app/acesso` e entre com o usuário criado no Supabase.
2. Vá em **Gestão > Configurações** e clique em **Enviar conteúdo atual para o servidor**. Isso copia os lugares, receitas, artigos, documentários e cupons do `dados.json` para o banco.
3. Pronto: a partir daí, cada edição no painel é salva sozinha e aparece na hora para todo mundo.

Para atualizar o código depois: `git add -A && git commit -m "..." && git push`. A Vercel publica de novo sozinha.

Para rodar no seu computador ligado ao mesmo banco, copie `.env.example` para `.env` e preencha as duas variáveis.

**Limites do plano gratuito:** o Supabase Free pausa o projeto depois de 7 dias sem nenhum acesso (é só abrir o painel do Supabase e clicar em "Restore"). Tem 500 MB de banco e 1 GB de imagens, o que sobra para este site. A Vercel Hobby é para uso pessoal e não comercial.

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

## Modo local (sem Supabase)

Sem as variáveis do Supabase, o que você edita no painel fica salvo **só no seu navegador**. Para todo mundo ver (com `npm run dev`, use também o botão **Salvar no projeto**):

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

- **No modo local, o login não é segurança de verdade** e as avaliações e comentários dos visitantes ficam só no navegador de quem escreveu. Com o Supabase configurado, os dois problemas deixam de existir: o login é real e as regras do `supabase/schema.sql` só deixam o admin editar o conteúdo.
- **O `dados.json` guarda o e-mail e o hash da senha do modo local.** Mantenha o repositório do GitHub **privado**. Depois de migrar para o Supabase, esse login local deixa de ser usado.
- **O formulário de contato não envia nada.** Ligue a um serviço como o Formspree.
- Os seis lugares "Exemplo" e os três cupons "Exemplo" (rascunho) são fictícios. Exclua-os quando cadastrar os reais.
