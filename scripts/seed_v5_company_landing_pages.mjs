import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
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
const ACCOUNT_NAME = "V5 Company";
const ACCOUNT_SLUG = "v5-company";
const ADMIN_EMAIL = "admin@v5company.com.br";
const ADMIN_PASSWORD = "V5Company@2026";
const CLOSER_EMAIL = "closer@v5company.com.br";
const CLOSER_PASSWORD = "CloserV5@2026";

const commonCss = `
<style>
  :root {
    --v5-blue: #135dff;
    --v5-purple: #7428ff;
    --v5-lime: #9cff00;
    --ink: #070913;
    --muted: #6b7280;
    --line: rgba(255,255,255,.12);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; overflow-x: hidden; font-family: Inter, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  button, input { font: inherit; }
  .v5-page { min-height: 100vh; overflow: hidden; }
  .container { width: min(1500px, calc(100% - 64px)); margin-inline: auto; }
  .nav { min-height: 96px; display: flex; align-items: center; justify-content: space-between; gap: 22px; }
  .menu { display: flex; align-items: center; gap: clamp(16px, 2vw, 30px); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
  .logo { display: inline-flex; align-items: center; min-width: 190px; height: 50px; }
  .logo svg { width: 176px; max-width: 42vw; height: auto; display: block; overflow: visible; }
  .btn { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; border: 0; border-radius: 8px; padding: 14px 22px; color: #fff; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .02em; cursor: pointer; white-space: nowrap; }
  .hero { position: relative; min-height: calc(100vh - 96px); display: flex; align-items: center; padding: clamp(42px, 6vw, 84px) 0 clamp(42px, 5vw, 76px); }
  .grid { width: 100%; display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, .98fr); gap: clamp(44px, 6vw, 86px); align-items: center; }
  .eyebrow { font-size: 11px; font-weight: 950; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 20px; }
  h1 { margin: 0 0 22px; max-width: 760px; font-size: clamp(42px, 6.1vw, 72px); line-height: .98; letter-spacing: 0; font-weight: 950; }
  h2 { margin: 0; font-size: clamp(28px, 4vw, 39px); line-height: 1.08; letter-spacing: 0; font-weight: 950; }
  h3 { margin: 0; font-size: 16px; line-height: 1.25; }
  p { margin: 0; }
  .lead { max-width: 590px; font-size: clamp(15px, 1.6vw, 18px); line-height: 1.75; font-weight: 520; }
  .lead-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: min(100%, 760px); margin-top: 29px; }
  .lead-form input { min-width: 0; min-height: 50px; border-radius: 8px; padding: 0 16px; outline: none; font-size: 13px; font-weight: 700; }
  .diagnosis-card { display: none; width: min(100%, 860px); margin-top: 18px; padding: 22px; border-radius: 8px; }
  .diagnosis-card.is-open { display: grid; gap: 17px; }
  .diagnosis-card h3 { font-size: 22px; }
  .diagnosis-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .diagnosis-field { display: grid; gap: 8px; min-width: 0; }
  .diagnosis-field label { font-size: 12px; font-weight: 900; line-height: 1.35; }
  .diagnosis-field select { min-width: 0; min-height: 46px; border-radius: 8px; padding: 0 12px; border: 1px solid currentColor; font-weight: 800; outline: none; }
  .slot-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .slot-btn { min-height: 44px; border-radius: 8px; border: 1px solid currentColor; background: transparent; color: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
  .slot-btn.active { background: currentColor; }
  .slot-btn.active span { color: #fff; }
  .section { padding: clamp(70px, 9vw, 122px) 0; }
  .section-head { text-align: center; max-width: 840px; margin: 0 auto 54px; }
  .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .card { min-width: 0; border-radius: 8px; padding: 24px; min-height: 180px; }
  .icon { width: 45px; height: 45px; border-radius: 999px; display: grid; place-items: center; margin-bottom: 20px; }
  .icon svg, .circle svg { width: 21px; height: 21px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .card p, .step p, .service p, .metric p { margin-top: 10px; font-size: 13px; line-height: 1.58; }
  .cta { position: relative; overflow: hidden; border-radius: 0; padding: clamp(30px, 5vw, 46px); display: flex; align-items: center; justify-content: space-between; gap: 26px; }
  .cta::after { content: "V5"; position: absolute; right: 34px; bottom: -54px; font-size: clamp(130px, 16vw, 190px); line-height: .8; font-weight: 950; letter-spacing: -.12em; opacity: .13; pointer-events: none; }
  .cta-content { position: relative; z-index: 1; max-width: 680px; }
  .cta .btn { position: relative; z-index: 1; }
  .success { display: none; margin-top: 14px; border-radius: 10px; padding: 14px 16px; font-size: 13px; font-weight: 800; }
  @media (max-width: 920px) {
    .container { width: min(100% - 28px, 820px); }
    .menu a:not(.btn) { display: none; }
    .grid { grid-template-columns: 1fr; }
    .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lead-form, .diagnosis-grid, .slot-grid { grid-template-columns: 1fr; }
    .hero { padding-top: 26px; }
  }
  @media (max-width: 620px) {
    .container { width: min(100% - 22px, 430px); }
    .nav { min-height: 74px; }
    .logo { min-width: auto; height: 42px; }
    .logo svg { width: 126px; max-width: 46vw; }
    .menu .btn { min-height: 40px; padding: 11px 12px; font-size: 10px; }
    h1 { font-size: clamp(38px, 12vw, 48px); }
    .cards { grid-template-columns: 1fr; }
    .cta { flex-direction: column; align-items: stretch; }
    .cta .btn { width: 100%; }
    .cta::after { display: none; }
  }
</style>`;

