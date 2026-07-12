import dotenv from "dotenv";
import dns from "node:dns/promises";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../backend/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, "backend", ".env") });
dotenv.config({ path: path.join(root, ".env") });

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");
  parsed.searchParams.set("sslmode", "disable");
  return parsed.toString();
}

process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);

const prisma = new PrismaClient();
const ACCOUNT_NAME = "WooTech";
const ACCOUNT_SLUG = "wootech";
const ADMIN_EMAIL = "admin@wootech.com.br";
const ADMIN_PASSWORD = "WooTech@2026";
const CLOSER_EMAIL = "closer@wootech.com.br";
const CLOSER_PASSWORD = "CloserWooTech@2026";
const LANDING_SLUG = "wootech-inteligente";
const LANDING_DOMAIN = "wootech.com.br";
const CRM_DOMAIN = "crm.wootech.com.br";
const ASSET_BASE_URL = "/lp-assets/wootech";
const WOOTECH_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="70" viewBox="0 0 260 70"><rect width="260" height="70" fill="#030507"/><g transform="translate(14 17) skewX(-28)"><rect width="23" height="36" rx="2" fill="#ffd10a"/><rect x="24" width="23" height="36" rx="2" fill="#e6a900"/><rect x="48" width="23" height="36" rx="2" fill="#f7f8fb"/></g><text x="94" y="44" fill="#f7f8fb" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="6">WOO</text><text x="169" y="44" fill="#ffd10a" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="6">TECH</text></svg>`;
const WOOTECH_LOGO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(WOOTECH_LOGO_SVG)}`;

const sourceAssets = [
  {
    source: path.join(os.homedir(), "Downloads", "ChatGPT Image 10 de jul. de 2026, 20_47_29.png"),
    fileName: "wootech-logo-reference.png",
  },
  {
    source: path.join(os.homedir(), "Downloads", "ChatGPT Image 10 de jul. de 2026, 20_47_22.png"),
    fileName: "wootech-page-reference.png",
  },
];

async function copyWootechAssets() {
  const publicDir = path.join(root, "backend", "public", "lp-assets", "wootech");
  const outputDir = path.join(root, "output", "wootech-landing-pages", "assets");
  await Promise.all([
    fs.mkdir(publicDir, { recursive: true }),
    fs.mkdir(outputDir, { recursive: true }),
  ]);

  for (const asset of sourceAssets) {
    try {
      await fs.access(asset.source);
    } catch {
      console.warn(`Asset opcional nao encontrado, pulando copia: ${asset.source}`);
      continue;
    }

    const publicTarget = path.join(publicDir, asset.fileName);
    const outputTarget = path.join(outputDir, asset.fileName);
    await fs.copyFile(asset.source, publicTarget);
    await fs.copyFile(asset.source, outputTarget);
  }
}

async function getDomainStatus(domain) {
  const expectedIp = process.env.WHITELABEL_DOCKER_IP || "207.58.153.219";
  const expectedCname = (process.env.WHITELABEL_CNAME_TARGET || "nexus360.consultio.com.br")
    .replace(/\.$/, "")
    .toLowerCase();

  try {
    const addresses = await dns.resolve4(domain);
    if (addresses.includes(expectedIp)) return "verified";
  } catch {
    // Fall through to CNAME check.
  }

  try {
    const cnames = (await dns.resolveCname(domain)).map(item => item.replace(/\.$/, "").toLowerCase());
    if (cnames.includes(expectedCname)) return "verified";
  } catch {
    // Pending until DNS propagates.
  }

  return "pending";
}

