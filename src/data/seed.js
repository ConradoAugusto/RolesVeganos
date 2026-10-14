// O conteúdo do site (lugares, documentários, artigos, conta do admin) fica em dados.json.
// Para publicar o que você editou no painel: Gestão > Conta e dados > Exportar,
// salve o arquivo como src/data/dados.json e gere o site de novo (npm run build).
import dados from "./dados.json";

export const TIPOS = ["Restaurante", "Café", "Sorveteria", "Padaria", "Loja"];

export const SEED = { ...dados, favorites: [], session: null };