const icons = {
  target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M21 12h-3M12 21v-3M3 12h3"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24"><path d="M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V5a2 2 0 0 0 2 2Z"/><path d="M16 12h4"/><path d="M6 7V5h12"/></svg>`,
  funnel: `<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/></svg>`,
  users: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24"><path d="M5 15c-1 1-2 4-2 4s3-1 4-2l11-11a4 4 0 0 0-5.7-5.7L1 11v4h4Z"/><path d="M15 9l-5-5"/></svg>`,
  chart: `<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 3 5-7"/></svg>`,
  brand: `<svg viewBox="0 0 24 24"><path d="M12 3 4 8l8 5 8-5-8-5Z"/><path d="m4 13 8 5 8-5"/></svg>`,
  cog: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
};

function logo(theme) {
  const palette = {
    blue: {
      className: "logo-blue",
      v: "#ffffff",
      five: "#135dff",
      text: "#ffffff",
      sub: "#135dff",
      ring: "",
      subtitle: "",
    },
    purple: {
      className: "logo-purple",
      v: "#7428ff",
      five: "#111322",
      text: "#111322",
      sub: "#7428ff",
      ring: "",
      subtitle: "",
    },
    lime: {
      className: "logo-lime",
      v: "#9cff00",
      five: "#ffffff",
      text: "#ffffff",
      sub: "#9cff00",
      ring: `<path d="M53 7a40 40 0 1 1-7 70" fill="none" stroke="#9cff00" stroke-width="4" stroke-linecap="round"/>`,
      subtitle: "",
    },
  }[theme] || {
    className: "logo-blue",
    v: "#ffffff",
    five: "#135dff",
    text: "#ffffff",
    sub: "#135dff",
    ring: "",
    subtitle: "",
  };

  return `<div class="logo ${palette.className}" aria-label="V5 Company">
    <svg viewBox="0 0 230 56" role="img" aria-label="V5 Company">
      <defs>
        <linearGradient id="v5Five${theme}" x1="38" x2="98" y1="8" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.five}"/>
          <stop offset="1" stop-color="${palette.five}"/>
        </linearGradient>
        <linearGradient id="v5V${theme}" x1="0" x2="58" y1="0" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.v}"/>
          <stop offset="1" stop-color="${palette.v}"/>
        </linearGradient>
      </defs>
      <g transform="translate(0 8) scale(.82)">
        ${palette.ring}
        <path d="M3 0h20l17 36L60 0h20L48 50H31L3 0Z" fill="url(#v5V${theme})"/>
        <path d="M75 0h49l-8 14H89l-3 8h20c16 0 24 7 21 20-3 13-14 18-31 18H58l9-15h32c6 0 9-2 10-6 1-4-2-6-8-6H65L75 0Z" fill="url(#v5Five${theme})"/>
      </g>
      <text x="108" y="34" fill="${palette.text}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="4">COMPANY</text>
    </svg>
  </div>`;
}

function form(slug, label, tone = "dark") {
  return `
    <form class="lead-form ${tone}" data-v5-form data-slug="${slug}">
      <input name="name" placeholder="Seu nome" required>
      <input name="email" type="email" placeholder="Seu melhor e-mail" required>
      <input name="phone" placeholder="WhatsApp">
      <input name="message" type="hidden" value="Lead capturado pela landing ${slug}">
      <button class="btn" type="submit">${label}</button>
    </form>
    <div class="diagnosis-card" data-v5-diagnosis>
      <div>
        <h3>Pre-diagnostico V5</h3>
        <p>Responda 3 perguntas rapidas. Se fizer sentido, escolha um horario e a call entra direto na agenda do closer.</p>
      </div>
      <div class="diagnosis-grid">
        <div class="diagnosis-field">
          <label>Qual e o principal objetivo agora?</label>
          <select name="objective">
            <option value="18">Gerar mais leads qualificados</option>
            <option value="15">Melhorar posicionamento da marca</option>
            <option value="22">Aumentar vendas rapidamente</option>
          </select>
        </div>
        <div class="diagnosis-field">
          <label>Como esta o marketing hoje?</label>
          <select name="maturity">
            <option value="10">Ainda sem processo claro</option>
            <option value="18">Tem campanhas, mas sem previsibilidade</option>
            <option value="24">Ja vende e quer escalar</option>
          </select>
        </div>
        <div class="diagnosis-field">
          <label>Investimento mensal aproximado?</label>
          <select name="budget">
            <option value="10">Ainda vou definir</option>
            <option value="18">Ate R$ 3 mil</option>
            <option value="28">Acima de R$ 3 mil</option>
          </select>
        </div>
      </div>
      <button class="btn" type="button" data-v5-score>Gerar pre-diagnostico</button>
      <div data-v5-result hidden></div>
      <div class="slot-grid" data-v5-slots hidden></div>
      <button class="btn" type="button" data-v5-submit hidden disabled>Agendar call com closer</button>
    </div>
    <div class="success" data-v5-success>Contato recebido. A equipe V5 vai falar com voce.</div>`;
}

