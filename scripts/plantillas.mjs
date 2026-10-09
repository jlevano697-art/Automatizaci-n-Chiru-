// Plantillas de láminas 1080x1350 (4:5) con la identidad de Chiru.
// Las rutas son relativas a carruseles/<slug>/_src/

const A = "../../../assets";

export const css = `
@font-face{font-family:Outfit;font-weight:600;src:url(${A}/fonts/outfit-latin-600-normal.woff2)}
@font-face{font-family:Outfit;font-weight:800;src:url(${A}/fonts/outfit-latin-800-normal.woff2)}
@font-face{font-family:Outfit;font-weight:900;src:url(${A}/fonts/outfit-latin-900-normal.woff2)}
@font-face{font-family:Roboto;font-weight:400;src:url(${A}/fonts/roboto-latin-400-normal.woff2)}
@font-face{font-family:Roboto;font-weight:500;src:url(${A}/fonts/roboto-latin-500-normal.woff2)}
@font-face{font-family:Roboto;font-weight:700;src:url(${A}/fonts/roboto-latin-700-normal.woff2)}
:root{--rojo:#FE0000;--tinta:#101828;--crema:#FFF3E3;--ambar:#F59E0B;--ambar-claro:#FDE68A;--gris:#4A5565}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:Roboto,sans-serif;color:var(--tinta);position:relative;-webkit-font-smoothing:antialiased}
h1,h2,h3,.o{font-family:Outfit,sans-serif}
em{font-style:normal}
.logo{position:absolute;height:92px;width:auto}
.chip{position:absolute;background:var(--crema);color:var(--tinta);font:600 30px Outfit;letter-spacing:.06em;text-transform:uppercase;padding:14px 30px;border-radius:999px}
.sparkle{position:absolute;fill:var(--ambar-claro)}
.msg .sparkle{fill:var(--rojo)}
.fbox{position:relative;overflow:hidden;margin:auto}
.fbox.wide{width:100%;height:auto}
.fbox.tall{height:100%;width:auto}
.fbox img{position:absolute;display:block}
.count{position:absolute;right:64px;top:70px;background:var(--tinta);color:#fff;font:800 30px Outfit;padding:12px 26px;border-radius:999px}

/* PORTADA */
.cover{background:radial-gradient(120% 80% at 85% 0%,#ff3a30 0%,#FE0000 52%,#D40000 100%)}
.cover .logo{left:64px;top:56px}
.cover .chip{right:64px;top:74px}
.cover h1{position:absolute;left:64px;top:214px;width:952px;font-weight:900;color:#fff;letter-spacing:-.025em;line-height:.96}
.cover h1 em{color:var(--ambar-claro)}
.cover .card{position:absolute;left:64px;right:64px;bottom:138px;height:580px;background:#fff;border-radius:56px;box-shadow:0 32px 64px rgba(80,0,0,.35);padding:26px;display:flex;gap:18px}
.cover .tile{flex:1;position:relative;background:#fff;border:3px solid #F0E8DD;border-radius:36px;overflow:hidden;display:flex;flex-direction:column;align-items:center}
.cover .tile.solo{border-color:transparent}
.cover .ph{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:14px 10px 0}
.cover .tile.solo .ph{padding:0}
.cover .tile.solo .fbox{width:auto;height:100%}
.cover .ph .fbox.tall{height:100%;width:auto}
.price-pill{flex:none;margin:14px 0 22px;background:var(--rojo);color:#fff;font:800 36px Outfit;padding:8px 26px;border-radius:999px}
.swipe{position:absolute;right:64px;bottom:50px;display:flex;align-items:center;gap:18px;color:#fff;font:800 40px Outfit}
.swipe svg{width:64px;height:64px}

/* PRODUCTO */
.prod{background:var(--crema)}
.prod .logo{left:64px;top:44px;height:76px}
.prod .pcard{position:absolute;left:64px;top:146px;width:952px;height:660px;background:#fff;border-radius:52px;box-shadow:0 20px 48px rgba(16,24,40,.12);padding:28px;display:flex}
.prod .pcard .fbox{height:100%;width:auto}
.tag{position:absolute;left:30px;top:30px;z-index:2;background:var(--rojo);color:#fff;font:800 26px Outfit;letter-spacing:.08em;text-transform:uppercase;padding:10px 24px;border-radius:999px}
.prod .info{position:absolute;left:64px;right:64px;top:836px;bottom:96px;display:flex;flex-direction:column;gap:14px}
.prod h2{font-weight:800;font-size:54px;line-height:1.04;letter-spacing:-.01em}
.prod .precio{display:flex;align-items:baseline;gap:18px}
.prod .precio b{font:900 116px/1 Outfit;color:var(--rojo);letter-spacing:-.02em}
.prod .precio span{font:500 34px Roboto;color:var(--gris)}
.prod ul{list-style:none;display:flex;flex-direction:column;gap:12px;margin-top:2px}
.prod li{display:flex;align-items:center;gap:20px;font:500 37px/1.15 Roboto}
.prod li i{flex:none;width:44px;height:44px;border-radius:50%;background:var(--rojo);display:grid;place-items:center}
.prod li svg{width:26px;height:26px}
.foot{position:absolute;left:64px;bottom:40px;font:800 34px Outfit;color:var(--rojo)}
.foot-arrow{position:absolute;right:64px;bottom:30px;width:56px;height:56px}

/* COMPARAR */
.comp{background:var(--tinta);color:#fff}
.comp .logo{left:64px;top:44px;height:76px}
.comp .count{background:var(--rojo)}
.comp h2{position:absolute;left:64px;top:170px;width:952px;font:900 104px/.98 Outfit;letter-spacing:-.025em}
.comp h2 em{color:var(--ambar-claro)}
.comp .rows{position:absolute;left:64px;right:64px;top:420px;display:flex;flex-direction:column;gap:26px}
.comp .row{display:flex;align-items:center;gap:30px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12);border-radius:44px;padding:24px 34px 24px 24px}
.comp .thumb{flex:none;width:200px;height:200px;background:#fff;border-radius:32px;display:flex}
.comp .thumb{align-items:center;justify-content:center;overflow:hidden}
.comp .thumb .fbox{height:100%;width:auto}
.comp .txt{flex:1}
.comp .txt small{display:block;font:600 28px Outfit;letter-spacing:.08em;text-transform:uppercase;color:var(--ambar-claro);margin-bottom:8px}
.comp .txt strong{display:block;font:800 42px/1.08 Outfit}
.comp .pr{flex:none;font:900 64px Outfit}
.comp .foot{color:#fff}

/* MENSAJE */
.msg{background:var(--crema)}
.msg .logo{left:64px;top:44px;height:76px}
.msg .kicker{position:absolute;left:64px;top:220px;background:var(--rojo);color:#fff;font:800 32px Outfit;letter-spacing:.08em;text-transform:uppercase;padding:12px 28px;border-radius:999px}
.msg h2{position:absolute;left:64px;top:320px;width:952px;font:900 96px/1 Outfit;letter-spacing:-.025em}
.msg h2 mark{background:none;color:var(--rojo)}
.msg .pcard{position:absolute;left:64px;right:64px;bottom:130px;background:#fff;border-radius:52px;box-shadow:0 20px 48px rgba(16,24,40,.12);overflow:hidden;display:flex}
.msg .pcard .fbox{width:100%;height:auto}

/* CIERRE */
.cta{background:radial-gradient(120% 80% at 15% 100%,#ff3a30 0%,#FE0000 52%,#D40000 100%);color:#fff;text-align:center}
.cta .logo{position:absolute;left:50%;top:190px;height:250px;transform:translateX(-50%)}
.cta h2{position:absolute;left:64px;right:64px;top:520px;font:900 112px/.98 Outfit;letter-spacing:-.025em}
.cta h2 em{color:var(--ambar-claro)}
.cta p{position:absolute;left:110px;right:110px;top:830px;font:500 44px/1.25 Roboto}
.cta .url{position:absolute;left:50%;top:1010px;transform:translateX(-50%);background:var(--crema);color:var(--tinta);font:800 62px Outfit;padding:22px 64px;border-radius:999px;white-space:nowrap;box-shadow:0 20px 40px rgba(80,0,0,.3)}
.cta .ig{position:absolute;left:0;right:0;top:1170px;font:600 40px Outfit;letter-spacing:.02em}
`;

