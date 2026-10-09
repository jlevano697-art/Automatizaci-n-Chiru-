"use strict";
const $ = (s, r = document) => r.querySelector(s);
const REFRESCO_MS = 30000;
let sucio = false; // hay texto u hora editados sin guardar: no se refresca solo
let ocupado = false;
let ultimaCarga = 0;

const api = async (ruta, cuerpo) => {
  const r = await fetch(ruta, cuerpo ? { method: "POST", headers: { "Content-Type": "application/json", "X-Panel": "1" }, body: JSON.stringify(cuerpo) } : {});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && ruta !== "/api/login") { mostrarLogin(); throw new Error("Sesión caducada. Entra de nuevo."); }
  if (!r.ok) throw new Error(j.error || "Error");
  return j;
};

const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const limaLocal = (iso) => new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace(" ", "T").slice(0, 16);
const horaLima = (iso) => new Date(iso).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
const diaLargo = (iso) => mayus(new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" }));
const dia = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const money = (n) => "S/ " + (Number.isInteger(n) ? n : n.toFixed(2));
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

function estadoDe(x, ahoraMs) {
  if (x.estado === "publicado") return ["Publicado", "ok"];
  if (x.estado === "en_buffer") return ahoraMs > new Date(x.fecha).getTime() + 5 * 60000 ? ["Hora cumplida (revisa en Buffer)", "ok"] : ["Programado en Buffer", "info"];
  if (x.estado === "error") return ["Con error", "bad"];
  return x.aprobado ? ["Aprobado, por enviar", "info"] : ["Falta tu aprobación", "warn"];
}

function plan(x, ahoraMs) {
  const cuando = diaLargo(x.fecha).toLowerCase() + " a las " + horaLima(x.fecha);
  if (x.estado === "publicado") return "Esta pieza ya se publicó.";
  if (x.estado === "en_buffer") return ahoraMs > new Date(x.fecha).getTime() + 5 * 60000
    ? "Estaba programada para el " + cuando + ". Ya pasó la hora: Buffer debió publicarla. Confírmalo en la página."
    : "Ya está en Buffer: se publicará sola el " + cuando + ". Ya no se edita desde aquí.";
  if (x.estado === "error") return "No se pudo enviar: " + (x.error || "revisa el detalle") + ". Corrige y vuelve a aprobar.";
  if (x.aprobado) return "Aprobada. Se enviará a Buffer en el próximo ciclo (cada hora) para publicarse el " + cuando + ".";
  return "Propuesta: publicar el " + cuando + " (hora de Lima). Revisa, edita si quieres y aprueba.";
}

function tarjeta(x, ahoraMs) {
  const [est, cls] = estadoDe(x, ahoraMs);
  const c = el("article", "card");
  const top = el("div", "top");
  const h = el("div", "hora"); h.append(el("b", "", horaLima(x.fecha)), el("span", "", diaLargo(x.fecha)));
  const m = el("div", "meta"); m.append(el("h3", "", x.titulo), el("p", "", "Perfil: " + x.perfil + " · " + x.imagenes.length + " láminas · Facebook"));
  top.append(h, m, el("span", "chip " + cls, est)); c.append(top);
  c.append(el("div", "plan", plan(x, ahoraMs)));
  const strip = el("div", "strip");
  x.imagenes.forEach((u, i) => { const im = el("img"); im.src = u; im.alt = "Lámina " + (i + 1); im.loading = "lazy"; im.referrerPolicy = "no-referrer"; strip.append(im); });
  c.append(strip);

  const t = el("table", "prod");
  const cab = t.insertRow(); cab.append(el("th", "", "Producto"), el("th", "", "Precio en la pieza"));
  x.productos.forEach((pr) => { const r = t.insertRow(); r.insertCell().textContent = pr.nombre; r.insertCell().textContent = money(pr.precio); });
  c.append(t);

  const fila = el("div", "row"); const d1 = el("div"); d1.append(el("label", "", "Fecha y hora de publicación (hora de Lima)"));
  const fe = el("input"); fe.type = "datetime-local"; fe.value = limaLocal(x.fecha); fe.disabled = !x.editable; d1.append(fe); fila.append(d1); c.append(fila);
  c.append(el("label", "", "Texto de la publicación"));
  const ta = el("textarea"); ta.value = x.pie.trim(); ta.disabled = !x.editable; c.append(ta);
  const cnt = el("div", "cnt"); const upd = () => (cnt.textContent = ta.value.length + " / 2200 caracteres"); upd();
  ta.addEventListener("input", () => { upd(); sucio = true; }); fe.addEventListener("input", () => { sucio = true; });
  c.append(cnt);

  const msg = el("div", "msg"); const btns = el("div", "btns");
  const run = async (acciones, ok) => {
    const botones = btns.querySelectorAll("button"); botones.forEach((b) => (b.disabled = true));
    try {
      msg.className = "msg"; msg.textContent = "Procesando…";
      for (const [ruta, cuerpo] of acciones) await api(ruta, cuerpo);
      sucio = false; msg.className = "msg o"; msg.textContent = ok; await cargar(true);
    } catch (e) { msg.className = "msg e"; msg.textContent = e.message; botones.forEach((b) => (b.disabled = false)); }
  };
  const datos = () => ({ pie: ta.value, fecha: fe.value + ":00-05:00" });
  const base = "/api/pieza/" + encodeURIComponent(x.id);
  if (x.estado === "pendiente" && !x.aprobado) {
    const g = el("button", "b2", "Guardar cambios"); g.type = "button"; g.onclick = () => run([[base + "/guardar", datos()]], "Cambios guardados en el repositorio.");
    const a = el("button", "b1", "Aprobar para programar"); a.type = "button"; a.onclick = () => run([[base + "/guardar", datos()], [base + "/aprobar", {}]], "Aprobada. El envío a Buffer la tomará en su próximo ciclo.");
    btns.append(g, a);
  } else if (x.estado === "pendiente" && x.aprobado) {
    const q = el("button", "b2", "Quitar aprobación (para editar)"); q.type = "button"; q.onclick = () => run([[base + "/quitar", {}]], "Aprobación quitada.");
    btns.append(q);
  }
  c.append(btns, msg);
  return c;
}

function mostrarLogin() { $("#panel").hidden = true; $("#login").hidden = false; $("#clave").focus(); }

async function cargar(forzar = false) {
  if (ocupado) return;
  if (!forzar && (sucio || (document.activeElement && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)))) { $("#actualizado").textContent = "Hay cambios sin guardar: no se actualiza solo."; return; }
  ocupado = true;
  try {
    const d = await api("/api/estado");
    $("#login").hidden = true; $("#panel").hidden = false;
    $("#fecha").textContent = mayus(new Date(d.ahora).toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const app = $("#app"); app.replaceChildren();
    const ahoraMs = new Date(d.ahora).getTime();
    const hoy = d.items.filter((x) => dia(x.fecha) === d.hoy), prox = d.items.filter((x) => dia(x.fecha) > d.hoy), ant = d.items.filter((x) => dia(x.fecha) < d.hoy);
    const sec = (tit, lista, vacio) => { app.append(el("h2", "", tit)); if (!lista.length) app.append(el("div", "vacio", vacio)); else lista.forEach((x) => app.append(tarjeta(x, ahoraMs))); };
    sec("Hoy", hoy, "No hay contenido programado para hoy.");
    sec("Próximas publicaciones", prox, "No hay más piezas en la cola. Faltan piezas por diseñar.");
    if (ant.length) sec("Anteriores", ant, "");
    ultimaCarga = Date.now(); sucio = false;
  } catch (e) {
    if (!$("#panel").hidden) $("#actualizado").textContent = e.message;
  } finally { ocupado = false; }
}

setInterval(() => {
  if (!$("#panel").hidden) {
    const s = Math.round((Date.now() - ultimaCarga) / 1000);
    if (!sucio) $("#actualizado").textContent = "Actualizado hace " + s + " s (se refresca cada 30 s)";
    if (document.visibilityState === "visible" && Date.now() - ultimaCarga >= REFRESCO_MS) cargar();
  }
}, 1000);

$("#form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const m = $("#login-msg"); m.className = "msg"; m.textContent = "Entrando…";
  try { await api("/api/login", { password: $("#clave").value }); $("#clave").value = ""; m.textContent = ""; await cargar(true); }
  catch (e) { m.className = "msg e"; m.textContent = e.message; }
});
$("#btn-actualizar").addEventListener("click", () => cargar(true));
$("#btn-salir").addEventListener("click", async () => { try { await api("/api/salir", {}); } catch {} mostrarLogin(); });

cargar(true).catch(() => {});
