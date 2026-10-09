// API del panel (Netlify Functions v2). Rutas: /api/login, /api/salir, /api/estado, /api/pieza/:id/(guardar|aprobar|quitar)
import {
  cfg, configurado, ahora, dia, crearSesion, sesionValida, contrasenaCorrecta, cookieSesion,
  leerArchivo, escribirArchivo, mutarCola, validarCambios, ErrorDeUsuario,
} from "./_lib.mjs";

export const config = { path: "/api/*" };

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });

// Límite de intentos de contraseña (en memoria de la instancia; es una protección básica adicional).
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;
const ipDe = (req) => (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "desconocida").split(",")[0].trim();
const bloqueada = (ip) => {
  const r = (intentos.get(ip) || []).filter((t) => Date.now() - t < VENTANA_MS);
  intentos.set(ip, r);
  return r.length >= MAX_INTENTOS;
};
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function leerEstado() {
  const { repo, branch } = cfg();
  const [{ texto: tc }, { texto: tp }] = await Promise.all([leerArchivo("cola.json"), leerArchivo("productos.json")]);
  const cola = JSON.parse(tc).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const catalogo = JSON.parse(tp);
  const items = await Promise.all(
    cola.map(async (x) => {
      const pie = (await leerArchivo(x.pie)).texto;
      return {
        id: x.id, perfil: x.perfil, fecha: x.fecha, estado: x.estado, aprobado: !!x.aprobado, error: x.error || null,
        imagenes: x.laminas.map((l) => `https://raw.githubusercontent.com/${repo}/${branch}/${l}`),
        pie, titulo: pie.trim().split("\n")[0],
        productos: x.productos.map((p) => ({ nombre: catalogo.find((c) => c.id === p.id)?.nombre ?? p.id, precio: p.precio })),
        editable: x.estado === "pendiente" && !x.aprobado,
      };
    }),
  );
  return { ahora: ahora().toISOString(), hoy: dia(ahora()), items };
}

async function accionPieza(id, accion, body) {
  if (accion === "guardar") {
    // 1) validar contra la cola actual, 2) guardar el texto, 3) guardar la hora (revalidando).
    const { texto } = await leerArchivo("cola.json");
    const cola = JSON.parse(texto);
    const item = cola.find((x) => x.id === id);
    if (!item) throw new ErrorDeUsuario("Pieza no encontrada", 404);
    if (item.estado !== "pendiente") throw new ErrorDeUsuario(`La pieza está "${item.estado}" y ya no se puede cambiar aquí`, 409);
    if (item.aprobado) throw new ErrorDeUsuario("Quita la aprobación antes de editar", 409);
    const errores = validarCambios(cola, item, body.pie, body.fecha);
    if (errores.length) throw new ErrorDeUsuario(errores.join(". "));
    const pieActual = await leerArchivo(item.pie);
    const nuevo = body.pie.trim() + "\n";
    if (pieActual.texto !== nuevo) await escribirArchivo(item.pie, nuevo, pieActual.sha, `Panel: texto de ${id}`);
    await mutarCola((c) => {
      const it = c.find((x) => x.id === id);
      if (it.estado !== "pendiente" || it.aprobado) throw new ErrorDeUsuario("La pieza cambió mientras editabas. Recarga la página.", 409);
      const errs = validarCambios(c, it, body.pie, body.fecha);
      if (errs.length) throw new ErrorDeUsuario(errs.join(". "));
      it.fecha = body.fecha;
      delete it.error;
    }, `Panel: hora de ${id}`);
    return { ok: true };
  }

  if (accion === "aprobar") {
    await mutarCola(async (c) => {
      const it = c.find((x) => x.id === id);
      if (!it) throw new ErrorDeUsuario("Pieza no encontrada", 404);
      if (it.estado !== "pendiente") throw new ErrorDeUsuario(`La pieza está "${it.estado}" y ya no se puede cambiar aquí`, 409);
      const pie = (await leerArchivo(it.pie)).texto;
      const errs = validarCambios(c, it, pie, it.fecha);
      if (errs.length) throw new ErrorDeUsuario(errs.join(". "));
      it.aprobado = true;
    }, `Panel: aprobar ${id}`);
    return { ok: true };
  }

  await mutarCola((c) => {
    const it = c.find((x) => x.id === id);
    if (!it) throw new ErrorDeUsuario("Pieza no encontrada", 404);
    if (it.estado !== "pendiente") throw new ErrorDeUsuario(`La pieza está "${it.estado}" y ya no se puede cambiar aquí`, 409);
    it.aprobado = false;
  }, `Panel: quitar aprobación de ${id}`);
  return { ok: true };
}

export default async (req) => {
  try {
    if (!configurado()) return json({ error: "El panel aún no está configurado (faltan variables de entorno en Netlify)." }, 503);
    const { secret, password } = cfg();
    const ruta = new URL(req.url).pathname.replace(/\/+$/, "");

    if (req.method === "POST") {
      if (req.headers.get("x-panel") !== "1" || !String(req.headers.get("content-type")).startsWith("application/json")) return json({ error: "Solicitud no permitida" }, 403);
    }

    if (ruta === "/api/login" && req.method === "POST") {
      const ip = ipDe(req);
      if (bloqueada(ip)) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
      const body = await req.json().catch(() => ({}));
      if (typeof body.password !== "string" || !contrasenaCorrecta(body.password, password)) {
        intentos.set(ip, [...(intentos.get(ip) || []), Date.now()]);
        await dormir(800);
        return json({ error: "Contraseña incorrecta" }, 401);
      }
      intentos.delete(ip);
      return json({ ok: true }, 200, { "Set-Cookie": cookieSesion(crearSesion(secret)) });
    }
    if (ruta === "/api/salir" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookieSesion("", 0) });

    if (!sesionValida(secret, req.headers.get("cookie"))) return json({ error: "Sesión no válida" }, 401);

    if (ruta === "/api/estado" && req.method === "GET") return json(await leerEstado());

    const m = ruta.match(/^\/api\/pieza\/([\w-]+)\/(guardar|aprobar|quitar)$/);
    if (m && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json(await accionPieza(m[1], m[2], body));
    }
    return json({ error: "No encontrado" }, 404);
  } catch (err) {
    if (err instanceof ErrorDeUsuario) return json({ error: err.message }, err.codigo);
    console.error("Error del panel:", err.message); // sin datos sensibles
    return json({ error: "No se pudo completar la operación. Intenta de nuevo." }, 500);
  }
};