const spark = (x, y, s, o = 1) =>
  `<svg class="sparkle" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;opacity:${o}" viewBox="0 0 24 24"><path d="M12 0c.7 6.4 5.6 11.3 12 12-6.4.7-11.3 5.6-12 12-.7-6.4-5.6-11.3-12-12C6.4 11.3 11.3 6.4 12 0z"/></svg>`;

const check = `<i><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>`;
const arrow = (c = "#fff") =>
  `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" stroke="${c}" stroke-width="4"/><path d="M20 32h24M34 21l11 11-11 11" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Foto con recorte opcional (fracciones 0-1 de la imagen; ar = ancho/alto del recorte en píxeles)
export function foto(f) {
  const c = f.crop || { x: 0, y: 0, w: 1, h: 1 };
  const ar = f.ar || (c.w * (f.srcW || 1200)) / (c.h * (f.srcH || 1200));
  // escala (0-1): reduce la foto dentro de su marco; se usa con imágenes de baja resolución para que no se vean borrosas
  const esc = f.escala ? `width:auto;height:${Math.round(f.escala * 100)}%;` : "";
  return `<div class="fbox ${ar >= 1 ? "wide" : "tall"}" style="aspect-ratio:${ar};${esc}"><img src="${A}/fotos/${f.file}" style="width:${100 / c.w}%;left:${(-c.x / c.w) * 100}%;top:${(-c.y / c.h) * 100}%"></div>`;
}

const wrap = (cls, body) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body class="${cls}">${body}</body></html>`;

