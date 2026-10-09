// Crea en Buffer (API oficial GraphQL) las publicaciones aprobadas de la cola, con su fecha y hora.
// Buffer las publica en su nube; este script solo las "entrega" con anticipación.
// Seguro por defecto: sin MODO=real no llama a Buffer.
//   node scripts/enviar_a_buffer.mjs               -> revisa la cola (prueba)
//   node scripts/enviar_a_buffer.mjs --diagnostico -> lista organizaciones y canales (requiere BUFFER_API_KEY)
//   MODO=real node scripts/enviar_a_buffer.mjs     -> crea las publicaciones en Buffer
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const env = process.env;
const MODO = env.MODO === "real" ? "real" : "prueba";
const AHORA = env.AHORA ? new Date(env.AHORA) : new Date();
const API = "https://api.buffer.com";

// Reglas de seguridad y anti-bloqueo
const MAX_POR_DIA = 3;
const MIN_HORAS_ENTRE_POSTS = 2;
const ANTICIPACION_HORAS = 48; // solo se envían piezas que se publican dentro de este margen
const MEDIA_BASE =
  env.MEDIA_BASE_URL ||
  (env.GITHUB_REPOSITORY ? `https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY}/main` : "");

const rutaCola = env.COLA_PATH ? resolve(env.COLA_PATH) : resolve(RAIZ, "cola.json");
const cola = JSON.parse(readFileSync(rutaCola, "utf8"));
const log = (...a) => console.log(`[${MODO}]`, ...a);

async function gql(query) {
  if (!env.BUFFER_API_KEY) throw new Error("Falta BUFFER_API_KEY");
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.BUFFER_API_KEY}` },
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
    // Consulta de canales: confirmar nombre exacto en developers.buffer.com (Get Channels) si falla.
    try {
      const ch = await gql(`query { channels(input: { organizationId: "${o.id}" }) { id name service } }`);
      console.log(`Canales de ${o.id}:`, JSON.stringify(ch.channels));
    } catch (e) {
      console.log(`No pude listar canales de ${o.id}: ${e.message}`);
    }
  }
}

async function productoVigente(id, esperado) {
  const res = await fetch(`https://api.chiru.pe/products/${id}`);
  if (!res.ok) throw new Error(`Producto ${id}: HTTP ${res.status}`);
  const j = await res.json();
  const p = j.data || j;
  const precio = p.price?.ranges?.[0]?.cost;
  if (!(p.stock > 0)) throw new Error(`Sin stock: ${p.name}`);
  if (precio !== esperado) throw new Error(`Precio cambió en ${p.name}: cola ${esperado}, catálogo ${precio}`);
}

function validar(item, hechasEseDia, vecinas) {
  const e = [];
  if (item.laminas.length < 1 || item.laminas.length > 10) e.push(`Láminas fuera de rango (${item.laminas.length})`);
  const pie = readFileSync(resolve(RAIZ, item.pie), "utf8").trim();
  if (pie.length > 2200) e.push(`Pie de foto de ${pie.length} caracteres (máx. 2200)`);
  if ((pie.match(/#\w+/g) || []).length > 30) e.push("Más de 30 hashtags");
  for (const l of item.laminas) if (!existsSync(resolve(RAIZ, l))) e.push(`Falta archivo ${l}`);
  if (hechasEseDia >= MAX_POR_DIA) e.push(`Ya hay ${MAX_POR_DIA} publicaciones ese día`);
  const f = new Date(item.fecha);
  if (vecinas.some((t) => Math.abs(f - t) < MIN_HORAS_ENTRE_POSTS * 3600e3)) e.push(`Menos de ${MIN_HORAS_ENTRE_POSTS} h respecto a otra publicación`);
  return { errores: e, pie };
}

async function urlsPublicas(item) {
  if (MODO !== "real" && env.SIN_URLS === "1") return item.laminas.map((l) => `(local) ${l}`); // solo para pruebas
  if (!MEDIA_BASE) throw new Error("Falta MEDIA_BASE_URL (URL pública de las imágenes)");
  const urls = item.laminas.map((l) => `${MEDIA_BASE}/${l}`);
  for (const u of urls) {
    const r = await fetch(u, { method: "HEAD" });
    if (!r.ok) throw new Error(`Imagen no pública: ${u} (${r.status})`);
  }
  return urls;
}

const esc = (s) => JSON.stringify(s); // cadena segura para GraphQL

async function crearEnBuffer(item, urls, pie) {
  const assets = urls.map((u) => `{ image: { url: ${esc(u)} } }`).join(", ");
  const q = `mutation { createPost(input: {
    text: ${esc(pie)},
    channelId: ${esc(env.BUFFER_CHANNEL_ID)},
    schedulingType: automatic,
    mode: customScheduled,
    dueAt: ${esc(new Date(item.fecha).toISOString())},
    metadata: { facebook: { type: post } },
    assets: [${assets}]
  }) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  } }`;
  const d = await gql(q);
  const r = d.createPost;
  if (r.message) throw new Error(`Buffer rechazó la publicación: ${r.message}`);
  return r.post.id;
}

async function main() {
  if (process.argv.includes("--diagnostico")) return diagnostico();

  const dia = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const enBuffer = cola.filter((x) => x.estado === "en_buffer" || x.estado === "publicado");
  const limite = new Date(AHORA.getTime() + ANTICIPACION_HORAS * 3600e3);

  const toca = cola
    .filter((x) => x.estado === "pendiente" && x.aprobado === true)
    .filter((x) => new Date(x.fecha) > AHORA && new Date(x.fecha) <= limite)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  log(`Cola: ${cola.length} | ya en Buffer o publicadas: ${enBuffer.length} | para enviar ahora: ${toca.length}`);
  for (const x of cola.filter((c) => c.estado === "pendiente" && !c.aprobado)) log(`  · ${x.id}: sin aprobar (no se enviará)`);
  if (!toca.length) return log("Nada que enviar en este momento.");

  let hayError = false;
  for (const item of toca) {
    try {
      const hechasEseDia = enBuffer.filter((x) => dia(x.fecha) === dia(item.fecha)).length;
      const vecinas = enBuffer.map((x) => new Date(x.fecha));
      const { errores, pie } = validar(item, hechasEseDia, vecinas);
      if (errores.length) throw new Error(errores.join("; "));
      for (const p of item.productos) await productoVigente(p.id, p.precio);
      const urls = await urlsPublicas(item);

      if (MODO !== "real") {
        log(`PRUEBA OK: se enviaría "${item.id}" a Buffer para ${item.fecha} con ${urls.length} imagen(es). No se llamó a Buffer.`);
        enBuffer.push({ fecha: item.fecha }); // simula el envío para que las reglas de espaciado se apliquen igual
        continue;
      }
      if (!env.BUFFER_API_KEY || !env.BUFFER_CHANNEL_ID) throw new Error("Faltan BUFFER_API_KEY o BUFFER_CHANNEL_ID");

      item.buffer_post_id = await crearEnBuffer(item, urls, pie);
      item.estado = "en_buffer";
      item.enviado_en = new Date().toISOString();
      enBuffer.push(item);
      log(`Enviado a Buffer: ${item.id} (post ${item.buffer_post_id}) para ${item.fecha}`);
    } catch (err) {
      item.estado = "error";
      item.error = String(err.message).slice(0, 500);
      hayError = true;
      log(`ERROR en ${item.id}: ${item.error}`);
    }
  }
  if (MODO === "real") writeFileSync(rutaCola, JSON.stringify(cola, null, 2) + "\n", "utf8");
  if (hayError) process.exitCode = 1;
}

await main();