function leadScript() {
  return `
<script>
(() => {
  document.querySelectorAll("[data-v5-form]").forEach((form) => {
    const wrap = form.parentElement;
    const diagnosis = wrap.querySelector("[data-v5-diagnosis]");
    const success = form.parentElement.querySelector("[data-v5-success]");
    const scoreButton = wrap.querySelector("[data-v5-score]");
    const result = wrap.querySelector("[data-v5-result]");
    const slots = wrap.querySelector("[data-v5-slots]");
    const submit = wrap.querySelector("[data-v5-submit]");
    let lead = null;
    let quiz = {};
    let score = 0;
    let selectedSlot = "";

    function nextSlots() {
      const output = [];
      const now = new Date();
      const hours = [9, 11, 14, 16];
      for (let day = 1; output.length < 8 && day <= 12; day += 1) {
        const date = new Date(now);
        date.setDate(now.getDate() + day);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        for (const hour of hours) {
          const slot = new Date(date);
          slot.setHours(hour, 0, 0, 0);
          if (slot > now) output.push(slot);
          if (output.length >= 8) break;
        }
      }
      return output;
    }

    function formatSlot(date) {
      return date.toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).replace(".", "");
    }

    function renderSlots() {
      slots.innerHTML = "";
      nextSlots().forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot-btn";
        button.innerHTML = "<span>" + formatSlot(slot) + "</span>";
        button.addEventListener("click", () => {
          selectedSlot = slot.toISOString();
          slots.querySelectorAll(".slot-btn").forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
          submit.disabled = false;
        });
        slots.appendChild(button);
      });
      slots.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button");
      lead = Object.fromEntries(new FormData(form).entries());
      button.disabled = true;
      form.style.display = "none";
      diagnosis.classList.add("is-open");
      diagnosis.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    scoreButton.addEventListener("click", () => {
      quiz = {};
      diagnosis.querySelectorAll("select").forEach((select) => {
        quiz[select.name] = select.options[select.selectedIndex].textContent;
      });
      score = [...diagnosis.querySelectorAll("select")].reduce((total, select) => total + Number(select.value || 0), 20);
      score = Math.min(100, score);
      result.hidden = false;
      result.innerHTML = "<strong>Score " + score + "/100</strong><p>" + (score >= 70
        ? "Existe bom fit para uma conversa comercial. Escolha um horario para falar com o closer."
        : "Existe oportunidade, mas o closer vai avaliar o melhor proximo passo com base no seu contexto.") + "</p>";
      renderSlots();
      submit.hidden = false;
      submit.textContent = "Agendar call com closer";
      submit.disabled = true;
    });

    submit.addEventListener("click", async () => {
      const original = submit.textContent;
      submit.disabled = true;
      submit.textContent = "Enviando...";
      const body = {
        ...lead,
        message: (lead.message || "") + " | Pre-diagnostico V5",
        quiz,
        score,
        qualified: score >= 70,
        scheduledAt: selectedSlot
      };
      try {
        const response = await fetch("/api/landing-pages/" + form.dataset.slug + "/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("lead");
        diagnosis.style.display = "none";
        if (success) success.style.display = "block";
        if (success && selectedSlot) {
          success.textContent = "Call agendada na agenda do closer. A equipe V5 recebeu o pre-diagnostico.";
        }
      } catch (error) {
        submit.disabled = false;
        submit.textContent = original;
        alert("Nao foi possivel enviar agora. Tente novamente em instantes.");
      }
    });
  });
})();
</script>`;
}

