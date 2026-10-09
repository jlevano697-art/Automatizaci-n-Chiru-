// Descarga el catálogo público de Chiru y lo guarda en productos.json
// Uso: node scripts/fetch_catalog.mjs
import { writeFileSync } from "node:fs";

const API = "https://api.chiru.pe/products";
const PAGE_SIZE = 50;

const items = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${API}?limit=${PAGE_SIZE}&page=${page}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en página ${page}`);
  const json = await res.json();
  items.push(...json.data);
  if (page >= json.meta.totalPages) break;
}

const productos = items.map((x) => {
  const rango = x.price?.ranges?.[0];
  return {
    id: x.id,
    nombre: x.name,
    precio: rango?.cost ?? null,
    moneda: rango?.currency ?? null,
    pedido_minimo: rango?.amountMin ?? null,
    categoria: x.category?.name ?? null,
    proveedor: x.supplier?.name ?? null,
    ciudad: x.supplier?.city ?? null,
    stock: x.stock ?? 0,
    descripcion: (x.description ?? "").replace(/\s+/g, " ").trim(),
    especificaciones: x.specifications ?? "",
    imagenes: (x.images ?? []).map((i) => i.urlImage).filter(Boolean),
    url: `https://chiru.pe/es/product-detail/${x.id}`,
  };
});

writeFileSync("productos.json", JSON.stringify(productos, null, 2), "utf8");
console.log(`${productos.length} productos guardados en productos.json`);
