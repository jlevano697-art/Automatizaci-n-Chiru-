// Skala: crea en Buffer (API GraphQL) los videos aprobados de skala/cola.json, como Reel, con su texto y hora.
// Lo corre GitHub Actions (.github/workflows/skala_buffer.yml) con el secreto SKALA_BUFFER_API_KEY.
// Seguro por defecto: sin SKALA_MODO=real no llama a Buffer para crear nada.
//   node scripts/skala_enviar_a_buffer.mjs               -> revisa la cola (prueba)
//   node scripts/skala_enviar_a_buffer.mjs --diagnostico -> lista organizaciones, canales y tipos de post (solo lectura)
//   SKALA_MODO=real node scripts/skala_enviar_a_buffer.mjs
// Canales: variable SKALA_CANALES = IDs de canal de Buffer separados por coma (los de Skala).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const env = process.env;
const MODO = env.SKALA_MODO === "real" ? "real" : "prueba";
const AHORA = env.AHORA ? new Date(env.AHORA) : new Date();
const API = "https://api.buffer.com";
const ANTICIPACION_HORAS = 72;
const MAX_POR_DIA = 2;
const MEDIA_BASE = env.MEDIA_BASE_URL || (env.GITHUB_REPOSITORY ? `https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY}/main` : "");

const rutaCola = resolve(RAIZ, "skala", "cola.json");
const cola = existsSync(rutaCola) ? JSON.parse(readFileSync(rutaCola, "utf8")) : [];
const log = (...a) => console.log(`[skala ${MODO}]`, ...a);
const esc = (s) => JSON.stringify(s);

async function gql(query) {
  if (!env.SKALA_BUFFER_API_KEY) throw new Error("Falta SKALA_BUFFER_API_KEY");
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SKALA_BUFFER_API_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (res.status === 429) throw new Error(`Límite de solicitudes de Buffer (reintentar en ${res.headers.get("retry-after")} s)`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.errors) throw new Error(`Buffer ${res.status}: ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.data;
}

async function diagnostico() {
  const org = await gql(`query { account { organizations { id } } }`);
  console.log("Organizaciones:", JSON.stringify(org.account.organizations));
  for (const o of org.account.organizations) {
    try {
      const ch = await gql(`query { channels(input: { organizationId: ${esc(o.id)} }) { id name service } }`);
      console.log(`Canales de ${o.id}:`, JSON.stringify(ch.channels));
    } catch (e) {
      console.log(`No pude listar canales de ${o.id}: ${e.message}`);
    }
  }
  try {
    const t = await gql(`query { __type(name: "PostType") { enumValues { name } } }`);
    console.log("Tipos de post:", JSON.stringify(t.__type?.enumValues?.map((v) => v.name)));
  } catch (e) {
    console.log("No pude leer los tipos de post:", e.message);
  }
}

async function canales() {
  const ids = (env.SKALA_CANALES || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length) throw new Error("Falta la variable SKALA_CANALES (IDs de canal de Skala en Buffer)");
  const org = await gql(`query { account { organizations { id } } }`);
  const todos = [];
  for (const o of org.account.organizations) {
    const ch = await gql(`query { channels(input: { organizationId: ${esc(o.id)} }) { id name service } }`);
    todos.push(...ch.channels);
  }
  return ids.map((id) => {
    const c = todos.find((x) => x.id === id);
    if (!c) throw new Error(`El canal ${id} no está en la cuenta de Buffer de Skala`);
    return c;
  });
}

// Reel en Instagram y Facebook; en TikTok el video va tal cual.
function metadata(servicio) {
  if (servicio === "instagram") return `metadata: { instagram: { type: reel, shouldShareToFeed: true } },`;
  if (servicio === "facebook") return `metadata: { facebook: { type: reel } },`;
  return "";
}

async function crearPost(item, canal, url) {
  const q = `mutation { createPost(input: {
    text: ${esc(item.pie)},
    channelId: ${esc(canal.id)},
    schedulingType: automatic,
    mode: customScheduled,
    dueAt: ${esc(new Date(item.fecha).toISOString())},
    ${metadata(canal.service)}
    assets: [{ video: { url: ${esc(url)}, metadata: { thumbnailOffset: 1500 } } }]
  }) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  } }`;
  const r = (await gql(q)).createPost;
  if (r.message) throw new Error(`Buffer rechazó la publicación en ${canal.service}: ${r.message}`);
  return r.post.id;
}

async function main() {
  if (process.argv.includes("--diagnostico")) return diagnostico();
  const dia = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const programadas = cola.filter((x) => ["en_buffer", "publicado"].includes(x.estado));
  const limite = new Date(AHORA.getTime() + ANTICIPACION_HORAS * 3600e3);
  const toca = cola
    .filter((x) => x.estado === "pendiente" && x.aprobado === true && new Date(x.fecha) > AHORA && new Date(x.fecha) <= limite)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  log(`Cola: ${cola.length} | ya en Buffer: ${programadas.length} | para enviar: ${toca.length}`);
  if (!toca.length) return;

  let hayError = false;
  for (const item of toca) {
    try {
      if (!item.pie?.trim()) throw new Error("Falta el texto de la publicación");
      if (item.pie.length > 2200) throw new Error(`El texto tiene ${item.pie.length} caracteres (máx. 2200)`);
      if (programadas.filter((x) => dia(x.fecha) === dia(item.fecha)).length >= MAX_POR_DIA) throw new Error(`Ya hay ${MAX_POR_DIA} videos programados ese día`);
      if (!MEDIA_BASE) throw new Error("Falta MEDIA_BASE_URL");
      const url = `${MEDIA_BASE}/${item.video.split("/").map(encodeURIComponent).join("/")}`;
      const r = await fetch(url, { method: "HEAD" });
      if (!r.ok) throw new Error(`El video no es público todavía: ${url} (${r.status})`);
      const destinos = await canales();
      if (MODO !== "real") {
        log(`PRUEBA OK: "${item.id}" iría a ${destinos.map((c) => `${c.service} (${c.name})`).join(", ")} para ${item.fecha}. No se llamó a createPost.`);
        item.prueba = { ok: true, canales: destinos.map((c) => `${c.service}:${c.name}`), revisado: new Date().toISOString() };
        delete item.error;
        continue;
      }
      item.buffer = [];
      for (const c of destinos) item.buffer.push({ canal: `${c.service}:${c.name}`, post_id: await crearPost(item, c, url) });
      item.estado = "en_buffer";
      item.enviado_en = new Date().toISOString();
      delete item.error;
      programadas.push(item);
      log(`Enviado a Buffer: ${item.id} → ${item.buffer.map((b) => b.canal).join(", ")} para ${item.fecha}`);
    } catch (err) {
      item.error = String(err.message).slice(0, 500);
      if (MODO === "real") item.estado = "error";
      hayError = true;
      log(`ERROR en ${item.id}: ${item.error}`);
    }
  }
  writeFileSync(rutaCola, JSON.stringify(cola, null, 2) + "\n", "utf8");
  if (hayError) process.exitCode = 1;
}

await main();