function pageBlue(slug) {
  return `${commonCss}
<main class="v5-page v5-blue-page">
  <style>
    .v5-blue-page { background: radial-gradient(circle at 72% 62%, rgba(19,93,255,.26), transparent 28%), linear-gradient(140deg, #060910 0%, #050913 54%, #051127 100%); color: #fff; }
    .v5-blue-page .accent, .v5-blue-page .eyebrow { color: var(--v5-blue); }
    .v5-blue-page .btn { background: linear-gradient(135deg, #1766ff, #0b47e6); box-shadow: 0 16px 34px rgba(19,93,255,.28); }
    .v5-blue-page .lead { color: #c8d2e6; }
    .v5-blue-page .lead-form input { color: #fff; border: 1px solid #20304d; background: #0b1220; }
    .v5-blue-page .diagnosis-card { color: #dbe7ff; border: 1px solid #20304d; background: rgba(10,18,33,.9); }
    .v5-blue-page .diagnosis-card p { margin-top: 8px; color: #9fb0ce; line-height: 1.5; }
    .v5-blue-page .diagnosis-field select { color: #fff; background: #0b1220; border-color: #20304d; }
    .v5-blue-page [data-v5-result] strong { display: block; color: #6ca4ff; font-size: 24px; }
    .v5-blue-page .panel { position: relative; border: 1px solid #1b2b4b; border-radius: 8px; padding: clamp(22px, 3vw, 28px); background: linear-gradient(180deg, rgba(13,24,45,.94), rgba(6,14,28,.96)); box-shadow: 0 30px 100px rgba(0,0,0,.35); }
    .v5-blue-page .chart { height: 235px; margin: 20px 0 25px; border-radius: 8px; background: linear-gradient(145deg, rgba(7,13,24,.92), rgba(17,31,56,.88)); overflow: hidden; }
    .v5-blue-page .chart svg { width: 100%; height: 100%; }
    .v5-blue-page .stats { display: grid; gap: 14px; }
    .v5-blue-page .stat strong { display: block; color: #fff; font-size: 24px; }
    .v5-blue-page .stat p { color: #97a7c4; font-size: 13px; }
    .v5-blue-page .card { background: rgba(12,20,35,.94); border: 1px solid #1a2a45; box-shadow: inset 0 1px rgba(255,255,255,.03); }
    .v5-blue-page .icon { color: #72a0ff; border: 1px solid #2d4268; background: rgba(18,91,255,.08); }
    .v5-blue-page .card p { color: #abb7cc; }
    .v5-blue-page .testimonial { max-width: 740px; margin: 36px auto 0; display: flex; gap: 16px; align-items: center; border: 1px solid #1c2d4c; background: rgba(12,20,35,.92); border-radius: 8px; padding: 22px; }
    .v5-blue-page .avatar { width: 54px; height: 54px; flex: 0 0 auto; border-radius: 999px; background: radial-gradient(circle at 48% 32%, #f6d7c1 0 13%, transparent 14%), linear-gradient(135deg, #eef3ff, #475977); }
    .v5-blue-page .cta { background: linear-gradient(135deg, #082a96, #135fff); }
    .v5-blue-page .cta p { margin-top: 10px; color: #d5e1ff; }
    .v5-blue-page .success { background: rgba(19,93,255,.12); color: #dbe7ff; border: 1px solid rgba(19,93,255,.32); }
  </style>
  <header class="container nav">
    ${logo("blue")}
    <nav class="menu"><a href="#sobre">Sobre</a><a href="#servicos">Servicos</a><a href="#cases">Cases</a><a href="#depoimentos">Depoimentos</a><a class="btn" href="#contato">Fale conosco</a></nav>
  </header>
  <section class="hero" id="sobre">
    <div class="container grid">
      <div>
        <div class="eyebrow">Assessoria de marketing</div>
        <h1>Marketing que gera resultado de <span class="accent">verdade.</span></h1>
        <p class="lead">Atraimos, convertemos e escalamos clientes para o seu negocio com estrategias personalizadas, trafego pago, funis e analise de performance.</p>
        <div id="contato">${form(slug, "Quero resultados", "dark")}</div>
      </div>
      <aside class="panel" aria-label="Resultados da V5">
        <h3>Resultados que geramos</h3>
        <div class="chart">
          <svg viewBox="0 0 500 240" role="img" aria-label="Grafico de crescimento">
            <defs><linearGradient id="lineBlue" x1="0" x2="1"><stop stop-color="#0e63ff"/><stop offset="1" stop-color="#55a4ff"/></linearGradient></defs>
            <path d="M35 190 L115 138 L185 164 L264 136 L335 86 L405 100 L470 50" fill="none" stroke="url(#lineBlue)" stroke-width="7"/>
            <path d="M35 190 L115 138 L185 164 L264 136 L335 86 L405 100 L470 50 L470 220 L35 220Z" fill="#135dff" opacity=".10"/>
            <g fill="#fff"><circle cx="35" cy="190" r="5"/><circle cx="115" cy="138" r="5"/><circle cx="185" cy="164" r="5"/><circle cx="264" cy="136" r="5"/><circle cx="335" cy="86" r="5"/><circle cx="405" cy="100" r="5"/><circle cx="470" cy="50" r="5"/></g>
          </svg>
        </div>
        <div class="stats">
          <div class="stat"><strong>+300%</strong><p>Aumento em faturamento</p></div>
          <div class="stat"><strong>+250%</strong><p>Geracao de leads</p></div>
          <div class="stat"><strong>-40%</strong><p>Custo por aquisicao</p></div>
        </div>
      </aside>
    </div>
  </section>
  <section class="section container" id="servicos">
    <div class="section-head"><div class="eyebrow">Nossos servicos</div><h2>Uma operacao completa para vender mais</h2></div>
    <div class="cards">
      <article class="card"><div class="icon">${icons.target}</div><h3>Gestao de Trafego</h3><p>Campanhas otimizadas para atrair o publico certo e gerar demanda.</p></article>
      <article class="card"><div class="icon">${icons.wallet}</div><h3>Social Media</h3><p>Conteudo estrategico para posicionar sua marca e vender.</p></article>
      <article class="card"><div class="icon">${icons.funnel}</div><h3>Funis de Vendas</h3><p>Estruturas que transformam visitantes em clientes.</p></article>
      <article class="card"><div class="icon">${icons.users}</div><h3>Analise e Performance</h3><p>Acompanhamento de dados para decisoes inteligentes.</p></article>
    </div>
    <div class="testimonial" id="depoimentos"><div class="avatar"></div><p><strong>A V5 Company transformou nosso marketing.</strong><br>Em 3 meses, triplicamos nosso faturamento.</p></div>
  </section>
  <section class="container section" id="cases"><div class="cta"><div class="cta-content"><h2>Pronto para levar seu negocio para o proximo nivel?</h2><p class="lead">Fale com nossos especialistas e receba um plano personalizado.</p></div><a class="btn" href="#contato">Quero falar com um especialista</a></div></section>
  ${leadScript()}
</main>`;
}

