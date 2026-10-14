// Backend no Supabase (banco, login e imagens).
// Ativa quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas.
// Sem elas, o site funciona no modo local (dados em src/data/dados.json + navegador).
import { createClient } from "@supabase/supabase-js";

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const temBackend = Boolean(URL_SUPABASE && CHAVE_PUBLICA);
export const supabase = temBackend ? createClient(URL_SUPABASE, CHAVE_PUBLICA) : null;

// Partes do estado que vivem na linha única da tabela "conteudo"
export const CHAVES_CONTEUDO = ["places", "posts", "docs", "cupons", "receitas"];

export function extrairConteudo(state) {
  return Object.fromEntries(CHAVES_CONTEUDO.map((k) => [k, state[k] || []]));
}

const deAvaliacao = (r) => ({ id: r.id, placeId: r.place_id, userName: r.user_name, nota: r.nota, texto: r.texto, data: r.data, status: r.status });
const paraAvaliacao = (r) => ({ id: r.id, place_id: r.placeId, user_name: r.userName, nota: r.nota, texto: r.texto, data: r.data, status: r.status });
const deComentario = (c) => ({ id: c.id, postId: c.post_id, userName: c.user_name, texto: c.texto, data: c.data });
const paraComentario = (c) => ({ id: c.id, post_id: c.postId, user_name: c.userName, texto: c.texto, data: c.data });

function checar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/* ===== Leitura ===== */

export async function carregarDoServidor() {
  const [conteudo, avaliacoes, comentarios] = await Promise.all([
    supabase.from("conteudo").select("dados").eq("id", 1).maybeSingle().then(checar),
    supabase.from("avaliacoes").select("*").order("criado_em", { ascending: false }).then(checar),
    supabase.from("comentarios").select("*").order("criado_em", { ascending: false }).then(checar),
  ]);
  return {
    conteudo: conteudo?.dados || null,
    reviews: avaliacoes.map(deAvaliacao),
    comments: comentarios.map(deComentario),
  };
}

/* ===== Escrita (as regras do banco só deixam o admin editar o conteúdo) ===== */

export async function salvarConteudo(state) {
  checar(await supabase.from("conteudo").upsert({ id: 1, dados: extrairConteudo(state), atualizado_em: new Date().toISOString() }));
}

export async function enviarTudo(state) {
  await salvarConteudo(state);
  if (state.reviews?.length) checar(await supabase.from("avaliacoes").upsert(state.reviews.map(paraAvaliacao)));
  if (state.comments?.length) checar(await supabase.from("comentarios").upsert(state.comments.map(paraComentario)));
}

export const avaliacoes = {
  inserir: async (r) => checar(await supabase.from("avaliacoes").insert(paraAvaliacao(r))),
  status: async (id, status) => checar(await supabase.from("avaliacoes").update({ status }).eq("id", id)),
  apagar: async (id) => checar(await supabase.from("avaliacoes").delete().eq("id", id)),
  apagarDoLugar: async (placeId) => checar(await supabase.from("avaliacoes").delete().eq("place_id", placeId)),
};

export const comentarios = {
  inserir: async (c) => checar(await supabase.from("comentarios").insert(paraComentario(c))),
  apagar: async (id) => checar(await supabase.from("comentarios").delete().eq("id", id)),
  apagarDoPost: async (postId) => checar(await supabase.from("comentarios").delete().eq("post_id", postId)),
};

/* ===== Login ===== */

async function perfilAdmin(user) {
  if (!user) return null;
  const linhas = checar(await supabase.from("admins").select("user_id").eq("user_id", user.id));
  if (!linhas.length) return null;
  return { id: user.id, nome: user.user_metadata?.nome || "Admin", email: user.email, role: "admin" };
}

export async function usuarioAtual() {
  const { data } = await supabase.auth.getSession();
  return perfilAdmin(data.session?.user);
}

export function aoMudarLogin(cb) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    // O callback do Supabase não pode fazer outras chamadas na hora: agenda para depois
    setTimeout(() => perfilAdmin(sessao?.user).then(cb).catch(() => cb(null)), 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error("E-mail ou senha incorretos.");
  const perfil = await perfilAdmin(data.user);
  if (!perfil) {
    await supabase.auth.signOut();
    throw new Error("Este usuário não tem acesso de administrador.");
  }
  return perfil;
}

export const sair = () => supabase.auth.signOut();

export async function trocarConta({ email, senhaAtual, novaSenha }) {
  const { data } = await supabase.auth.getUser();
  // Confere a senha atual antes de mudar
  const { error } = await supabase.auth.signInWithPassword({ email: data.user.email, password: senhaAtual });
  if (error) throw new Error("Senha atual incorreta.");
  const mudancas = {};
  if (email && email !== data.user.email) mudancas.email = email;
  if (novaSenha) mudancas.password = novaSenha;
  if (Object.keys(mudancas).length) {
    const r = await supabase.auth.updateUser(mudancas);
    if (r.error) throw new Error(r.error.message);
  }
  return Boolean(mudancas.email);
}

/* ===== Imagens ===== */

// Recebe a imagem já reduzida (data URL) e devolve o link público no Supabase Storage
export async function enviarImagem(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const caminho = `${new Date().toISOString().slice(0, 7)}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  checar(await supabase.storage.from("imagens").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" }));
  return supabase.storage.from("imagens").getPublicUrl(caminho).data.publicUrl;
}
