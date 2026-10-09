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

  // ---------- Lote 2 (productos de CHIRUMARKET con foto propia, stock y precio) ----------
  {
    slug: "13_apple",
    slides: [
      { t: "portada", perfil: "Tu Apple", titulo: "Accesorios para tu <em>Apple</em>", tituloSize: 140,
        fotos: [
          { file: "2a77c706_1.webp", precio: precio("2a77c706") },
          { file: "b2c4a230_1.jpg", srcW: 522, srcH: 664, escala: 0.9, precio: precio("b2c4a230") },
          { file: "5f12b024_2.jpg", precio: precio("5f12b024") },
        ] },
      { t: "producto", tag: "Apple Watch", nombre: "Funda Spigen Rugged Armor para Apple Watch Ultra 2", nombreSize: 46, precio: precio("2a77c706"),
        foto: { file: "2a77c706_1.webp" },
        puntos: ["Resiste golpes y caídas", "Diseño ultradelgado: no añade volumen", "Para Apple Watch Ultra 2 de 49 mm"] },
      { t: "producto", tag: "Apple Watch", nombre: "Cargador portátil para Apple Watch", precio: precio("b2c4a230"),
        foto: { file: "b2c4a230_1.jpg", srcW: 522, srcH: 664, escala: 0.88 },
        puntos: ["Tipo llavero, con batería de 1400 mAh", "Carga el Apple Watch de forma inalámbrica", "Se recarga por USB tipo C"] },
      { t: "producto", tag: "iPhone", nombre: "Cargador inalámbrico MagSafe 15 W (genérico)", nombreSize: 48, precio: precio("5f12b024"),
        foto: { file: "5f12b024_2.jpg" },
        puntos: ["Carga inalámbrica de 15 W para iPhone", "Incluye cargador y manual", "Garantía del proveedor: 6 meses"] },
      { t: "comparar", titulo: "¿Qué <em>necesitas</em>?",
        filas: [
          { para: "Proteger tu reloj", nombre: "Funda Spigen", precio: precio("2a77c706"), foto: { file: "2a77c706_1.webp" } },
          { para: "Cargar tu reloj", nombre: "Cargador portátil", precio: precio("b2c4a230"), foto: { file: "b2c4a230_1.jpg", srcW: 522, srcH: 664 } },
          { para: "Cargar tu iPhone", nombre: "Cargador MagSafe", precio: precio("5f12b024"), foto: { file: "5f12b024_2.jpg" } },
        ] },
      { t: "cierre", texto: "Encuentra estos accesorios y más en Chiru." },
    ],
  },
  {
    slug: "14_estudio",
    slides: [
      { t: "portada", perfil: "Estudio y trabajo", titulo: "Tu kit para <em>estudiar y trabajar</em>", tituloSize: 120,
        fotos: [
          { file: "1c1abbb5_1.webp", precio: precio("1c1abbb5") },
          { file: "8454ba35_2.webp", precio: precio("8454ba35") },
          { file: "f8c3778f_1.webp", precio: precio("f8c3778f") },
        ] },
      { t: "producto", tag: "Tablet", nombre: "Lápiz digital para Samsung Galaxy Tab", precio: precio("1c1abbb5"),
        foto: { file: "1c1abbb5_1.webp" },
        puntos: ["Para Galaxy Tab S6, S7, S8, S9, S10 y S11", "Escritura fluida y precisa", "Ideal para tomar notas y dibujar"] },
      { t: "producto", tag: "Audio", nombre: "Audífonos Bluetooth Air Pro 6", precio: precio("8454ba35"),
        foto: { file: "8454ba35_2.webp" },
        puntos: ["Conexión inalámbrica Bluetooth", "Carga rápida", "Garantía de 30 días"] },
      { t: "producto", tag: "Accesorio", nombre: "Adaptador USB tipo C a USB — Baseus", nombreSize: 50, precio: precio("f8c3778f"),
        foto: { file: "f8c3778f_1.webp" },
        puntos: ["Conecta dispositivos USB a equipos con USB-C", "Compacto: para llevar contigo", "Para smartphone, tablet o laptop"] },
      { t: "comparar", titulo: "Elige el <em>tuyo</em>",
        filas: [
          { para: "Para tu tablet", nombre: "Lápiz digital", precio: precio("1c1abbb5"), foto: { file: "1c1abbb5_1.webp" } },
          { para: "Para concentrarte", nombre: "Audífonos Air Pro 6", precio: precio("8454ba35"), foto: { file: "8454ba35_2.webp" } },
          { para: "Para conectar", nombre: "Adaptador USB-C", precio: precio("f8c3778f"), foto: { file: "f8c3778f_1.webp" } },
        ] },
      { t: "cierre", texto: "Encuentra tu kit de estudio y más en Chiru." },
    ],
  },
  {
    slug: "15_auto",
    slides: [
      { t: "portada", perfil: "Para tu auto", titulo: "Más luz para tu <em>auto</em>", tituloSize: 150,
        fotos: [{ file: "6227a5c9_1.png", srcW: 794, srcH: 620, crop: { x: 0, y: 0, w: 1, h: 0.93 }, escala: 0.9 }] },
      { t: "producto", tag: "Autos", nombre: "Focos Philips Ultinon Essential G2 LED", nombreSize: 50, precio: precio("6227a5c9"),
        foto: { file: "6227a5c9_1.png", srcW: 794, srcH: 620, crop: { x: 0, y: 0, w: 1, h: 0.93 }, escala: 0.76 },
        puntos: ["Kit de dos bombillas LED", "Brillo potente y luz blanca nítida", "Compatible con 12 V y 24 V"] },
      { t: "mensaje", kicker: "Antes de comprar",
        texto: "Es un foco tipo <mark>LED-HL equivalente a H7</mark>. Verifica que sea el de <mark>tu vehículo</mark>.", textoSize: 92, textoTop: 380, adorno: true },
      { t: "cierre", texto: "Encuentra los focos y más para tu auto en Chiru." },
    ],
  },
  {
    slug: "16_energia",
    slides: [
      { t: "portada", perfil: "Siempre con batería", titulo: "Que <em>nunca</em> se te acabe la batería", tituloSize: 118,
        fotos: [
          { file: "bd3b85ee_1.webp", escala: 0.62, precio: precio("bd3b85ee") },
          { file: "d6dfb05b_1.png", srcW: 435, srcH: 412, crop: { x: 0, y: 0.02, w: 1, h: 0.84 }, escala: 0.62, precio: precio("d6dfb05b") },
        ] },
      { t: "producto", tag: "Cargadores", nombre: "Cargador Ugreen Nexode mini 45 W", precio: precio("bd3b85ee"),
        foto: { file: "bd3b85ee_1.webp", escala: 0.72 },
        puntos: ["2 puertos USB-C", "Tecnología GaN: más eficiente y con menos calor", "Para laptops, tablets y celulares"] },
      { t: "producto", tag: "Cargadores", nombre: "Cargador Liitokala Lii-ND4 para pilas", nombreSize: 48, precio: precio("d6dfb05b"),
        foto: { file: "d6dfb05b_1.png", srcW: 435, srcH: 412, crop: { x: 0, y: 0.02, w: 1, h: 0.84 }, escala: 0.72 },
        puntos: ["Baterías recargables AA, AAA y 9 V", "Pantalla LCD: voltaje, corriente y tiempo", "Test de capacidad y protección de sobrecarga"] },
      { t: "comparar", titulo: "¿Para <em>qué</em>?",
        filas: [
          { para: "Laptop, tablet y celular", nombre: "Ugreen Nexode 45 W", precio: precio("bd3b85ee"), foto: { file: "bd3b85ee_1.webp" } },
          { para: "Pilas recargables", nombre: "Liitokala Lii-ND4", precio: precio("d6dfb05b"), foto: { file: "d6dfb05b_1.png", srcW: 435, srcH: 412, crop: { x: 0, y: 0.02, w: 1, h: 0.84 } } },
        ] },
      { t: "cierre", texto: "Encuentra cargadores y más en Chiru." },
    ],
  },
  {
    slug: "17_tv",
    slides: [
      { t: "portada", perfil: "Para tu sala", titulo: "Ve y escucha mejor <em>en casa</em>", tituloSize: 126,
        fotos: [
          { file: "1a31025d_1.png", srcW: 629, srcH: 499, crop: { x: 0, y: 0, w: 1, h: 0.82 }, escala: 0.8, precio: precio("1a31025d") },
          { file: "cd03f83f_1.png", srcW: 386, srcH: 329, escala: 0.6, precio: precio("cd03f83f") },
        ] },
      { t: "producto", tag: "Televisión", nombre: "Antena de TV digital HD para interiores", nombreSize: 48, precio: precio("1a31025d"),
        foto: { file: "1a31025d_1.png", srcW: 629, srcH: 499, crop: { x: 0, y: 0, w: 1, h: 0.82 }, escala: 0.9 },
        puntos: ["Recibe canales HD de señal abierta", "Para interiores, con amplificador integrado", "Compatible con ATSC, DVB-T, DVB-T2 e ISDB"] },
      { t: "producto", tag: "Audio", nombre: "Receptor Bluetooth con NFC", precio: precio("cd03f83f"),
        foto: { file: "cd03f83f_1.png", srcW: 386, srcH: 329, escala: 0.62 },
        puntos: ["Añade Bluetooth a equipos de audio tradicionales", "Conexión rápida con NFC: acerca y conecta", "Salida de audio RCA"] },
      { t: "comparar", titulo: "Mejora tu <em>sala</em>",
        filas: [
          { para: "Para ver TV", nombre: "Antena digital HD", precio: precio("1a31025d"), foto: { file: "1a31025d_1.png", srcW: 629, srcH: 499, crop: { x: 0, y: 0, w: 1, h: 0.82 } } },
          { para: "Para tu equipo de audio", nombre: "Receptor Bluetooth NFC", precio: precio("cd03f83f"), foto: { file: "cd03f83f_1.png", srcW: 386, srcH: 329 } },
        ] },
      { t: "cierre", texto: "Encuentra estos productos y más en Chiru." },
    ],
  },
];