function pagePurple(slug) {
  return `${commonCss}
<main class="v5-page v5-purple-page">
  <style>
    .v5-purple-page { color: #101322; background: #fbfbff; }
    .v5-purple-page .accent, .v5-purple-page .eyebrow { color: var(--v5-purple); }
    .v5-purple-page .menu { color: #34394a; }
    .v5-purple-page .btn { background: linear-gradient(135deg, #7b2cff, #4e1df1); box-shadow: 0 16px 34px rgba(105,45,255,.23); }
    .v5-purple-page .lead { color: #565d72; }
    .v5-purple-page .lead-form input { border: 1px solid #e2e4ee; background: #fff; box-shadow: 0 8px 30px rgba(18,22,45,.05); color: #101322; }
    .v5-purple-page .diagnosis-card { color: #101322; border: 1px solid #ded8ff; background: #fff; box-shadow: 0 18px 48px rgba(31,28,79,.1); }
    .v5-purple-page .diagnosis-card p { margin-top: 8px; color: #657084; line-height: 1.5; }
    .v5-purple-page .diagnosis-field select { color: #101322; background: #fff; border-color: #ded8ff; }
    .v5-purple-page [data-v5-result] strong { display: block; color: var(--v5-purple); font-size: 24px; }
    .v5-purple-page .media { position: relative; min-height: 480px; }
    .v5-purple-page .photo { position: relative; height: 410px; border-radius: 8px; overflow: hidden; background: linear-gradient(135deg, #d9ddea, #858ea4); box-shadow: 0 32px 90px rgba(31,28,79,.18); }
    .v5-purple-page .photo::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 68% 27%, rgba(255,255,255,.7), transparent 17%), linear-gradient(135deg, transparent, rgba(93,56,255,.35)); }
    .v5-purple-page .photo::after { content: ""; position: absolute; inset: 34px 36px; border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,.76), rgba(255,255,255,.28) 28%, transparent 29%), linear-gradient(0deg, rgba(16,19,34,.16) 1px, transparent 1px); background-size: 100% 100%, 100% 34px; opacity: .7; }
    .v5-purple-page .play { position: absolute; z-index: 2; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 74px; height: 74px; border-radius: 999px; background: #7b2cff; color: #fff; display: grid; place-items: center; box-shadow: 0 18px 40px rgba(124,44,255,.35); }
    .v5-purple-page .play svg { width: 31px; height: 31px; margin-left: 4px; fill: currentColor; }
    .v5-purple-page .result-card { position: absolute; z-index: 3; left: 28px; right: 28px; bottom: 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 22px 60px rgba(25,27,55,.15); text-align: center; }
    .v5-purple-page .result-card strong { display: block; color: var(--v5-purple); font-size: 21px; }
    .v5-purple-page .result-card span { display: block; margin-top: 5px; color: #6b7280; font-size: 11px; font-weight: 800; }
    .v5-purple-page .steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px; }
    .v5-purple-page .step { text-align: center; }
    .v5-purple-page .step .circle { width: 70px; height: 70px; margin: 0 auto 18px; border: 1px solid #ded8ff; border-radius: 999px; display: grid; place-items: center; color: var(--v5-purple); background: #fff; }
    .v5-purple-page .step small { color: var(--v5-purple); font-weight: 950; }
    .v5-purple-page .step p { color: #657084; }
    .v5-purple-page .logos { border-radius: 0; background: linear-gradient(135deg, #f0e7ff, #efe7ff); padding: 38px 24px; text-align: center; }
    .v5-purple-page .logos-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px 42px; margin-top: 20px; color: #666b78; font-weight: 950; }
    .v5-purple-page .cta { display: grid; grid-template-columns: .82fr 1.18fr; align-items: center; background: linear-gradient(135deg, #7b2cff, #5317e8); color: #fff; }
    .v5-purple-page .cta-form { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(150px, 1fr) minmax(190px, 1fr) minmax(140px, .7fr) minmax(230px, auto); gap: 12px; width: 100%; }
    .v5-purple-page .cta-form input { min-width: 0; min-height: 50px; border: 0; border-radius: 8px; padding: 0 16px; font-weight: 800; }
    .v5-purple-page .cta-form .btn { background: #080912; box-shadow: none; }
    .v5-purple-page .success { background: #f1ebff; color: #4217ad; border: 1px solid #d7c9ff; }
    @media (max-width: 920px) {
      .v5-purple-page .media { min-height: auto; }
      .v5-purple-page .result-card { position: relative; left: auto; right: auto; bottom: auto; margin-top: 16px; }
      .v5-purple-page .steps, .v5-purple-page .cta { grid-template-columns: 1fr; }
      .v5-purple-page .cta-form { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .v5-purple-page .photo { height: 310px; }
      .v5-purple-page .result-card { grid-template-columns: 1fr; }
    }
  </style>
  <header class="container nav">
    ${logo("purple")}
    <nav class="menu"><a href="#sobre">Sobre</a><a href="#servicos">Servicos</a><a href="#cases">Cases</a><a href="#depoimentos">Depoimentos</a><a class="btn" href="#contato">Fale conosco</a></nav>
  </header>
  <section class="hero container" id="sobre">
    <div class="grid">
      <div>
        <div class="eyebrow">Assessoria de marketing</div>
        <h1>Estrategia.<br>Execucao.<br><span class="accent">Resultado.</span></h1>
        <p class="lead">Somos especialistas em transformar negocios atraves do marketing digital com metodo, performance e acompanhamento proximo.</p>
        ${form(slug, "Quero uma analise gratuita", "light")}
      </div>
      <div class="media" aria-label="Reuniao estrategica">
        <div class="photo"><div class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
        <div class="result-card"><div><strong>+150</strong><span>Clientes atendidos</span></div><div><strong>+R$50M</strong><span>Gerados em vendas</span></div><div><strong>98%</strong><span>Satisfacao</span></div></div>
      </div>
    </div>
  </section>
  <section class="section container" id="servicos">
    <div class="section-head"><div class="eyebrow">Como fazemos</div><h2>Um metodo comprovado que gera resultados</h2></div>
    <div class="steps">
      <article class="step"><div class="circle">${icons.users}</div><small>01</small><h3>Diagnostico</h3><p>Entendemos seu negocio e identificamos oportunidades.</p></article>
      <article class="step"><div class="circle">${icons.rocket}</div><small>02</small><h3>Estrategia</h3><p>Criamos um plano personalizado focado em resultado.</p></article>
      <article class="step"><div class="circle">${icons.target}</div><small>03</small><h3>Execucao</h3><p>Colocamos tudo em pratica com excelencia.</p></article>
      <article class="step"><div class="circle">${icons.chart}</div><small>04</small><h3>Escala</h3><p>Otimizamos campanhas e aumentamos o retorno.</p></article>
    </div>
  </section>
  <section class="container section" id="cases"><div class="logos"><div class="eyebrow">Nossos clientes tiveram resultados reais</div><div class="logos-grid"><span>CONEXA</span><span>LEVEL UP</span><span>INOVA</span><span>TRACKER</span><span>AGENCIA X</span></div></div></section>
  <section class="container section" id="contato"><div class="cta"><div class="cta-content"><h2>Vamos transformar seu marketing?</h2><p style="margin-top:10px;color:#e6dcff">Preencha os dados e faca o pre-diagnostico para falar com um closer.</p></div><div style="position:relative;z-index:2">${form(slug, "Quero falar com um especialista", "light")}</div></div></section>
  ${leadScript()}
</main>`;
}

