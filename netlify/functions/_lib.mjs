// Utilidades del panel en Netlify: sesión por contraseña, acceso al repositorio de GitHub y reglas de validación.
// Todas las claves salen de variables de entorno de Netlify. Nunca se escriben en el código ni llegan al navegador.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const TZ = "America/Lima";
export const MAX_POR_DIA = 3;
export const MIN_HORAS = 2;
export const MARGEN_MIN = 4;

export const cfg = () => ({
  repo: process.env.GITHUB_REPO || "jlevano697-art/Automatizaci-n-Chiru-",
  branch: process.env.GITHUB_BRANCH || "main",
  token: process.env.GITHUB_TOKEN,
  password: process.env.PANEL_PASSWORD,
  secret: process.env.PANEL_SECRET,
});

export const configurado = () => {
  const c = cfg();
  return Boolean(c.token && c.password && c.secret && c.secret.length >= 24);
};

export const ahora = () => (process.env.AHORA ? new Date(process.env.AHORA) : new Date());
export const dia = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

/* ---------- Sesión ---------- */
const HORAS_SESION = 8;
const firmar = (payload, secret) => createHmac("sha256", secret).update(payload).digest("base64url");

export function crearSesion(secret) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + HORAS_SESION * 3600e3 })).toString("base64url");
  return `${payload}.${firmar(payload, secret)}`;
}

export function sesionValida(secret, cookieHeader) {
  const m = (cookieHeader || "").match(/(?:^|;\s*)sesion=([^;]+)/);
  if (!m) return false;
  const [payload, firma] = m[1].split(".");
  if (!payload || !firma) return false;
  const a = Buffer.from(firma);
  const b = Buffer.from(firmar(payload, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function contrasenaCorrecta(ingresada, esperada) {
  const h = (s) => createHash("sha256").update(String(s)).digest();
  return timingSafeEqual(h(ingresada), h(esperada));
}

export const cookieSesion = (valor, maxAge = HORAS_SESION * 3600) => `sesion=${valor}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

/* ---------- GitHub ---------- */
async function gh(ruta, { method = "GET", body } = {}) {
  const { repo, token } = cfg();
  return fetch(`https://api.github.com/repos/${repo}/${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "chiru-panel",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function leerArchivo(ruta) {
  const { branch } = cfg();
  const r = await gh(`contents/${encodeURI(ruta)}?ref=${branch}`);
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} al leer ${ruta}`);
  const j = await r.json();
  return { texto: Buffer.from(j.content, "base64").toString("utf8"), sha: j.sha };
}

export async function escribirArchivo(ruta, texto, sha, mensaje) {
  const { branch } = cfg();
  const r = await gh(`contents/${encodeURI(ruta)}`, {
    method: "PUT",
    body: { message: mensaje, content: Buffer.from(texto, "utf8").toString("base64"), sha, branch },
  });
  if (r.status === 409 || r.status === 422) {
    const e = new Error("conflicto");
    e.conflicto = true;
    throw e;
  }
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} al guardar ${ruta}`);
}

/** Lanza el flujo de GitHub que entrega a Buffer lo aprobado. Necesita el permiso "Actions: Read and write" en el token. */
export async function lanzarEnvio() {
  const { branch } = cfg();
  const r = await gh("actions/workflows/enviar_a_buffer.yml/dispatches", {
    method: "POST",
    body: { ref: branch, inputs: { enviar_real: "true", diagnostico: "false" } },
  });
  if (r.status === 204) return { ok: true };
  const motivo = r.status === 403 || r.status === 404 ? "el token de GitHub no tiene el permiso Actions: Read and write" : `GitHub respondió ${r.status}`;
  return { ok: false, motivo };
}

/** Lee cola.json, aplica `fn(cola)` (que puede lanzar un error de validación) y la guarda. Reintenta si hubo conflicto. */
export async function mutarCola(fn, mensaje) {
  for (let i = 0; i < 3; i++) {
    const { texto, sha } = await leerArchivo("cola.json");
    const cola = JSON.parse(texto);
    const resultado = await fn(cola);
    try {
      await escribirArchivo("cola.json", JSON.stringify(cola, null, 2) + "\n", sha, mensaje);
      return resultado;
    } catch (e) {
      if (!e.conflicto || i === 2) throw e;
    }
  }
}

/* ---------- Reglas ---------- */
export function validarCambios(cola, item, pie, fecha) {
  const e = [];
  if (typeof pie !== "string" || !pie.trim()) e.push("El texto no puede estar vacío");
  if (pie && pie.length > 2200) e.push(`El texto tiene ${pie.length} caracteres (máximo 2200)`);
  if (pie && (pie.match(/#\w+/g) || []).length > 30) e.push("Más de 30 hashtags");
  const f = new Date(fecha);
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/.test(fecha) || isNaN(f)) e.push("Fecha u hora inválida");
  else {
    if (f.getTime() < ahora().getTime() + MARGEN_MIN * 60000) e.push(`La hora debe ser al menos ${MARGEN_MIN} minutos en el futuro`);
    const otras = cola.filter((x) => x.id !== item.id && (x.estado === "en_buffer" || x.estado === "publicado" || (x.estado === "pendiente" && x.aprobado)));
    if (otras.filter((x) => dia(x.fecha) === dia(f)).length >= MAX_POR_DIA) e.push(`Ya hay ${MAX_POR_DIA} publicaciones ese día`);
    if (otras.some((x) => Math.abs(new Date(x.fecha) - f) < MIN_HORAS * 3600e3)) e.push(`Debe haber al menos ${MIN_HORAS} horas respecto a otra publicación`);
  }
  return e;
}

export class ErrorDeUsuario extends Error {
  constructor(mensaje, codigo = 422) {
    super(mensaje);
    this.codigo = codigo;
  }
}
