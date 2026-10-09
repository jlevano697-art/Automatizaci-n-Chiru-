// Publica carruseles en Facebook e Instagram con la API oficial (Graph API).
// Seguro por defecto: MODO=prueba no llama a Meta ni publica nada.
//   node scripts/publicar.mjs               -> revisa la cola (prueba)
//   node scripts/publicar.mjs --diagnostico -> muestra IDs de página/Instagram (requiere META_TOKEN)
//   MODO=real node scripts/publicar.mjs     -> publica lo que toque
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const env = process.env;
const MODO = env.MODO === "real" ? "real" : "prueba";
const V = env.GRAPH_VERSION || "v23.0"; // confirmar la versión vigente en developers.facebook.com
const G = `https://graph.facebook.com/${V}`;
const AHORA = env.AHORA ? new Date(env.AHORA) : new Date();

// Reglas anti-bloqueo y de seguridad
const MAX_POR_DIA = 3;
const MIN_HORAS_ENTRE_POSTS = 2;
const VENTANA_HORAS = 6; // si pasó más tiempo desde la hora programada, no se publica solo
const MEDIA_BASE =
  env.MEDIA_BASE_URL ||
  (env.GITHUB_REPOSITORY ? `https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY}/main` : "");

const rutaCola = env.COLA_PATH ? resolve(env.COLA_PATH) : resolve(RAIZ, "cola.json");
const cola = JSON.parse(readFileSync(rutaCola, "utf8"));
const log = (...a) => console.log(`[${MODO}]`, ...a);

async function graph(path, { method = "GET", params = {} } = {}) {
  const body = new URLSearchParams({ ...params, access_token: env.META_TOKEN });
  const url = method === "GET" ? `${G}${path}?${body}` : `${G}${path}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Meta ${path}: ${JSON.stringify(j.error || j)}`);
  return j;
}

async function diagnostico() {
  if (!env.META_TOKEN) throw new Error("Falta META_TOKEN");
  const r = await graph("/me/accounts", { params: { fields: "id,name,instagram_business_account{id,username}" } });
  for (const p of r.data) console.log(`Página: ${p.name} | FB_PAGE_ID=${p.id} | IG_USER_ID=${p.instagram_business_account?.id ?? "(sin Instagram vinculado)"} (${p.instagram_business_account?.username ?? ""})`);
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

function validar(item, hechasHoy, ultimas) {
  const e = [];
  const slides = item.laminas.length;
  if (slides < 2 || slides > 10) e.push(`Un carrusel debe tener de 2 a 10 láminas (tiene ${slides})`);
  const pie = readFileSync(resolve(RAIZ, item.pie), "utf8").trim();
  if (pie.length > 2200) e.push(`Pie de foto de ${pie.length} caracteres (máx. 2200)`);
  if ((pie.match(/#\w+/g) || []).length > 30) e.push("Más de 30 hashtags");
  for (const l of item.laminas) if (!existsSync(resolve(RAIZ, l))) e.push(`Falta archivo ${l}`);
  if (hechasHoy >= MAX_POR_DIA) e.push(`Ya se publicaron ${MAX_POR_DIA} hoy`);
  if (ultimas.some((t) => Math.abs(AHORA - t) < MIN_HORAS_ENTRE_POSTS * 3600e3)) e.push(`Menos de ${MIN_HORAS_ENTRE_POSTS} h desde otra publicación`);
  return { errores: e, pie };
}

async function urlsPublicas(item) {
  if (MODO !== "real" && env.SIN_URLS === "1") return item.laminas.map((l) => `(local) ${l}`); // solo para pruebas
  if (!MEDIA_BASE) throw new Error("Falta MEDIA_BASE_URL (URL pública de las imágenes)");
  const urls = item.laminas.map((l) => `${MEDIA_BASE}/${l}`);
  for (const u of urls) {
    const r = await fetch(u, { method: "HEAD" });
    if (!r.ok || !/image\/jpeg/.test(r.headers.get("content-type") || "")) throw new Error(`Imagen no pública o no es JPEG: ${u} (${r.status})`);
  }
  return urls;
}

async function publicarFacebook(urls, pie) {
  const ids = [];
  for (const url of urls) ids.push((await graph(`/${env.FB_PAGE_ID}/photos`, { method: "POST", params: { url, published: "false" } })).id);
  const params = { message: pie };
  ids.forEach((id, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
  return (await graph(`/${env.FB_PAGE_ID}/feed`, { method: "POST", params })).id;
}

async function publicarInstagram(urls, pie) {
  const hijos = [];
  for (const image_url of urls) hijos.push((await graph(`/${env.IG_USER_ID}/media`, { method: "POST", params: { image_url, is_carousel_item: "true" } })).id);
  const cont = (await graph(`/${env.IG_USER_ID}/media`, { method: "POST", params: { media_type: "CAROUSEL", children: hijos.join(","), caption: pie } })).id;
  for (let i = 0; i < 20; i++) {
    const s = await graph(`/${cont}`, { params: { fields: "status_code" } });
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Contenedor de Instagram en estado ${s.status_code}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  return (await graph(`/${env.IG_USER_ID}/media_publish`, { method: "POST", params: { creation_id: cont } })).id;
}

async function main() {
  if (process.argv.includes("--diagnostico")) return diagnostico();

  const dia = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const publicadas = cola.filter((x) => x.estado === "publicado" && x.publicado_en);
  const hechasHoy = publicadas.filter((x) => dia(x.publicado_en) === dia(AHORA)).length;
  const ultimas = publicadas.map((x) => new Date(x.publicado_en));

  const toca = cola
    .filter((x) => x.estado === "pendiente")
    .filter((x) => {
      const f = new Date(x.fecha);
      return f <= AHORA && (AHORA - f) / 3600e3 <= VENTANA_HORAS;
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  log(`Cola: ${cola.length} | pendientes ahora: ${toca.length} | publicadas hoy: ${hechasHoy}`);
  for (const x of cola.filter((c) => c.estado === "pendiente" && !c.aprobado)) log(`  · ${x.id}: sin aprobar (no se publicará)`);

  const item = toca.find((x) => x.aprobado === true);
  if (!item) return log("Nada que publicar en este momento.");

  // Una publicación por ejecución: evita ráfagas.
  try {
    const { errores, pie } = validar(item, hechasHoy, ultimas);
    if (errores.length) throw new Error(errores.join("; "));
    for (const p of item.productos) await productoVigente(p.id, p.precio);
    const urls = await urlsPublicas(item);

    if (MODO !== "real") return log(`PRUEBA OK: se publicaría "${item.id}" con ${urls.length} láminas en FB e IG. No se llamó a Meta.`);
    if (!env.META_TOKEN || !env.FB_PAGE_ID || !env.IG_USER_ID) throw new Error("Faltan META_TOKEN, FB_PAGE_ID o IG_USER_ID");

    item.facebook_id = await publicarFacebook(urls, pie);
    item.instagram_id = await publicarInstagram(urls, pie);
    item.estado = "publicado";
    item.publicado_en = new Date().toISOString();
    log(`Publicado ${item.id}: FB ${item.facebook_id} | IG ${item.instagram_id}`);
  } catch (err) {
    item.estado = "error";
    item.error = String(err.message).slice(0, 500);
    log(`ERROR en ${item.id}: ${item.error}`);
    process.exitCode = 1;
  } finally {
    if (MODO === "real") writeFileSync(rutaCola, JSON.stringify(cola, null, 2) + "\n", "utf8");
  }
}

await main();
