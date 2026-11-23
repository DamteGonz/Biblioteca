// Genera iconos y pantallas de arranque de la APK a partir del diseño del icono.
// Uso: node scripts/android_assets.js   (necesita Playwright)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const RES = path.join(__dirname, "../app/android/app/src/main/res");
const BG = "#0a0a0b";
// Trazos del icono (mismo dibujo que app/public/icon.svg), en un lienzo de 512.
const ARTE = `
  <g fill="none" stroke="#f1eee8" stroke-width="14" stroke-linecap="round">
    <path d="M150 130v252M198 130v252M246 150v232"/><path d="M300 152l58 228"/><path d="M120 382h272"/>
  </g>
  <circle cx="372" cy="150" r="22" fill="#7cc8f2"/>`;

const svg = (w, h, { fondo = true, redondo = false, escala = 1, radio = 0 } = {}) => {
  const lado = Math.min(w, h) * escala;
  const x = (w - lado) / 2, y = (h - lado) / 2;
  const recorte = redondo ? `<clipPath id="c"><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}"/></clipPath>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${recorte}</defs>
    <g ${redondo ? 'clip-path="url(#c)"' : ""}>
      ${fondo ? `<rect width="${w}" height="${h}" rx="${radio}" fill="${BG}"/>` : ""}
      <svg x="${x}" y="${y}" width="${lado}" height="${lado}" viewBox="0 0 512 512">${ARTE}</svg>
    </g></svg>`;
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const png = async (archivo, w, h, opciones, transparente = false) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(w, h, opciones)}</body></html>`);
    await p.screenshot({ path: path.join(RES, archivo), omitBackground: transparente });
  };
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, n] of Object.entries(dens)) {
    await png(`mipmap-${d}/ic_launcher.png`, n, n, { radio: n * 0.22 }, true);
    await png(`mipmap-${d}/ic_launcher_round.png`, n, n, { redondo: true }, true);
    const f = Math.round(n * 2.25); // capa delantera del icono adaptativo (108dp)
    await png(`mipmap-${d}/ic_launcher_foreground.png`, f, f, { fondo: false, escala: 0.62 }, true);
  }
  for (const dir of fs.readdirSync(RES).filter((x) => x.startsWith("drawable"))) {
    const archivo = path.join(RES, dir, "splash.png");
    if (!fs.existsSync(archivo)) continue;
    const buf = fs.readFileSync(archivo);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    await png(`${dir}/splash.png`, w, h, { escala: 0.28 });
  }
  await b.close();
  console.log("Iconos y pantallas de arranque generados");
})();