function wootechPageContent(assetBase = ASSET_BASE_URL) {
  return `<style>
  :root {
    --wt-bg: #030507;
    --wt-bg-soft: #090b0f;
    --wt-card: rgba(255,255,255,.045);
    --wt-card-strong: rgba(255,255,255,.075);
    --wt-line: rgba(255,255,255,.12);
    --wt-text: #f7f8fb;
    --wt-muted: #a6abb5;
    --wt-dim: #727783;
    --wt-yellow: #ffd10a;
    --wt-yellow-2: #e8a900;
  }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--wt-bg); color: var(--wt-text); font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .wootech-site { min-height: 100vh; overflow: hidden; background:
    radial-gradient(circle at 82% 11%, rgba(255,209,10,.18), transparent 28rem),
    radial-gradient(circle at 13% 37%, rgba(255,209,10,.10), transparent 23rem),
    linear-gradient(180deg, #020303 0%, #06080b 48%, #040507 100%);
  }
  .wt-container { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
  .wt-nav { height: 86px; display: flex; align-items: center; justify-content: space-between; gap: 32px; position: relative; z-index: 5; }
  .wt-brand { display: inline-flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; min-width: 184px; }
  .wt-mark { width: 48px; height: 31px; position: relative; display: inline-block; flex: 0 0 auto; }
  .wt-mark span { position: absolute; top: 0; width: 18px; height: 31px; transform: skewX(-28deg); border-radius: 1px; }
  .wt-mark .m1 { left: 0; background: linear-gradient(145deg, #ffd414, #d99a00); }
  .wt-mark .m2 { left: 17px; background: linear-gradient(145deg, #ffd414, #dca300); }
  .wt-mark .m3 { left: 34px; background: linear-gradient(145deg, #ffffff, #c8ccd3); }
  .wt-word { letter-spacing: .32em; font-size: 17px; font-weight: 800; line-height: 1; }
  .wt-word b { color: var(--wt-yellow); font-weight: 800; }
  .wt-menu { display: flex; align-items: center; justify-content: center; gap: 45px; flex: 1; }
  .wt-menu a { color: #f3f4f6; text-decoration: none; font-size: 14px; font-weight: 700; opacity: .94; }
  .wt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 47px; padding: 0 24px; border-radius: 8px; border: 1px solid transparent; background: var(--wt-yellow); color: #060606; text-decoration: none; font-size: 14px; font-weight: 900; box-shadow: 0 16px 44px rgba(255,209,10,.18); white-space: nowrap; }
  .wt-btn.dark { color: #fff; background: rgba(255,255,255,.035); border-color: rgba(255,255,255,.24); box-shadow: none; }
  .wt-btn .arr { font-size: 22px; line-height: 1; margin-top: -1px; }

  .wt-hero { position: relative; min-height: 720px; padding: 96px 0 70px; }
  .wt-hero::before { content: ""; position: absolute; inset: 0; background:
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px) 0 0 / 70px 70px,
    linear-gradient(0deg, rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 70px 70px; opacity: .22; mask-image: radial-gradient(circle at 24% 26%, #000 0, transparent 57%); pointer-events: none; }
  .wt-hero-grid { display: grid; grid-template-columns: minmax(390px, 520px) 1fr; gap: 48px; align-items: center; position: relative; z-index: 2; }
  .wt-hero h1 { margin: 0; max-width: 520px; font-size: clamp(48px, 6vw, 69px); line-height: .99; letter-spacing: 0; font-weight: 900; }
  .wt-yellow { color: var(--wt-yellow); }
  .wt-hero p { margin: 32px 0 0; max-width: 470px; color: #d1d5dd; font-size: 18px; line-height: 1.58; }
  .wt-actions { display: flex; align-items: center; gap: 16px; margin-top: 35px; flex-wrap: wrap; }
  .wt-proof { display: flex; align-items: center; gap: 17px; margin-top: 52px; }
  .wt-avatars { display: flex; }
  .wt-avatar { width: 36px; height: 36px; border-radius: 50%; margin-left: -8px; border: 2px solid #191b20; background: linear-gradient(135deg, #f6d7c1, #6e788b); box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset; }
  .wt-avatar:first-child { margin-left: 0; }
  .wt-proof strong { display: block; font-size: 14px; }
  .wt-proof span { display: block; margin-top: 3px; color: var(--wt-muted); font-size: 13px; }

  .wt-visual { position: relative; min-height: 538px; }
  .wt-orbit { position: absolute; width: 920px; height: 460px; left: -120px; top: 18px; border: 1px solid rgba(255,209,10,.18); border-radius: 50%; transform: rotate(-20deg); }
  .wt-orbit.two { width: 780px; height: 390px; left: -30px; top: 78px; transform: rotate(-34deg); opacity: .6; }
  .wt-dot { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--wt-yellow); box-shadow: 0 0 18px var(--wt-yellow); }
  .wt-dot.d1 { left: 55px; top: 338px; }
  .wt-dot.d2 { right: 33px; top: 165px; }
  .wt-laptop { position: absolute; right: -30px; top: 30px; width: min(680px, 54vw); transform: perspective(1200px) rotateX(5deg) rotateY(-14deg) rotateZ(-2deg); transform-origin: center; }
  .wt-screen-shell { border: 1px solid rgba(255,255,255,.16); border-radius: 24px 24px 10px 10px; padding: 15px; background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.025)); box-shadow: -42px 40px 90px rgba(0,0,0,.72), 20px 34px 90px rgba(255,209,10,.14); }
  .wt-screen { min-height: 355px; border-radius: 14px; background: #11141a; border: 1px solid rgba(255,255,255,.06); padding: 16px; overflow: hidden; }
  .wt-screen-top { display: flex; justify-content: space-between; align-items: center; color: #76808d; font-size: 11px; border-bottom: 1px solid rgba(255,255,255,.07); padding-bottom: 12px; margin-bottom: 18px; }
  .wt-screen-logo { color: #fff; font-weight: 900; letter-spacing: .1em; }
  .wt-screen-logo b { color: var(--wt-yellow); }
  .wt-dash { display: grid; grid-template-columns: 92px 1fr; gap: 14px; }
  .wt-side { display: flex; flex-direction: column; gap: 13px; color: #7c8490; font-size: 11px; }
  .wt-side span:first-child { color: var(--wt-yellow); }
  .wt-main h3 { margin: 0 0 15px; font-size: 20px; }
  .wt-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .wt-kpi, .wt-chart, .wt-funnel { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.055); border-radius: 9px; padding: 15px; }
  .wt-kpi span { display: block; color: #98a0ab; font-size: 10px; margin-bottom: 8px; }
  .wt-kpi strong { font-size: 18px; }
  .wt-kpi em { display: block; margin-top: 8px; color: #43d17c; font-size: 10px; font-style: normal; }
  .wt-widgets { display: grid; grid-template-columns: 1.2fr .8fr; gap: 12px; margin-top: 13px; }
  .wt-chart { min-height: 172px; position: relative; }
  .wt-chart svg { width: 100%; height: 118px; margin-top: 12px; overflow: visible; }
  .wt-funnel { min-height: 172px; }
  .wt-funnel-row { height: 29px; margin: 10px auto 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 800; clip-path: polygon(8% 0, 92% 0, 82% 100%, 18% 100%); }
  .wt-funnel-row:nth-child(2) { width: 78%; background: #273b6f; }
  .wt-funnel-row:nth-child(3) { width: 64%; background: #455eda; }
  .wt-funnel-row:nth-child(4) { width: 49%; background: #273b6f; }
  .wt-base { width: 96%; height: 94px; margin: -5px auto 0; background: linear-gradient(155deg, #2a2e34, #111317); border-radius: 0 0 34px 34px; transform: perspective(700px) rotateX(56deg); box-shadow: 0 36px 40px rgba(0,0,0,.62), 24px 24px 40px rgba(255,209,10,.13); border: 1px solid rgba(255,255,255,.08); border-top: 0; }
  .wt-floating { position: absolute; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 21px; color: var(--wt-yellow); background: rgba(255,209,10,.08); border: 1px solid rgba(255,209,10,.35); box-shadow: 0 0 42px rgba(255,209,10,.22); backdrop-filter: blur(8px); }
  .wt-floating svg { width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2; }
  .wt-floating.f1 { left: 120px; top: 45px; transform: rotate(-8deg); }
  .wt-floating.f2 { left: 100px; bottom: 82px; }
  .wt-floating.f3 { right: -10px; top: 285px; }

  .wt-trust { border-top: 1px solid rgba(255,255,255,.09); border-bottom: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.015); padding: 28px 0 32px; }
  .wt-eyebrow { color: var(--wt-yellow); text-transform: uppercase; letter-spacing: .15em; font-size: 12px; font-weight: 900; }
  .wt-trust .wt-eyebrow { text-align: center; color: #838893; margin-bottom: 28px; }
  .wt-logos { display: grid; grid-template-columns: repeat(6, 1fr); gap: 28px; align-items: center; color: #8d929c; font-size: 25px; font-weight: 800; }
  .wt-logo-item { display: flex; align-items: center; justify-content: center; gap: 10px; opacity: .9; white-space: nowrap; }
  .wt-logo-icon { width: 24px; height: 24px; border-radius: 7px; border: 2px solid currentColor; opacity: .75; }

  .wt-section { padding: 74px 0; border-bottom: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(255,255,255,.012), transparent); }
  .wt-center { max-width: 740px; margin: 0 auto; text-align: center; }
  .wt-section h2 { margin: 10px 0 0; font-size: clamp(34px, 4vw, 45px); line-height: 1.08; letter-spacing: 0; }
  .wt-section p { color: var(--wt-muted); line-height: 1.65; }
  .wt-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 48px; }
  .wt-card { min-height: 195px; padding: 24px; border-radius: 9px; background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.11); box-shadow: inset 0 1px 0 rgba(255,255,255,.04); position: relative; }
  .wt-card .wt-card-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 16px; color: var(--wt-yellow); background: rgba(255,209,10,.09); margin-bottom: 26px; }
  .wt-card .wt-card-icon svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2; }
  .wt-card .wt-card-arrow { position: absolute; right: 22px; top: 24px; width: 37px; height: 37px; display: grid; place-items: center; border-radius: 50%; color: #e6e7ea; background: rgba(255,255,255,.075); }
  .wt-card h3 { margin: 0 0 13px; font-size: 18px; }
  .wt-card p { margin: 0; color: #b5bac4; font-size: 14px; line-height: 1.55; }

  .wt-diffs { display: grid; grid-template-columns: .95fr 1.35fr; gap: 72px; align-items: center; }
  .wt-list { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 15px; color: #d9dce3; font-size: 15px; }
  .wt-list li { display: flex; gap: 12px; align-items: flex-start; }
  .wt-list li::before { content: "✓"; color: var(--wt-yellow); font-weight: 900; }
  .wt-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .wt-metric { min-height: 142px; border-radius: 9px; padding: 28px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.12); display: grid; grid-template-columns: 58px 1fr; gap: 20px; align-items: center; }
  .wt-metric svg { width: 44px; height: 44px; color: var(--wt-yellow); stroke: currentColor; fill: none; stroke-width: 2; }
  .wt-metric strong { display: block; font-size: 39px; line-height: 1; }
  .wt-metric span { display: block; color: var(--wt-muted); margin-top: 9px; font-size: 14px; line-height: 1.45; }

  .wt-cta { padding: 72px 0; background:
    radial-gradient(circle at 78% 46%, rgba(255,209,10,.30), transparent 23rem),
    linear-gradient(90deg, rgba(255,255,255,.02), rgba(255,209,10,.05)); }
  .wt-cta-grid { display: grid; grid-template-columns: 1fr 440px; gap: 56px; align-items: center; }
  .wt-cta h2 { margin: 0; font-size: clamp(38px, 5vw, 52px); line-height: 1.07; }
  .wt-cta p { color: #d0d4db; line-height: 1.65; margin: 24px 0 0; max-width: 520px; }
  .wt-cube-scene { min-height: 280px; display: grid; place-items: center; perspective: 900px; }
  .wt-cube { width: 210px; height: 210px; border-radius: 13px; transform: rotateX(58deg) rotateZ(-42deg); background: linear-gradient(145deg, #2d2f32, #020304); border: 1px solid rgba(255,255,255,.19); box-shadow: -55px 55px 70px rgba(0,0,0,.62), 0 0 80px rgba(255,209,10,.38); position: relative; }
  .wt-cube::before { content: ""; position: absolute; left: 57px; top: 64px; width: 96px; height: 54px; background: linear-gradient(115deg, var(--wt-yellow) 0 30%, #dca300 30% 61%, #f7f8fb 61% 100%); clip-path: polygon(0 0, 25% 0, 44% 100%, 22% 100%, 0 0, 34% 0, 56% 100%, 76% 100%, 60% 45%, 79% 0, 100% 0, 79% 100%, 48% 100%); filter: drop-shadow(0 4px 16px rgba(255,209,10,.55)); opacity: .95; }
  .wt-cube::after { content: "WOOTECH"; position: absolute; left: 47px; top: 123px; color: #fff; font-size: 16px; font-weight: 900; letter-spacing: .34em; text-shadow: 0 4px 16px rgba(255,209,10,.38); }

  .wt-footer { padding: 43px 0 28px; background: #050608; }
  .wt-footer-grid { display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 46px; }
  .wt-footer p, .wt-footer a, .wt-footer li { color: var(--wt-muted); font-size: 14px; line-height: 1.7; text-decoration: none; }
  .wt-footer h4 { margin: 0 0 16px; font-size: 14px; }
  .wt-footer ul { list-style: none; margin: 0; padding: 0; }
  .wt-social { display: flex; gap: 12px; margin-top: 22px; }
  .wt-social span { width: 27px; height: 27px; border-radius: 7px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.14); color: #cfd3da; font-size: 11px; font-weight: 800; }
  .wt-copy { text-align: center; color: #6d727d; margin-top: 42px; font-size: 13px; }

  @media (max-width: 1040px) {
    .wt-menu { display: none; }
    .wt-hero { padding-top: 56px; }
    .wt-hero-grid, .wt-diffs, .wt-cta-grid { grid-template-columns: 1fr; }
    .wt-visual { min-height: 500px; }
    .wt-laptop { width: min(720px, 92vw); left: 6vw; right: auto; }
    .wt-cards { grid-template-columns: repeat(2, 1fr); }
    .wt-logos { grid-template-columns: repeat(3, 1fr); }
    .wt-footer-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 680px) {
    .wt-container { width: min(100% - 28px, 1180px); }
    .wt-nav { height: auto; padding: 20px 0; align-items: flex-start; }
    .wt-nav > .wt-btn { display: none; }
    .wt-word { font-size: 13px; }
    .wt-hero h1 { font-size: 46px; }
    .wt-actions, .wt-proof { align-items: stretch; flex-direction: column; }
    .wt-visual { min-height: 420px; transform: scale(.82); transform-origin: left top; width: 122%; }
    .wt-cards, .wt-metrics, .wt-logos, .wt-footer-grid { grid-template-columns: 1fr; }
    .wt-metric { grid-template-columns: 48px 1fr; padding: 22px; }
    .wt-metric strong { font-size: 32px; }
  }
</style>

<main class="wootech-site">
  <header class="wt-container wt-nav">
    <a class="wt-brand" href="#top" aria-label="WooTech">
      <span class="wt-mark" aria-hidden="true"><span class="m1"></span><span class="m2"></span><span class="m3"></span></span>
      <span class="wt-word">WOO<b>TECH</b></span>
    </a>
    <nav class="wt-menu" aria-label="Menu principal">
      <a href="#solucoes">Soluções</a>
      <a href="#produtos">Produtos</a>
      <a href="#recursos">Recursos</a>
      <a href="#empresa">Empresa</a>
      <a href="#contato">Contato</a>
    </nav>
    <a class="wt-btn" href="#contato">Solicitar Demonstração <span class="arr">→</span></a>
  </header>

  <section id="top" class="wt-hero">
    <div class="wt-container wt-hero-grid">
      <div>
        <h1>Tecnologia que conecta. Soluções que <span class="wt-yellow">transformam.</span></h1>
        <p>Desenvolvemos sistemas inteligentes, automações e plataformas completas para impulsionar empresas e gerar resultados reais.</p>
        <div class="wt-actions">
          <a class="wt-btn" href="#solucoes">Conheça nossas soluções <span class="arr">→</span></a>
          <a class="wt-btn dark" href="#contato">Fale com um especialista</a>
        </div>
        <div class="wt-proof">
          <div class="wt-avatars" aria-hidden="true"><span class="wt-avatar"></span><span class="wt-avatar"></span><span class="wt-avatar"></span><span class="wt-avatar"></span></div>
          <div><strong>+100 empresas impulsionadas</strong><span>com tecnologia e inovação</span></div>
        </div>
      </div>

      <div class="wt-visual" aria-hidden="true">
        <span class="wt-orbit"></span><span class="wt-orbit two"></span><span class="wt-dot d1"></span><span class="wt-dot d2"></span>
        <span class="wt-floating f1"><svg viewBox="0 0 24 24"><path d="M4 13l8-8 8 8"/><path d="M6 11v8h12v-8"/><path d="M10 19v-5h4v5"/></svg></span>
        <span class="wt-floating f2"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-3a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4z" transform="translate(1 0) scale(.9)"/><path d="M8 10h7M8 14h4"/></svg></span>
        <span class="wt-floating f3"><svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"/><path d="M8 11h8M8 14h5"/></svg></span>
        <div class="wt-laptop">
          <div class="wt-screen-shell">
            <div class="wt-screen">
              <div class="wt-screen-top"><span class="wt-screen-logo">WOO<b>TECH</b></span><span>@ sistemadegestão</span></div>
              <div class="wt-dash">
                <div class="wt-side"><span>Dashboard</span><span>Leads</span><span>Vendas</span><span>Clientes</span><span>Tarefas</span><span>Relatórios</span><span>Configurações</span></div>
                <div class="wt-main">
                  <h3>Olá, time WooTech 👋</h3>
                  <div class="wt-kpis">
                    <div class="wt-kpi"><span>Receita</span><strong>R$ 1.250.000,00</strong><em>+12,8% este mês</em></div>
                    <div class="wt-kpi"><span>Vendas</span><strong>320</strong><em>+9,2% este mês</em></div>
                    <div class="wt-kpi"><span>Novos leads</span><strong>1.580</strong><em>+18,7% este mês</em></div>
                  </div>
                  <div class="wt-widgets">
                    <div class="wt-chart">
                      <strong>Desempenho</strong>
                      <svg viewBox="0 0 280 120"><path d="M0 95 C35 75 45 78 70 50 S112 87 138 58 185 18 214 43 245 69 280 28" stroke="#ffd10a" stroke-width="4" fill="none"/><path d="M0 108 C42 88 57 98 91 76 S145 103 173 73 225 92 280 55" stroke="#a7adb8" stroke-width="3" fill="none" opacity=".75"/></svg>
                    </div>
                    <div class="wt-funnel"><strong>Funil de vendas</strong><div class="wt-funnel-row">Leads</div><div class="wt-funnel-row">Qualificados</div><div class="wt-funnel-row">Clientes</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="wt-base"></div>
        </div>
      </div>
    </div>
  </section>

  <section class="wt-trust">
    <div class="wt-container">
      <div class="wt-eyebrow">Empresas que confiam na WooTech</div>
      <div class="wt-logos">
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>ProTech</div>
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>Innova</div>
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>Conecta</div>
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>Agilize</div>
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>Prime</div>
        <div class="wt-logo-item"><span class="wt-logo-icon"></span>Grupo Solução</div>
      </div>
    </div>
  </section>

  <section id="solucoes" class="wt-section">
    <div class="wt-container">
      <div class="wt-center">
        <div class="wt-eyebrow">Soluções completas</div>
        <h2>Tudo o que sua empresa precisa em um só lugar</h2>
        <p>Sistemas, automações e integrações para otimizar processos, aumentar produtividade e acelerar seus resultados.</p>
      </div>
      <div id="produtos" class="wt-cards">
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8v8H8z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3"/></svg></span><h3>Sistemas Personalizados</h3><p>Desenvolvimento de sistemas sob medida para atender as necessidades do seu negócio.</p></article>
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="7" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8.5 7.5l6.8 6.8M15.3 8.7l-2.2 6.2M8.7 16.4l6.7-7"/></svg></span><h3>CRM & Gestão</h3><p>Gerencie leads, vendas, clientes e equipes com eficiência em uma plataforma completa.</p></article>
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><path d="M4 20L20 4"/><path d="M14 4l6 6"/><path d="M3 8l4 1 1 4 3-6z"/></svg></span><h3>Automações Inteligentes</h3><p>Automatize tarefas, integre ferramentas e elimine processos repetitivos do dia a dia.</p></article>
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M10 7h3a4 4 0 0 1 4 4v3M14 17h-3a4 4 0 0 1-4-4v-3"/></svg></span><h3>Integrações</h3><p>Integração com WhatsApp, ERPs, APIs e centenas de ferramentas que sua empresa já utiliza.</p></article>
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg></span><h3>Inteligência Artificial</h3><p>IA aplicada ao atendimento, vendas e análise de dados para decisões mais assertivas.</p></article>
        <article class="wt-card"><span class="wt-card-arrow">→</span><span class="wt-card-icon"><svg viewBox="0 0 24 24"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/><path d="M4 9l6-4 6 7 6-8"/></svg></span><h3>Dashboards & BI</h3><p>Visualize dados importantes em tempo real e tome decisões baseadas em informações.</p></article>
      </div>
    </div>
  </section>

  <section id="recursos" class="wt-section">
    <div class="wt-container wt-diffs">
      <div>
        <div class="wt-eyebrow">Nossos diferenciais</div>
        <h2>Inovação, performance e resultados reais</h2>
        <ul class="wt-list">
          <li>Tecnologia de ponta e infraestrutura segura</li>
          <li>Suporte especializado 24/7</li>
          <li>Escalabilidade para acompanhar seu crescimento</li>
          <li>Time experiente e focado no seu sucesso</li>
        </ul>
        <div class="wt-actions"><a class="wt-btn" href="#contato">Por que escolher a WooTech? <span class="arr">→</span></a></div>
      </div>
      <div class="wt-metrics">
        <div class="wt-metric"><svg viewBox="0 0 24 24"><path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7z"/><path d="M9 12l2 2 4-5"/></svg><div><strong>99,9%</strong><span>Disponibilidade dos sistemas</span></div></div>
        <div class="wt-metric"><svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-6H4zM20 13v4a2 2 0 0 1-2 2h-2v-6h4z"/></svg><div><strong>24/7</strong><span>Suporte técnico especializado</span></div></div>
        <div class="wt-metric"><svg viewBox="0 0 24 24"><path d="M5 19c8-1 13-6 14-14-8 1-13 6-14 14z"/><path d="M5 19l5-5"/></svg><div><strong>+100</strong><span>Empresas atendidas</span></div></div>
        <div class="wt-metric"><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M16 7h5v5"/></svg><div><strong>+1M</strong><span>Processos automatizados todos os meses</span></div></div>
      </div>
    </div>
  </section>

  <section id="empresa" class="wt-cta">
    <div class="wt-container wt-cta-grid">
      <div>
        <h2>Pronto para levar sua empresa para o <span class="wt-yellow">próximo nível?</span></h2>
        <p>Fale com um especialista e descubra como a WooTech pode transformar seus processos e gerar mais resultados.</p>
        <div class="wt-actions">
          <a class="wt-btn" href="#contato">Solicitar demonstração <span class="arr">→</span></a>
          <a class="wt-btn dark" href="#contato">Falar com especialista</a>
        </div>
      </div>
      <div class="wt-cube-scene" aria-hidden="true"><div class="wt-cube"></div></div>
    </div>
  </section>

  <footer id="contato" class="wt-footer">
    <div class="wt-container">
      <div class="wt-footer-grid">
        <div>
          <a class="wt-brand" href="#top"><span class="wt-mark" aria-hidden="true"><span class="m1"></span><span class="m2"></span><span class="m3"></span></span><span class="wt-word">WOO<b>TECH</b></span></a>
          <p>Soluções tecnológicas que conectam empresas, otimizam processos e impulsionam resultados.</p>
          <div class="wt-social"><span>in</span><span>ig</span><span>wa</span><span>yt</span></div>
        </div>
        <div><h4>Soluções</h4><ul><li>Sistemas Personalizados</li><li>CRM & Gestão</li><li>Automações</li><li>Integrações</li><li>Inteligência Artificial</li></ul></div>
        <div><h4>Empresa</h4><ul><li>Sobre nós</li><li>Cases</li><li>Blog</li><li>Carreiras</li><li>Contato</li></ul></div>
        <div><h4>Recursos</h4><ul><li>Documentação</li><li>Tutoriais</li><li>API</li><li>Status do Sistema</li></ul></div>
        <div><h4>Contato</h4><ul><li>comercial@wootech.com.br</li><li>(47) 99999-9999</li><li>Blumenau, SC - Brasil</li></ul></div>
      </div>
      <div class="wt-copy">© 2026 WooTech. Todos os direitos reservados.</div>
    </div>
  </footer>
</main>`;
}

