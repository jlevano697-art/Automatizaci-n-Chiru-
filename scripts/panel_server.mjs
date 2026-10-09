// Panel local de aprobación. Uso: node scripts/panel_server.mjs   -> abre http://127.0.0.1:4173
// Qué hace: muestra qué se publicará y a qué hora; permite editar texto y hora; la pieza solo se envía a Buffer
// cuando tú la APRUEBAS aquí. Escucha solo en 127.0.0.1 (nadie más en la red puede entrar).
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, normalize, sep, extname } from "node:path";
import { execFile } from "node:child_process";

const RAIZ = resolve(import.meta.dirname, "..");
const PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const TZ = "America/Lima";
const MAX_POR_DIA = 3;
const MIN_HORAS = 2;
const MARGEN_MIN = 10; // la hora debe quedar al menos 10 min en el futuro

const rutaCola = resolve(RAIZ, "cola.json");
const leerCola = () => JSON.parse(readFileSync(rutaCola, "utf8"));
const guardarCola = (c) => writeFileSync(rutaCola, JSON.stringify(c, null, 2) + "\n", "utf8");
const ahora = () => (process.env.AHORA ? new Date(process.env.AHORA) : new Date());
const dia = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
const catalogo = JSON.parse(readFileSync(resolve(RAIZ, "productos.json"), "utf8"));

const MIME = { ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };

function vista(x) {
  const pie = readFileSync(resolve(RAIZ, x.pie), "utf8");
  return {
    id: x.id, perfil: x.perfil, fecha: x.fecha, estado: x.estado, aprobado: !!x.aprobado, error: x.error || null,
    laminas: x.laminas, pie, titulo: pie.trim().split("\n")[0],
    productos: x.productos.map((p) => ({ nombre: catalogo.find((c) => c.id === p.id)?.nombre ?? p.id, precio: p.precio })),
    editable: x.estado === "pendiente" && !x.aprobado,
  };
}

