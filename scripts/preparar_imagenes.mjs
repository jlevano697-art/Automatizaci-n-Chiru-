// Convierte las láminas PNG (2160x2700) a JPG 1440x1800 en publicar/<slug>/NN.jpg.
// Instagram solo acepta JPEG por API. Uso: node scripts/preparar_imagenes.mjs [slug ...]
import { readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = resolve(import.meta.dirname, "..");
const solo = process.argv.slice(2);
const slugs = readdirSync(resolve(RAIZ, "carruseles"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!solo.length || solo.includes(d.name)))
  .map((d) => d.name);

for (const slug of slugs) {
  const png = readdirSync(resolve(RAIZ, "carruseles", slug)).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  const out = resolve(RAIZ, "publicar", slug);
  mkdirSync(out, { recursive: true });
  png.forEach((f, i) => {
    const dest = resolve(out, `${String(i + 1).padStart(2, "0")}.jpg`);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", resolve(RAIZ, "carruseles", slug, f), "-vf", "scale=1440:1800:flags=lanczos", "-q:v", "2", dest]);
  });
  console.log(`OK ${slug}: ${png.length} láminas -> publicar/${slug}/`);
}