function wootechDocument(assetBase = ASSET_BASE_URL) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WooTech | Sistemas que conectam, soluções que transformam</title>
  <meta name="description" content="Sistemas inteligentes, automações e plataformas completas para impulsionar empresas e gerar resultados reais.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body>
${wootechPageContent(assetBase)}
</body>
</html>`;
}

async function writePreviewFiles() {
  const outDir = path.join(root, "output", "wootech-landing-pages");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, `${LANDING_SLUG}.html`), wootechDocument("./assets"), "utf8");
}

async function upsertWootechAccount() {
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const closerPassword = await bcrypt.hash(CLOSER_PASSWORD, 12);

  const result = await prisma.$transaction(async (tx) => {
    const selectedPlan = await tx.plan.findFirst({
      where: {
        isActive: true,
        OR: [{ name: "Pro" }, { slug: "pro" }, { isPublic: true }],
      },
      orderBy: [{ priceMonthly: "asc" }, { createdAt: "asc" }],
    });

    const organization = await tx.organization.upsert({
      where: { slug: ACCOUNT_SLUG },
      create: {
        name: ACCOUNT_NAME,
        type: "WHITELABEL",
        slug: ACCOUNT_SLUG,
        domain: CRM_DOMAIN,
        plan: selectedPlan?.name || "Pro",
        planId: selectedPlan?.id || null,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        isActive: true,
        settings: {
          seededBy: "seed_wootech",
          whitelabelOnboardingStep: 4,
          whitelabelOnboardingComplete: true,
          linkedLandingPageSlug: LANDING_SLUG,
          landingDomain: LANDING_DOMAIN,
          crmDomain: CRM_DOMAIN,
        },
        whiteLabelConfig: {
          name: "WooTech",
          logoUrl: WOOTECH_LOGO_DATA_URL,
          faviconUrl: WOOTECH_LOGO_DATA_URL,
          primaryColor: "#ffd10a",
          secondaryColor: "#030507",
          landingPageSlug: LANDING_SLUG,
          landingDomain: LANDING_DOMAIN,
          crmDomain: CRM_DOMAIN,
          landingPageUrl: `https://${LANDING_DOMAIN}`,
        },
      },
      update: {
        name: ACCOUNT_NAME,
        type: "WHITELABEL",
        domain: CRM_DOMAIN,
        plan: selectedPlan?.name || "Pro",
        planId: selectedPlan?.id || null,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        isActive: true,
        settings: {
          seededBy: "seed_wootech",
          whitelabelOnboardingStep: 4,
          whitelabelOnboardingComplete: true,
          linkedLandingPageSlug: LANDING_SLUG,
          landingDomain: LANDING_DOMAIN,
          crmDomain: CRM_DOMAIN,
        },
        whiteLabelConfig: {
          name: "WooTech",
          logoUrl: WOOTECH_LOGO_DATA_URL,
          faviconUrl: WOOTECH_LOGO_DATA_URL,
          primaryColor: "#ffd10a",
          secondaryColor: "#030507",
          landingPageSlug: LANDING_SLUG,
          landingDomain: LANDING_DOMAIN,
          crmDomain: CRM_DOMAIN,
          landingPageUrl: `https://${LANDING_DOMAIN}`,
        },
      },
    });

    const workspace = await tx.workspace.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: "principal" } },
      create: {
        name: "Principal",
        slug: "principal",
        organizationId: organization.id,
        settings: { seededBy: "seed_wootech" },
      },
      update: {
        name: "Principal",
        isActive: true,
        settings: { seededBy: "seed_wootech" },
      },
    });

    const user = await tx.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        name: "Administrador WooTech",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "ORG_ADMIN",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Gestão",
      },
      update: {
        name: "Administrador WooTech",
        password: hashedPassword,
        role: "ORG_ADMIN",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Gestão",
      },
    });

    await tx.user.upsert({
      where: { email: CLOSER_EMAIL },
      create: {
        name: "Closer WooTech",
        email: CLOSER_EMAIL,
        password: closerPassword,
        role: "USER",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Closer",
      },
      update: {
        name: "Closer WooTech",
        password: closerPassword,
        role: "USER",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Closer",
      },
    });

    const subscription = await tx.saaSSubscription.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
    });

    if (subscription) {
      await tx.saaSSubscription.update({
        where: { id: subscription.id },
        data: {
          planId: selectedPlan?.id || null,
          status: "TRIAL",
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
        },
      });
    } else {
      await tx.saaSSubscription.create({
        data: {
          organizationId: organization.id,
          planId: selectedPlan?.id || null,
          status: "TRIAL",
          startDate: new Date(),
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          price: 0,
          billingCycle: "MONTHLY",
        },
      });
    }

    return { organization, workspace, user };
  });

  const page = {
    name: "WooTech - Sistemas que conectam",
    slug: LANDING_SLUG,
    metaTitle: "WooTech | Sistemas que conectam, soluções que transformam",
    metaDescription: "Sistemas inteligentes, automações e plataformas completas para impulsionar empresas e gerar resultados reais.",
    content: wootechPageContent(),
    theme: {
      primaryColor: "#ffd10a",
      secondaryColor: "#030507",
      template: "wootech-reference",
      sourceImage: `${ASSET_BASE_URL}/wootech-page-reference.png`,
    },
  };

  const [landingDomainStatus, crmDomainStatus] = await Promise.all([
    getDomainStatus(LANDING_DOMAIN),
    getDomainStatus(CRM_DOMAIN),
  ]);

  await Promise.all([
    prisma.domain.upsert({
      where: { name: LANDING_DOMAIN },
      update: {
        organizationId: result.organization.id,
        provider: "landing",
        status: landingDomainStatus,
      },
      create: {
        name: LANDING_DOMAIN,
        provider: "landing",
        status: landingDomainStatus,
        organizationId: result.organization.id,
      },
    }),
    prisma.domain.upsert({
      where: { name: CRM_DOMAIN },
      update: {
        organizationId: result.organization.id,
        provider: "crm",
        status: crmDomainStatus,
      },
      create: {
        name: CRM_DOMAIN,
        provider: "crm",
        status: crmDomainStatus,
        organizationId: result.organization.id,
      },
    }),
  ]);

  const saved = await prisma.landingPage.upsert({
    where: { slug: page.slug },
    create: {
      name: page.name,
      slug: page.slug,
      organizationId: result.organization.id,
      status: "published",
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaImage: null,
      domain: LANDING_DOMAIN,
      customDomain: LANDING_DOMAIN,
      publishedAt: new Date(),
      theme: page.theme,
    },
    update: {
      name: page.name,
      organizationId: result.organization.id,
      status: "published",
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaImage: null,
      domain: LANDING_DOMAIN,
      customDomain: LANDING_DOMAIN,
      publishedAt: new Date(),
      sections: null,
      headline: null,
      subheadline: null,
      heroImage: null,
      theme: page.theme,
    },
    select: { name: true, slug: true, status: true, organizationId: true },
  });

  return { ...result, page: saved };
}

async function main() {
  await copyWootechAssets();
  await writePreviewFiles();

  if (process.argv.includes("--preview-only")) {
    console.log(`Preview gerado: ${path.join(root, "output", "wootech-landing-pages", `${LANDING_SLUG}.html`)}`);
    return;
  }

  const result = await upsertWootechAccount();

  console.table([{
    conta: `${result.organization.name} (${result.organization.slug})`,
    tipo: "WHITELABEL",
    landing: result.page.name,
    status: result.page.status,
    dominioLanding: LANDING_DOMAIN,
    dominioCrm: CRM_DOMAIN,
    local: `http://localhost:10000/lp/${result.page.slug}`,
    prod: `https://${LANDING_DOMAIN}`,
  }]);
  console.log(`Usuario: ${ADMIN_EMAIL}`);
  console.log(`Senha: ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