function validarCambios(cola, item, pie, fecha) {
  const e = [];
  if (typeof pie !== "string" || !pie.trim()) e.push("El texto no puede estar vacío");
  if (pie && pie.length > 2200) e.push(`El texto tiene ${pie.length} caracteres (máximo 2200)`);
  if (pie && (pie.match(/#\w+/g) || []).length > 30) e.push("Más de 30 hashtags");
  const f = new Date(fecha);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/.test(fecha) || isNaN(f)) e.push("Fecha u hora inválida");
  else {
    if (f.getTime() < ahora().getTime() + MARGEN_MIN * 60000) e.push(`La hora debe ser al menos ${MARGEN_MIN} minutos en el futuro`);
    const otras = cola.filter((x) => x.id !== item.id && ["pendiente", "en_buffer", "publicado"].includes(x.estado) && (x.estado !== "pendiente" || x.aprobado));
    if (otras.filter((x) => dia(x.fecha) === dia(f)).length >= MAX_POR_DIA) e.push(`Ya hay ${MAX_POR_DIA} publicaciones ese día`);
    if (otras.some((x) => Math.abs(new Date(x.fecha) - f) < MIN_HORAS * 3600e3)) e.push(`Debe haber al menos ${MIN_HORAS} horas respecto a otra publicación`);
  }
  return e;
}

const git = (...args) => new Promise((ok) => execFile("git", args, { cwd: RAIZ }, (err, so, se) => ok({ err, out: `${so}${se}`.trim() })));

async function subirCambios() {
  const cola = leerCola();
  const archivos = ["cola.json", ...cola.map((x) => x.pie)];
  await git("add", "--", ...archivos);
  const st = await git("status", "--porcelain");
  if (!/^[AM]/m.test(st.out)) return { ok: true, msg: "No hay cambios nuevos que subir." };
  const c = await git("commit", "-m", "Panel: cambios aprobados desde el panel local");
  if (c.err) return { ok: false, msg: c.out };
  await git("pull", "--rebase", "origin", "main");
  const p = await git("push", "origin", "main");
  return p.err ? { ok: false, msg: p.out } : { ok: true, msg: "Cambios subidos a GitHub. El envío a Buffer los tomará en su próximo ciclo." };
}

const leerBody = (req) => new Promise((ok, no) => { let d = ""; req.on("data", (c) => { d += c; if (d.length > 100000) req.destroy(); }); req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch { no(new Error("JSON inválido")); } }); });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.headers.host !== `${HOST}:${PORT}` && req.headers.host !== `localhost:${PORT}`) return json(res, 403, { error: "Host no permitido" });

    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" }); return res.end(PAGINA); }
    if (req.method === "GET" && url.pathname === "/api/estado") {
      const cola = leerCola().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      return json(res, 200, { ahora: ahora().toISOString(), hoy: dia(ahora()), items: cola.map(vista) });
    }
    if (req.method === "GET" && (url.pathname.startsWith("/publicar/") || url.pathname.startsWith("/assets/"))) {
      const ruta = normalize(resolve(RAIZ, "." + decodeURIComponent(url.pathname)));
      const permitido = [resolve(RAIZ, "publicar") + sep, resolve(RAIZ, "assets") + sep];
      if (!permitido.some((p) => ruta.startsWith(p)) || /[\\/]fotos[\\/]/.test(ruta) || !existsSync(ruta) || !statSync(ruta).isFile()) return json(res, 404, { error: "No encontrado" });
      res.writeHead(200, { "Content-Type": MIME[extname(ruta)] || "application/octet-stream", "Cache-Control": "no-cache" });
      return res.end(readFileSync(ruta));
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      if (req.headers["x-panel"] !== "1" || !String(req.headers["content-type"]).startsWith("application/json")) return json(res, 403, { error: "Solicitud no permitida" });
      const body = await leerBody(req);

      if (url.pathname === "/api/subir") return json(res, 200, await subirCambios());

      const m = url.pathname.match(/^\/api\/pieza\/([\w-]+)\/(guardar|aprobar|quitar)$/);
      if (!m) return json(res, 404, { error: "Ruta no válida" });
      const cola = leerCola();
      const item = cola.find((x) => x.id === m[1]);
      if (!item) return json(res, 404, { error: "Pieza no encontrada" });
      if (item.estado !== "pendiente") return json(res, 409, { error: `La pieza está "${item.estado}" y ya no se puede cambiar aquí` });

      if (m[2] === "guardar") {
        if (item.aprobado) return json(res, 409, { error: "Quita la aprobación antes de editar" });
        const errores = validarCambios(cola, item, body.pie, body.fecha);
        if (errores.length) return json(res, 422, { error: errores.join(". ") });
        writeFileSync(resolve(RAIZ, item.pie), body.pie.trim() + "\n", "utf8");
        item.fecha = body.fecha;
        delete item.error;
        guardarCola(cola);
        return json(res, 200, { ok: true });
      }
      if (m[2] === "aprobar") {
        const errores = validarCambios(cola, item, readFileSync(resolve(RAIZ, item.pie), "utf8"), item.fecha);
        if (errores.length) return json(res, 422, { error: errores.join(". ") });
        item.aprobado = true;
        guardarCola(cola);
        return json(res, 200, { ok: true });
      }
      item.aprobado = false; // quitar
      guardarCola(cola);
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: "No encontrado" });
  } catch (err) {
    json(res, 500, { error: String(err.message || err) });
  }
});

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel de contenido · Chiru</title>
<style>
@font-face{font-family:Outfit;font-weight:600;src:url(/assets/fonts/outfit-latin-600-normal.woff2)}
@font-face{font-family:Outfit;font-weight:800;src:url(/assets/fonts/outfit-latin-800-normal.woff2)}
@font-face{font-family:Roboto;font-weight:400;src:url(/assets/fonts/roboto-latin-400-normal.woff2)}
@font-face{font-family:Roboto;font-weight:700;src:url(/assets/fonts/roboto-latin-700-normal.woff2)}
:root{--rojo:#FE0000;--tinta:#101828;--crema:#FFF3E3;--gris:#4A5565;--borde:#EADFD0;--fondo:#FFFAF3;--card:#fff;--ok:#0f7a3d;--okbg:#e3f6ea;--info:#1d4ed8;--infobg:#e6eeff;--warn:#9a5b00;--warnbg:#fff1d6;--bad:#b00020;--badbg:#ffe3e3}
@media (prefers-color-scheme:dark){:root{--tinta:#f4f1ec;--gris:#b6bdc9;--borde:#2e3544;--fondo:#0e1320;--card:#161c2c;--crema:#1c2336;--okbg:#12301f;--ok:#7be0a5;--infobg:#15244a;--info:#9db8ff;--warnbg:#3a2a0a;--warn:#ffcf7a;--badbg:#3d1117;--bad:#ff9aa8}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--tinta);font:16px/1.5 Roboto,system-ui,sans-serif}
h1,h2,h3,.hora b{font-family:Outfit,system-ui,sans-serif;margin:0}
.wrap{max-width:1000px;margin:0 auto;padding:0 16px 80px}
header{display:flex;align-items:center;gap:16px;padding:22px 0 8px;flex-wrap:wrap}.logo{height:46px}.sp{flex:1}.fecha{color:var(--gris)}
h1{font-size:clamp(26px,5vw,40px);font-weight:800;letter-spacing:-.02em;margin:10px 0 4px}h2{font-size:22px;font-weight:800;margin:30px 0 12px}
.aviso{background:var(--infobg);color:var(--info);border-radius:14px;padding:12px 16px;margin:10px 0 0;font-size:15px}
.card{background:var(--card);border:1px solid var(--borde);border-radius:20px;padding:18px;margin-bottom:18px}
.top{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.hora{background:var(--rojo);color:#fff;border-radius:14px;padding:8px 14px;text-align:center;min-width:96px}.hora b{display:block;font-size:26px;font-weight:800;line-height:1.1}.hora span{font-size:11px;opacity:.9}
.meta{flex:1;min-width:200px}.meta h3{font-size:20px;font-weight:800;line-height:1.25}.meta p{margin:4px 0 0;color:var(--gris);font-size:14px}
.chip{display:inline-block;border-radius:999px;padding:5px 12px;font:700 13px Roboto,sans-serif;white-space:nowrap}
.ok{background:var(--okbg);color:var(--ok)}.info{background:var(--infobg);color:var(--info)}.warn{background:var(--warnbg);color:var(--warn)}.bad{background:var(--badbg);color:var(--bad)}
.plan{margin:12px 0 0;padding:12px 14px;border-radius:12px;background:var(--crema);font-size:15px}.plan b{font-family:Outfit,sans-serif}
.strip{display:flex;gap:10px;overflow-x:auto;padding:14px 0 6px}.strip img{height:240px;width:auto;border-radius:12px;border:1px solid var(--borde);flex:none}
label{display:block;font-weight:700;margin:12px 0 4px;font-size:14px}
textarea,input[type=datetime-local]{width:100%;border:1px solid var(--borde);border-radius:12px;padding:10px 12px;font:15px/1.5 Roboto,sans-serif;background:var(--card);color:var(--tinta)}
textarea{min-height:230px;resize:vertical}textarea:disabled,input:disabled{opacity:.7;background:var(--crema)}
.row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end}.row>div{flex:1;min-width:220px}.cnt{color:var(--gris);font-size:13px;text-align:right}
.prod{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0 0}.prod td,.prod th{padding:6px 8px;border-bottom:1px solid var(--borde);text-align:left}.prod th{color:var(--gris)}
.btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
button{border:0;border-radius:12px;padding:11px 18px;font:700 15px Roboto,sans-serif;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.b1{background:var(--rojo);color:#fff}.b2{background:var(--crema);color:var(--tinta);border:1px solid var(--borde)}.b3{background:var(--okbg);color:var(--ok)}
.msg{margin-top:10px;font-size:14px;min-height:20px}.msg.e{color:var(--bad);font-weight:700}.msg.o{color:var(--ok);font-weight:700}
.vacio{background:var(--card);border:1px dashed var(--borde);border-radius:20px;padding:26px;text-align:center;color:var(--gris)}
.subir{position:sticky;bottom:0;background:var(--fondo);border-top:1px solid var(--borde);padding:12px 0;margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.subir span{color:var(--gris);font-size:14px;flex:1;min-width:220px}
@media (max-width:560px){.strip img{height:190px}}
</style></head><body><div class="wrap">
<header><img class="logo" src="/assets/chiru_logo.svg" alt="Chiru"><span class="sp"></span><span class="fecha" id="fecha"></span></header>
<h1>Qué se va a publicar</h1>
<div class="aviso">Nada se envía a Buffer hasta que tú pulses <b>Aprobar</b>. Puedes cambiar el texto y la hora antes. Después de aprobar, pulsa <b>Subir cambios a GitHub</b> para que el envío los tome.</div>
<div id="app"></div>
<div class="subir"><span id="subirmsg">Los cambios se guardan en tu PC. Para que el envío automático los vea, hay que subirlos a GitHub.</span><button class="b1" id="btnsubir">Subir cambios a GitHub</button></div>
</div>
<script>
const $ = (s, r = document) => r.querySelector(s);
const api = async (ruta, cuerpo) => {
  const r = await fetch(ruta, cuerpo ? { method: "POST", headers: { "Content-Type": "application/json", "X-Panel": "1" }, body: JSON.stringify(cuerpo) } : {});
  const j = await r.json(); if (!r.ok) throw new Error(j.error || "Error"); return j;
};
const limaLocal = (iso) => new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace(" ", "T").slice(0, 16);
const horaLima = (iso) => new Date(iso).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const diaLargo = (iso) => mayus(new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" }));
const dia = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const S = (x) => x.estado === "publicado" ? ["Publicado", "ok"] : x.estado === "en_buffer" ? ["Programado en Buffer", "info"] : x.estado === "error" ? ["Con error", "bad"] : x.aprobado ? ["Aprobado, por enviar", "info"] : ["Falta tu aprobación", "warn"];
const money = (n) => "S/ " + (Number.isInteger(n) ? n : n.toFixed(2));
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

function plan(x) {
  if (x.estado === "publicado") return "Esta pieza ya se publicó.";
  if (x.estado === "en_buffer") return "Ya está en Buffer: se publicará sola a la hora indicada. Ya no se edita desde aquí.";
  if (x.estado === "error") return "No se pudo enviar: " + (x.error || "revisa el detalle") + ". Corrige y vuelve a aprobar.";
  if (x.aprobado) return "Aprobada. Se enviará a Buffer en el próximo ciclo para publicarse el " + diaLargo(x.fecha).toLowerCase() + " a las " + horaLima(x.fecha) + ".";
  return "Propuesta: publicar el " + diaLargo(x.fecha).toLowerCase() + " a las " + horaLima(x.fecha) + " (hora de Lima). Revisa, edita si quieres y aprueba.";
}

function tarjeta(x, recargar) {
  const [est, cls] = S(x);
  const c = el("article", "card");
  const top = el("div", "top");
  const h = el("div", "hora"); h.append(el("b", "", horaLima(x.fecha)), el("span", "", diaLargo(x.fecha)));
  const m = el("div", "meta"); m.append(el("h3", "", x.titulo), el("p", "", "Perfil: " + x.perfil + " · " + x.laminas.length + " láminas · Facebook"));
  top.append(h, m, el("span", "chip " + cls, est)); c.append(top);
  const p = el("div", "plan"); p.textContent = plan(x); c.append(p);
  const strip = el("div", "strip"); x.laminas.forEach((l, i) => { const im = el("img"); im.src = "/" + l; im.alt = "Lámina " + (i + 1); im.loading = "lazy"; strip.append(im); }); c.append(strip);

  const t = document.createElement("table"); t.className = "prod";
  t.innerHTML = "<tr><th>Producto</th><th>Precio en la pieza</th></tr>";
  x.productos.forEach((pr) => { const r = t.insertRow(); r.insertCell().textContent = pr.nombre; r.insertCell().textContent = money(pr.precio); });
  c.append(t);

  const fila = el("div", "row");
  const d1 = el("div"); d1.append(el("label", "", "Fecha y hora de publicación (hora de Lima)"));
  const fe = el("input"); fe.type = "datetime-local"; fe.value = limaLocal(x.fecha); fe.disabled = !x.editable; d1.append(fe); fila.append(d1); c.append(fila);
  c.append(el("label", "", "Texto de la publicación"));
  const ta = el("textarea"); ta.value = x.pie.trim(); ta.disabled = !x.editable; c.append(ta);
  const cnt = el("div", "cnt"); const upd = () => (cnt.textContent = ta.value.length + " / 2200 caracteres"); upd(); ta.oninput = upd; c.append(cnt);

  const msg = el("div", "msg"); const btns = el("div", "btns");
  const run = async (ruta, cuerpo, ok) => { try { msg.className = "msg"; msg.textContent = "Procesando…"; await api(ruta, cuerpo); msg.className = "msg o"; msg.textContent = ok; await recargar(); } catch (e) { msg.className = "msg e"; msg.textContent = e.message; } };
  const datos = () => ({ pie: ta.value, fecha: fe.value + ":00-05:00" });
  if (x.estado === "pendiente" && !x.aprobado) {
    const g = el("button", "b2", "Guardar cambios"); g.onclick = () => run("/api/pieza/" + x.id + "/guardar", datos(), "Cambios guardados.");
    const a = el("button", "b1", "Aprobar para programar"); a.onclick = async () => { try { await api("/api/pieza/" + x.id + "/guardar", datos()); await run("/api/pieza/" + x.id + "/aprobar", {}, "Aprobada. Ahora sube los cambios a GitHub."); } catch (e) { msg.className = "msg e"; msg.textContent = e.message; } };
    btns.append(g, a);
  } else if (x.estado === "pendiente" && x.aprobado) {
    const q = el("button", "b2", "Quitar aprobación (para editar)"); q.onclick = () => run("/api/pieza/" + x.id + "/quitar", {}, "Aprobación quitada.");
    btns.append(q);
  }
  c.append(btns, msg);
  return c;
}

async function cargar() {
  const d = await api("/api/estado");
  $("#fecha").textContent = mayus(new Date(d.ahora).toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  const app = $("#app"); app.replaceChildren();
  const hoy = d.items.filter((x) => dia(x.fecha) === d.hoy), prox = d.items.filter((x) => dia(x.fecha) > d.hoy), ant = d.items.filter((x) => dia(x.fecha) < d.hoy);
  const sec = (tit, lista, vacio) => { app.append(el("h2", "", tit)); if (!lista.length) { const v = el("div", "vacio"); v.textContent = vacio; app.append(v); } else lista.forEach((x) => app.append(tarjeta(x, cargar))); };
  sec("Hoy", hoy, "No hay contenido programado para hoy.");
  sec("Próximas publicaciones", prox, "No hay más piezas en la cola. Faltan piezas por diseñar.");
  if (ant.length) sec("Anteriores", ant, "");
}
$("#btnsubir").onclick = async () => { const b = $("#btnsubir"), m = $("#subirmsg"); b.disabled = true; m.textContent = "Subiendo…"; try { const r = await api("/api/subir", {}); m.textContent = r.msg; } catch (e) { m.textContent = e.message; } b.disabled = false; };
cargar().catch((e) => { $("#app").textContent = e.message; });
</script></body></html>`;

server.listen(PORT, HOST, () => {
  console.log(`Panel listo en http://${HOST}:${PORT}  (Ctrl+C para cerrar)`);
  if (!process.env.NO_ABRIR) execFile("cmd", ["/c", "start", "", `http://${HOST}:${PORT}`]);
});