const moneda = (n) => `S/ ${Number.isInteger(n) ? n : n.toFixed(2)}`;

export const plantillas = {
  portada(d) {
    const solo = d.fotos.length === 1;
    const tiles = d.fotos
      .map(
        (f) =>
          `<div class="tile${solo ? " solo" : ""}"><div class="ph">${foto(f)}</div>${f.precio != null ? `<div class="price-pill">${moneda(f.precio)}</div>` : ""}</div>`,
      )
      .join("");
    return wrap(
      "cover",
      `<img class="logo" src="${A}/chiru_logo_blanco.svg">
       <div class="chip">${d.perfil}</div>
       <h1 style="font-size:${d.tituloSize || 112}px">${d.titulo}</h1>
       ${spark(880, 620, 70, 0.9)}${spark(40, 660, 38, 0.7)}
       <div class="card">${tiles}</div>
       <div class="swipe">Desliza ${arrow("#fff")}</div>`,
    );
  },

  producto(d, n, total) {
    return wrap(
      "prod",
      `<img class="logo" src="${A}/chiru_logo.svg"><div class="count">${n}/${total}</div>
       <div class="pcard"><span class="tag">${d.tag}</span>${foto(d.foto)}</div>
       <div class="info">
         <h2 style="${d.nombreSize ? `font-size:${d.nombreSize}px` : ""}">${d.nombre}</h2>
         <div class="precio"><b>${moneda(d.precio)}</b><span>en Chiru</span></div>
         <ul>${d.puntos.map((t) => `<li>${check}<span>${t}</span></li>`).join("")}</ul>
       </div>
       <div class="foot">chiru.pe</div><div class="foot-arrow">${arrow("#FE0000")}</div>`,
    );
  },

  comparar(d, n, total) {
    return wrap(
      "comp",
      `<img class="logo" src="${A}/chiru_logo_blanco.svg"><div class="count">${n}/${total}</div>
       <h2>${d.titulo}</h2>
       <div class="rows">${d.filas
         .map(
           (r) => `<div class="row"><div class="thumb">${foto(r.foto)}</div>
            <div class="txt"><small>${r.para}</small><strong>${r.nombre}</strong></div>
            <div class="pr">${moneda(r.precio)}</div></div>`,
         )
         .join("")}</div>
       <div class="foot">chiru.pe</div>`,
    );
  },

  mensaje(d, n, total) {
    return wrap(
      "msg",
      `<img class="logo" src="${A}/chiru_logo.svg"><div class="count">${n}/${total}</div>
       <div class="kicker">${d.kicker}</div>
       <h2 style="${d.textoSize ? `font-size:${d.textoSize}px;` : ""}${d.textoTop ? `top:${d.textoTop}px` : ""}">${d.texto}</h2>
       ${d.adorno ? `${spark(820, 1000, 150, 0.95)}${spark(700, 1130, 64, 0.8)}${spark(90, 1090, 90, 0.7)}` : ""}
       ${d.foto ? `<div class="pcard">${foto(d.foto)}</div>` : ""}
       <div class="foot">chiru.pe</div><div class="foot-arrow">${arrow("#FE0000")}</div>`,
    );
  },

  cierre(d) {
    return wrap(
      "cta",
      `${spark(120, 120, 60, 0.9)}${spark(920, 1120, 80, 0.8)}${spark(900, 260, 40, 0.7)}
       <img class="logo" src="${A}/chiru_logo_blanco.svg">
       <h2>${d.titulo || "Compra. <em>Vende.</em> Crece."}</h2>
       <p>${d.texto}</p>
       <div class="url">chiru.pe</div>
       <div class="ig">@chiru_pe</div>`,
    );
  },
};
