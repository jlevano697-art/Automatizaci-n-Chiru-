// Definición de carruseles. Precios y nombres salen de productos.json; los textos
// solo usan datos de las fichas (descripción/especificaciones) para no inventar nada.
import { readFileSync } from "node:fs";

const catalogo = JSON.parse(readFileSync(new URL("../productos.json", import.meta.url), "utf8"));
export const precio = (id) => {
  const p = catalogo.find((x) => x.id.startsWith(id));
  if (!p || p.precio == null) throw new Error(`Sin precio para ${id}`);
  return p.precio;
};

// Recorte de la foto de la secadora UV: quita el rótulo de proveedor y los márgenes vacíos.
const UV_CROP = { x: 0.05, y: 0.1, w: 0.93, h: 0.89 };

const P = {
  uv: "7982b177", calzado: "76e05735", cabello: "fd0438d6", plato: "261e872e",
  tumbler: "1b2f5ab8", termo: "7c791277", palomitas: "ca159455",
};

export const carruseles = [
  {
    slug: "08_hogar",
    slides: [
      {
        t: "portada", perfil: "Para tu hogar",
        titulo: "Ropa y zapatos <em>secos</em> sin esperar al sol", tituloSize: 128,
        fotos: [
          { file: `${P.uv}_1.webp`, crop: UV_CROP, precio: precio(P.uv) },
          { file: `${P.calzado}_1.jpg`, precio: precio(P.calzado) },
          { file: `${P.cabello}_1.webp`, precio: precio(P.cabello) },
        ],
      },
      {
        t: "producto", tag: "Hogar", nombre: "Secadora portátil con luz UV", precio: precio(P.uv),
        foto: { file: `${P.uv}_1.webp`, crop: UV_CROP },
        puntos: ["Motor de 600 W", "Seca y esteriliza con luz ultravioleta", "Ideal para el hogar y para viajes"],
      },
      {
        t: "producto", tag: "Hogar", nombre: "Secador de calzado eléctrico portátil", precio: precio(P.calzado),
        foto: { file: `${P.calzado}_1.jpg` },
        puntos: ["Elimina la humedad y el mal olor", "Para cualquier tipo de calzado", "Portátil: en casa o de viaje"],
      },
      {
        t: "producto", tag: "Hogar", nombre: "Secadora de cabello 5000 W", precio: precio(P.cabello),
        foto: { file: `${P.cabello}_1.webp` },
        puntos: ["Tecnología iónica", "3 niveles de temperatura y 2 velocidades", "Incluye accesorios"],
      },
      {
        t: "comparar", titulo: "¿Cuál <em>necesitas</em>?",
        filas: [
          { para: "Para tu ropa", nombre: "Secadora portátil UV", precio: precio(P.uv), foto: { file: `${P.uv}_1.webp`, crop: UV_CROP } },
          { para: "Para tu calzado", nombre: "Secador de calzado", precio: precio(P.calzado), foto: { file: `${P.calzado}_1.jpg` } },
          { para: "Para tu cabello", nombre: "Secadora 5000 W", precio: precio(P.cabello), foto: { file: `${P.cabello}_1.webp` } },
        ],
      },
      { t: "cierre", texto: "Encuentra estos y más productos en Chiru." },
    ],
  },
  {
    slug: "12_perro",
    slides: [
      {
        t: "portada", perfil: "Para tu mejor amigo",
        titulo: "¿Tu perro come <em>demasiado rápido</em>?", tituloSize: 118,
        fotos: [{ file: `${P.plato}_2.webp`, crop: { x: 0.05, y: 0.2, w: 0.9, h: 0.6 } }],
      },
      {
        t: "mensaje", kicker: "Si te pasa esto",
        texto: "Si tu perro <mark>vacía su plato en segundos</mark>, esto es para él.",
        textoSize: 112, textoTop: 380, adorno: true,
      },
      {
        t: "producto", tag: "Mascotas", nombre: "Plato anti estrés para perros", precio: precio(P.plato),
        foto: { file: `${P.plato}_3.webp` },
        puntos: ["Reduce la velocidad de alimentación", "Plástico duradero", "Para perros de todos los tamaños"],
      },
      {
        t: "mensaje", kicker: "Así funciona",
        texto: "Sus relieves lo hacen comer <mark>más despacio</mark> y la hora de comer, <mark>más divertida</mark>.",
        textoSize: 88,
        foto: { file: `${P.plato}_2.webp`, crop: { x: 0, y: 0.2, w: 1, h: 0.44 }, srcW: 1200, srcH: 1200 },
      },
      { t: "cierre", texto: "Encuentra el plato y más para tu mascota en Chiru." },
    ],
  },
  {
    slug: "05_bolsillo",
    slides: [
      {
        t: "portada", perfil: "Ofertas que rinden",
        titulo: "3 productos <em>hasta S/ 40</em>", tituloSize: 156,
        fotos: [
          { file: `${P.tumbler}_1.webp`, crop: { x: 0, y: 0, w: 0.52, h: 1 }, precio: precio(P.tumbler) },
          { file: `${P.termo}_2.webp`, precio: precio(P.termo) },
          { file: `${P.palomitas}_1.webp`, precio: precio(P.palomitas) },
        ],
      },
      {
        t: "producto", tag: "Para llevar", nombre: "Termo vaso tumbler térmico", precio: precio(P.tumbler),
        foto: { file: `${P.tumbler}_1.webp`, crop: { x: 0, y: 0, w: 0.52, h: 1 } },
        puntos: ["Acero inoxidable", "Diseño antideslizante", "Mantiene tus bebidas frías o calientes"],
      },
      {
        t: "producto", tag: "Para llevar", nombre: "Termo eléctrico inteligente 500 ml", precio: precio(P.termo),
        foto: { file: `${P.termo}_2.webp` },
        puntos: ["Capacidad de 500 ml", "Acero inoxidable de alta calidad", "Para llevar o usar en casa"],
      },
      {
        t: "producto", tag: "Cocina", nombre: "Máquina de palomitas Canchita Cine", precio: precio(P.palomitas),
        foto: { file: `${P.palomitas}_1.webp` },
        puntos: ["Palomitas frescas y crujientes en minutos", "Ideal para noches de película", "Diseño moderno y fácil de usar"],
      },
      { t: "cierre", texto: "Encuentra estos y más productos en Chiru." },
    ],
  },
];
