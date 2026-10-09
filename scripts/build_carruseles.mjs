// Genera las láminas PNG (2160x2700) de cada carrusel y una hoja de revisión.
// Uso: node scripts/build_carruseles.mjs [slug ...]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { carruseles } from "./carruseles_def.mjs";
import { plantillas } from "./plantillas.mjs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const solo = process.argv.slice(2);
const raiz = resolve(import.meta.dirname, "..");

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--disable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

try {
  for (const c of carruseles) {
    if (solo.length && !solo.includes(c.slug)) continue;
    const dir = resolve(raiz, "carruseles", c.slug);
    mkdirSync(resolve(dir, "_src"), { recursive: true });
    const total = c.slides.length;
    const archivos = [];

    for (let i = 0; i < total; i++) {
      const s = c.slides[i];
      const nn = String(i + 1).padStart(2, "0");
      const html = plantillas[{ portada: "portada", producto: "producto", comparar: "comparar", mensaje: "mensaje", cierre: "cierre" }[s.t]](s, i + 1, total);
      const src = resolve(dir, "_src", `slide-${nn}.html`);
      writeFileSync(src, html, "utf8");

      await page.goto(pathToFileURL(src).href);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
      });
      const rotas = await page.evaluate(() => [...document.images].filter((im) => !im.naturalWidth).map((im) => im.src));
      if (rotas.length) throw new Error(`Imágenes sin cargar en ${c.slug}/slide-${nn}: ${rotas.join(", ")}`);
      const out = resolve(dir, `slide-${nn}.png`);
      await page.screenshot({ path: out });
      archivos.push(out);
      console.log("OK", c.slug, `slide-${nn}.png`);
    }

    // hoja de revisión (todas las láminas en fila)
    const hoja = `<body style="margin:0;background:#222;display:flex;gap:16px;padding:16px;width:${total * 396}px">${archivos
      .map((f) => `<img src="${pathToFileURL(f).href}" style="width:380px;height:475px;display:block">`)
      .join("")}</body>`;
    const hojaSrc = resolve(dir, "_src", "hoja.html");
    writeFileSync(hojaSrc, hoja, "utf8");
    const p2 = await ctx.newPage();
    await p2.setViewportSize({ width: total * 396, height: 507 });
    await p2.goto(pathToFileURL(hojaSrc).href);
    await p2.evaluate(() => Promise.all([...document.images].map((im) => im.decode())));
    await p2.screenshot({ path: resolve(dir, "_hoja.png") });
    await p2.close();
  }
} finally {
  await browser.close();
}