function pageLime(slug) {
  return `${commonCss}
<main class="v5-page v5-lime-page">
  <style>
    .v5-lime-page { background: radial-gradient(circle at 82% 30%, rgba(156,255,0,.13), transparent 22%), #050804; color: #fff; }
    .v5-lime-page .accent, .v5-lime-page .eyebrow { color: var(--v5-lime); }
    .v5-lime-page .menu { color: #d3dcc8; }
    .v5-lime-page .btn { background: var(--v5-lime); color: #101a05; box-shadow: 0 16px 42px rgba(154,255,0,.22); }
    .v5-lime-page .lead { color: #d5dfca; }
    .v5-lime-page .lead-form input { color: #fff; background: #11180f; border: 1px solid #26371f; }
    .v5-lime-page .diagnosis-card { color: #eaffcf; border: 1px solid #29451a; background: rgba(12,18,10,.92); }
    .v5-lime-page .diagnosis-card p { margin-top: 8px; color: #b9c7ad; line-height: 1.5; }
    .v5-lime-page .diagnosis-field select { color: #fff; background: #11180f; border-color: #29451a; }
    .v5-lime-page [data-v5-result] strong { display: block; color: var(--v5-lime); font-size: 24px; }
    .v5-lime-page .hero::after { content: ""; position: absolute; right: 0; top: 80px; width: 52%; height: 620px; background: radial-gradient(circle at 58% 40%, rgba(154,255,0,.16), transparent 36%), linear-gradient(130deg, transparent 20%, rgba(154,255,0,.08)); clip-path: polygon(35% 0,100% 0,100% 100%,5% 100%); z-index: 0; }
    .v5-lime-page .hero > .container { position: relative; z-index: 1; }
    .v5-lime-page .lion { position: relative; min-height: 510px; border: 1px solid #223319; overflow: hidden; border-radius: 8px; background: radial-gradient(circle at 72% 47%, rgba(255,255,255,.2), transparent 16%), linear-gradient(135deg, #121a10, #252f22); }
    .v5-lime-page .lion::before { content: "V5"; position: absolute; right: -18px; top: 48px; font-size: clamp(140px, 17vw, 220px); font-weight: 950; letter-spacing: -.12em; color: rgba(154,255,0,.08); }
    .v5-lime-page .lion-face { position: absolute; right: 34px; top: 52px; width: min(360px, 78vw); height: 380px; opacity: .5; filter: grayscale(1); }
    .v5-lime-page .lion-face::before { content: ""; position: absolute; inset: 20px 30px; border-radius: 50% 46% 42% 50%; background: radial-gradient(circle at 57% 43%, #f8fff0 0 3%, transparent 4%), radial-gradient(circle at 42% 42%, #f8fff0 0 3%, transparent 4%), radial-gradient(ellipse at 50% 57%, transparent 0 18%, #f8fff0 19% 20%, transparent 21%), radial-gradient(ellipse at 50% 50%, #eaf2df 0 28%, transparent 29%), radial-gradient(ellipse at 50% 50%, #dfe8d4 0 45%, transparent 46%); }
    .v5-lime-page .lion-face::after { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 10px solid rgba(244,249,237,.18); filter: blur(2px); }
    .v5-lime-page .focus { position: absolute; right: 40px; bottom: 38px; width: min(290px, calc(100% - 40px)); border: 1px solid #28421a; border-radius: 8px; padding: 22px; background: rgba(12,18,10,.9); }
    .v5-lime-page .focus ul { list-style: none; display: grid; gap: 11px; margin: 0; padding: 0; color: #dbe8d0; font-size: 13px; font-weight: 750; }
    .v5-lime-page .focus li::before { content: "✓"; color: var(--v5-lime); margin-right: 10px; }
    .v5-lime-page .services { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; border-top: 1px solid #203519; border-bottom: 1px solid #203519; background: #203519; }
    .v5-lime-page .service { min-width: 0; min-height: 190px; background: linear-gradient(180deg, #0b1009, #080c07); padding: 28px 20px; }
    .v5-lime-page .service .icon { color: var(--v5-lime); border: 1px solid #32531e; background: rgba(154,255,0,.06); }
    .v5-lime-page .service p { color: #b9c7ad; }
    .v5-lime-page .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; border-top: 1px solid #203519; padding-top: 34px; }
    .v5-lime-page .metric strong { display: block; font-size: clamp(36px, 5vw, 49px); line-height: 1; letter-spacing: 0; color: var(--v5-lime); }
    .v5-lime-page .metric p { color: #c6d2bd; }
    .v5-lime-page .cta { background: var(--v5-lime); color: #091006; }
    .v5-lime-page .cta .btn { background: #071005; color: var(--v5-lime); box-shadow: none; }
    .v5-lime-page .success { background: rgba(154,255,0,.13); color: #eaffcf; border: 1px solid rgba(154,255,0,.32); }
    @media (max-width: 920px) {
      .v5-lime-page .hero::after { width: 100%; opacity: .45; }
      .v5-lime-page .lion { min-height: 390px; }
      .v5-lime-page .services, .v5-lime-page .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .v5-lime-page .services, .v5-lime-page .metrics { grid-template-columns: 1fr; }
      .v5-lime-page .lion { min-height: 360px; }
      .v5-lime-page .lion-face { right: -20px; opacity: .36; }
      .v5-lime-page .focus { position: relative; right: auto; bottom: auto; width: auto; margin: 210px 14px 14px; }
    }
  </style>
  <header class="container nav">
    ${logo("lime")}
    <nav class="menu"><a href="#sobre">Sobre</a><a href="#servicos">Servicos</a><a href="#cases">Cases</a><a href="#depoimentos">Depoimentos</a><a class="btn" href="#contato">Fale conosco</a></nav>
  </header>
  <section class="hero" id="sobre">
    <div class="container grid">
      <div>
        <div class="eyebrow">Crescimento com performance</div>
        <h1>Mais que marketing.<br>Parceria para <span class="accent">crescer sempre.</span></h1>
        <p class="lead">Estrategias inteligentes para atrair mais clientes, aumentar suas vendas e fortalecer sua marca com acompanhamento proximo.</p>
        <div id="contato">${form(slug, "Quero crescer", "dark")}</div>
      </div>
      <div class="lion" aria-label="V5 Company performance visual">
        <div class="lion-face"></div>
        <div class="focus"><div class="eyebrow" style="margin-bottom:14px">Foco em resultado</div><ul><li>Mais visibilidade</li><li>Mais leads qualificados</li><li>Mais vendas</li><li>Mais crescimento</li></ul></div>
      </div>
    </div>
  </section>
  <section class="section container" id="servicos">
    <div class="eyebrow">Nossos servicos</div>
    <div class="services">
      <article class="service"><div class="icon">${icons.target}</div><h3>Trafego Pago</h3><p>Campanhas otimizadas para maximo retorno.</p></article>
      <article class="service"><div class="icon">${icons.brand}</div><h3>Branding</h3><p>Construimos marcas fortes, memoraveis e desejadas.</p></article>
      <article class="service"><div class="icon">${icons.wallet}</div><h3>Conteudo Estrategico</h3><p>Conteudo que conecta, gera autoridade e vende.</p></article>
      <article class="service"><div class="icon">${icons.cog}</div><h3>Automacao</h3><p>Processos que otimizam atendimento e conversao.</p></article>
    </div>
  </section>
  <section class="section container" id="cases"><div class="eyebrow">Alguns resultados</div><div class="metrics"><div class="metric"><strong>320%</strong><p>Aumento medio em faturamento</p></div><div class="metric"><strong>2.5x</strong><p>Mais leads qualificados</p></div><div class="metric"><strong>70%</strong><p>Reducao no custo por aquisicao</p></div><div class="metric"><strong>100+</strong><p>Negocios transformados</p></div></div></section>
  <section class="section container" id="depoimentos"><div class="cta"><div class="cta-content"><h2>Chegou a hora de levar seu negocio alem.</h2><p style="margin-top:10px">Fale com a V5 Company e descubra o potencial do seu negocio com marketing certo.</p></div><a class="btn" href="#contato">Quero falar com um especialista</a></div></section>
  ${leadScript()}
</main>`;
}

async function writePreviewFiles(pages) {
  const outDir = path.join(root, "output", "v5-landing-pages");
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all(pages.map((page) => {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.metaTitle}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"></head><body>${page.content}</body></html>`;
    return fs.writeFile(path.join(outDir, `${page.slug}.html`), html, "utf8");
  }));
}

async function main() {
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const closerPassword = await bcrypt.hash(CLOSER_PASSWORD, 12);

  const result = await prisma.$transaction(async (tx) => {
    const selectedPlan = await tx.plan.findFirst({
      where: { isActive: true, isPublic: true },
      orderBy: [{ priceMonthly: "asc" }, { createdAt: "asc" }],
    });

    const organization = await tx.organization.upsert({
      where: { slug: ACCOUNT_SLUG },
      create: {
        name: ACCOUNT_NAME,
        slug: ACCOUNT_SLUG,
        domain: "v5company.com.br",
        plan: selectedPlan?.name || "Free",
        planId: selectedPlan?.id || null,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        isActive: true,
        settings: {
          seededBy: "seed_v5_company_landing_pages",
          brand: "V5 Company",
          landingPages: ["v5-company-resultados", "v5-company-estrategia-execucao", "v5-company-crescer-sempre"],
        },
        whiteLabelConfig: {
          name: "V5 Company",
          primaryColor: "#135dff",
          secondaryColor: "#9cff00",
        },
      },
      update: {
        name: ACCOUNT_NAME,
        domain: "v5company.com.br",
        plan: selectedPlan?.name || "Free",
        planId: selectedPlan?.id || null,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        isActive: true,
        settings: {
          seededBy: "seed_v5_company_landing_pages",
          brand: "V5 Company",
          landingPages: ["v5-company-resultados", "v5-company-estrategia-execucao", "v5-company-crescer-sempre"],
        },
        whiteLabelConfig: {
          name: "V5 Company",
          primaryColor: "#135dff",
          secondaryColor: "#9cff00",
        },
      },
    });

    const workspace = await tx.workspace.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: "principal" } },
      create: {
        name: "Principal",
        slug: "principal",
        organizationId: organization.id,
        settings: { seededBy: "seed_v5_company_landing_pages" },
      },
      update: {
        name: "Principal",
        isActive: true,
        settings: { seededBy: "seed_v5_company_landing_pages" },
      },
    });

    const user = await tx.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        name: "Administrador V5",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "ORG_ADMIN",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "GESTAO",
      },
      update: {
        name: "Administrador V5",
        password: hashedPassword,
        role: "ORG_ADMIN",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "GESTAO",
      },
    });

    await tx.user.upsert({
      where: { email: CLOSER_EMAIL },
      create: {
        name: "Closer V5",
        email: CLOSER_EMAIL,
        password: closerPassword,
        role: "USER",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Closer",
      },
      update: {
        name: "Closer V5",
        password: closerPassword,
        role: "USER",
        status: "ACTIVE",
        organizationId: organization.id,
        workspaceId: workspace.id,
        department: "Closer",
      },
    });

    const closerAgenda = await tx.agenda.findFirst({
      where: {
        organizationId: organization.id,
        name: { contains: "Closer", mode: "insensitive" },
      },
    });

    if (closerAgenda) {
      await tx.agenda.update({
        where: { id: closerAgenda.id },
        data: { name: "Agenda Closer V5", color: "#7428ff" },
      });
    } else {
      await tx.agenda.create({
        data: {
          name: "Agenda Closer V5",
          color: "#7428ff",
          organizationId: organization.id,
        },
      });
    }

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

  const pages = [
    {
      name: "V5 Company - Marketing que gera resultado",
      slug: "v5-company-resultados",
      metaTitle: "V5 Company | Marketing que gera resultado de verdade",
      metaDescription: "Landing page escura e azul da V5 Company para captar leads de negocios que querem crescer com performance.",
      content: pageBlue("v5-company-resultados"),
      theme: { primaryColor: "#135dff", secondaryColor: "#050914", template: "v5-blue" },
    },
    {
      name: "V5 Company - Estrategia, execucao e resultado",
      slug: "v5-company-estrategia-execucao",
      metaTitle: "V5 Company | Estrategia, execucao e resultado",
      metaDescription: "Landing page branca e roxa da V5 Company com metodo, prova de resultados e chamada para especialistas.",
      content: pagePurple("v5-company-estrategia-execucao"),
      theme: { primaryColor: "#7428ff", secondaryColor: "#101322", template: "v5-purple" },
    },
    {
      name: "V5 Company - Crescer sempre",
      slug: "v5-company-crescer-sempre",
      metaTitle: "V5 Company | Mais que marketing",
      metaDescription: "Landing page preta e verde da V5 Company para campanhas de crescimento, branding, trafego e automacao.",
      content: pageLime("v5-company-crescer-sempre"),
      theme: { primaryColor: "#9cff00", secondaryColor: "#050804", template: "v5-lime" },
    },
  ];

  await writePreviewFiles(pages);

  const saved = [];
  for (const page of pages) {
    const record = await prisma.landingPage.upsert({
      where: { slug: page.slug },
      create: {
        name: page.name,
        slug: page.slug,
        organizationId: result.organization.id,
        status: "published",
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
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
        publishedAt: new Date(),
        sections: null,
        headline: null,
        subheadline: null,
        heroImage: null,
        theme: page.theme,
      },
      select: { name: true, slug: true, status: true },
    });
    saved.push(record);
  }

  console.table(saved.map((page) => ({
    name: page.name,
    status: page.status,
    local: `http://localhost:10000/lp/${page.slug}`,
    prod: `https://nexus360.consultio.com.br/lp/${page.slug}`,
  })));
  console.log(`Conta: ${result.organization.name} (${result.organization.slug})`);
  console.log(`Usuario: ${ADMIN_EMAIL}`);
  console.log(`Senha: ${ADMIN_PASSWORD}`);
  console.log(`Closer: ${CLOSER_EMAIL}`);
  console.log(`Senha closer: ${CLOSER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
