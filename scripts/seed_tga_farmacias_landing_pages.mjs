import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../backend/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, "backend", ".env") });

const ORG_ID = "d792cfc3-cd09-4f75-87d6-8454475e8a9e";
const LOGO_WIDE = "C:\\Users\\paulo\\Downloads\\tga-mkt-farmacias-logotipo-alta-resolucao.png";
const LOGO_INSTA = "C:\\Users\\paulo\\Downloads\\tga-logotipo-mkt-farmacias-insta.jpg.jpeg";
const HERO_FEMALE = path.join(root, "output", "tga-landing-pages", "assets", "hero-farmaceutica.png");
const HERO_MALE = path.join(root, "output", "tga-landing-pages", "assets", "hero-farmaceutico.png");
const HERO_CAPSULE = path.join(root, "output", "tga-landing-pages", "assets", "hero-capsula.png");
const STATIC_ASSETS = {
  logo: "/lp-assets/tga/logo-horizontal.png",
  logoDark: "/lp-assets/tga/logo-dark.jpg",
  heroFemale: "/lp-assets/tga/hero-farmaceutica.png",
  heroMale: "/lp-assets/tga/hero-farmaceutico.png",
  heroCapsule: "/lp-assets/tga/hero-capsula.png",
};

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

async function dataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function form(slug, label, variant = "light") {
  const dark = variant === "dark";
  return `
    <form class="form ${dark ? "form-dark" : ""}" data-tga-lead-form data-slug="${slug}">
      <input name="name" placeholder="Nome completo" required />
      <input name="phone" placeholder="WhatsApp" />
      <input name="email" type="email" placeholder="E-mail" required />
      <input name="message" placeholder="Nome da farmacia" />
      <input name="utmSource" type="hidden" />
      <input name="utmMedium" type="hidden" />
      <input name="utmCampaign" type="hidden" />
      <button class="btn ${dark ? "" : "blue"}" type="submit">${label}</button>
    </form>
    <form class="quiz-card" data-tga-quiz hidden>
      <div class="quiz-head">
        <b>Diagnostico rapido</b>
        <span>Responda para vermos se faz sentido agendar uma call de 30 minutos.</span>
      </div>
      <label>Quanto sua farmacia investe ou pretende investir por mes em marketing?</label>
      <select name="budget">
        <option value="0">Ainda nao tenho verba definida</option>
        <option value="15">Ate R$ 1.500</option>
        <option value="25">R$ 1.500 a R$ 3.000</option>
        <option value="35">Acima de R$ 3.000</option>
      </select>
      <label>Hoje sua farmacia ja vende ou atende pelo WhatsApp/Instagram?</label>
      <select name="digital">
        <option value="8">Pouco ou quase nada</option>
        <option value="16">Sim, mas sem processo claro</option>
        <option value="24">Sim, e quero escalar</option>
      </select>
      <label>Qual e a urgencia para aumentar vendas?</label>
      <select name="urgency">
        <option value="8">Quero estudar possibilidades</option>
        <option value="18">Quero melhorar nos proximos meses</option>
        <option value="26">Preciso gerar resultado nos proximos 30 dias</option>
      </select>
      <label>Voce consegue atender novos clientes se a demanda aumentar?</label>
      <select name="capacity">
        <option value="8">Ainda preciso organizar a operacao</option>
        <option value="15">Consigo atender um volume moderado</option>
        <option value="25">Sim, tenho estrutura para crescer</option>
      </select>
      <button class="btn ${dark ? "glow" : "blue"}" type="button" data-tga-score>Ver meu diagnostico</button>
    </form>
    <div class="schedule-card" data-tga-schedule hidden>
      <b data-tga-score-label></b>
      <span data-tga-score-copy></span>
      <div class="slot-grid" data-tga-slots></div>
      <button class="btn ${dark ? "glow" : "blue"}" type="button" data-tga-submit disabled>Confirmar diagnostico</button>
    </div>
    <div class="success" data-tga-success><b>Contato recebido.</b><span>A equipe da TGA vai falar com voce.</span></div>`;
}

const css = `
<style>
  :root {
    --blue: #08aeea;
    --blue2: #00c7ff;
    --navy: #050638;
    --text: #080b44;
    --muted: #647089;
    --bg: #f6fbff;
    --line: #dcebf4;
    --shadow: 0 18px 45px rgba(7, 8, 66, .12);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; overflow-x: hidden; }
  body {
    margin: 0;
    overflow-x: hidden;
    font-family: Inter, Arial, sans-serif;
    color: var(--text);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; display: block; }
  .page { min-height: 100vh; }
  .page.light { background: linear-gradient(180deg, #fff 0%, #f4fbff 100%); }
  .page.dark { background: radial-gradient(circle at 70% 20%, #12318a 0%, var(--navy) 38%, #02021b 100%); color: #fff; }
  .container { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
  .nav {
    min-height: 84px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 0;
  }
  .logo { width: min(220px, 46vw); height: auto; object-fit: contain; }
  .logo.dark-logo { max-height: 66px; width: auto; border-radius: 12px; }
  .menu { display: flex; gap: clamp(14px, 2vw, 28px); align-items: center; font-size: 12px; font-weight: 900; text-transform: uppercase; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
    border: 0;
    border-radius: 14px;
    padding: 15px 22px;
    background: var(--navy);
    color: #fff;
    font-weight: 950;
    text-transform: uppercase;
    font-size: 12px;
    box-shadow: 0 12px 28px rgba(9, 174, 232, .18);
    cursor: pointer;
  }
  .btn.blue { background: linear-gradient(135deg, var(--blue), var(--blue2)); box-shadow: 0 12px 28px rgba(9, 174, 232, .24); }
  .btn.glow { background: linear-gradient(135deg, var(--blue), var(--blue2)); box-shadow: 0 0 28px rgba(0, 212, 255, .35); }
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.02fr) minmax(0, .98fr);
    gap: clamp(26px, 5vw, 54px);
    align-items: center;
    min-height: min(720px, calc(100vh - 104px));
    padding: clamp(24px, 4vw, 48px) 0 clamp(22px, 4vw, 42px);
  }
  .eyebrow, .pill {
    color: var(--blue);
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .12em;
    font-size: 12px;
  }
  .pill {
    display: inline-flex;
    border: 1px solid rgba(0, 212, 255, .35);
    padding: 9px 14px;
    border-radius: 999px;
    color: var(--blue2);
    margin-bottom: 18px;
  }
  h1 {
    font-size: clamp(38px, 5vw, 58px);
    line-height: 1.04;
    letter-spacing: 0;
    margin: 14px 0 18px;
    font-weight: 950;
  }
  h1 span, .accent { color: var(--blue); }
  .dark h1 span, .dark .accent { color: var(--blue2); }
  .lead-text {
    font-size: clamp(16px, 1.8vw, 18px);
    line-height: 1.7;
    color: var(--muted);
    max-width: 570px;
    font-weight: 600;
  }
  .dark .lead-text, .dark p { color: #b8c7e8; }
  .checks { display: grid; gap: 14px; margin: 26px 0; }
  .checks div { display: flex; gap: 12px; align-items: center; font-weight: 800; line-height: 1.35; }
  .check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--blue);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 13px;
    flex: 0 0 auto;
  }
  .visual {
    position: relative;
    min-height: clamp(360px, 48vw, 540px);
    display: grid;
    place-items: center;
    isolation: isolate;
  }
  .blob, .circle {
    position: absolute;
    z-index: -1;
    width: min(430px, 78vw);
    height: min(390px, 70vw);
    border-radius: 55% 45% 48% 52%;
    background: linear-gradient(135deg, #bdeeff, var(--blue));
    right: 0;
  }
  .bubble {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #fff 0 8%, rgba(255,255,255,.5) 9% 18%, transparent 19%), linear-gradient(135deg, var(--blue2), var(--blue));
    box-shadow: inset -10px -12px rgba(0,0,0,.08), 0 16px 30px rgba(9,174,232,.18);
  }
  .b1 { width: 84px; height: 84px; left: 6%; top: 20%; }
  .b2 { width: 54px; height: 54px; left: 15%; top: 48%; }
  .b3 { width: 118px; height: 118px; right: 2%; top: 8%; }
  .hero-img {
    width: min(560px, 96%);
    border-radius: 24px;
    overflow: hidden;
    filter: drop-shadow(0 24px 48px rgba(7, 8, 66, .16));
  }
  .light .hero-img {
    background: transparent;
    box-shadow: none;
  }
  .dark .hero-img { box-shadow: 0 0 80px rgba(0, 212, 255, .22); }
  .leadbox, .strip, .lead-dark {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    gap: clamp(22px, 4vw, 34px);
    align-items: center;
    border-radius: 26px;
    padding: clamp(24px, 4vw, 36px);
    margin: 18px auto clamp(34px, 5vw, 54px);
  }
  .leadbox {
    background: #fff;
    box-shadow: var(--shadow);
    border: 1px solid #eaf4fb;
  }
  .strip {
    background: linear-gradient(135deg, var(--blue), var(--blue2));
    color: #fff;
  }
  .lead-dark {
    background: rgba(4,15,58,.72);
    border: 1px solid rgba(0,212,255,.35);
    box-shadow: 0 30px 80px rgba(0,0,0,.3);
  }
  .leadbox h2, .strip h2, .lead-dark h2 {
    font-size: clamp(25px, 3vw, 32px);
    line-height: 1.2;
    margin: 0 0 12px;
  }
  .form {
    display: grid;
    gap: 12px;
    width: 100%;
  }
  .form input {
    width: 100%;
    min-width: 0;
    height: 52px;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0 16px;
    color: var(--text);
    font: 700 14px Inter, Arial, sans-serif;
    outline: none;
    background: #fff;
  }
  .form input:focus { border-color: var(--blue); box-shadow: 0 0 0 4px rgba(8,174,234,.12); }
  .form-dark input {
    border-color: rgba(255,255,255,.14);
    background: rgba(255,255,255,.08);
    color: #fff;
  }
  .form-dark input::placeholder { color: #d8e7ff; }
  .success {
    display: none;
    margin-top: 14px;
    padding: 16px;
    border-radius: 14px;
    background: #ecfdf5;
    color: #047857;
    line-height: 1.5;
  }
  .success span { display: block; color: #14532d; }
  .quiz-card,
  .schedule-card {
    display: grid;
    gap: 12px;
    width: 100%;
    padding: 18px;
    border-radius: 18px;
    background: rgba(8, 174, 234, .07);
    border: 1px solid rgba(8, 174, 234, .22);
  }
  .quiz-card[hidden],
  .schedule-card[hidden] {
    display: none;
  }
  .quiz-head {
    display: grid;
    gap: 4px;
    margin-bottom: 2px;
  }
  .quiz-head b,
  .schedule-card b {
    font-size: 20px;
    line-height: 1.2;
  }
  .quiz-head span,
  .schedule-card span {
    color: var(--muted);
    line-height: 1.45;
    font-weight: 650;
  }
  .dark .quiz-head span,
  .dark .schedule-card span {
    color: #b8c7e8;
  }
  .quiz-card label {
    font-weight: 850;
    font-size: 13px;
    line-height: 1.35;
  }
  .quiz-card select {
    width: 100%;
    min-height: 48px;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0 14px;
    background: #fff;
    color: var(--text);
    font: 750 13px Inter, Arial, sans-serif;
  }
  .form-dark + .quiz-card,
  .form-dark + .quiz-card + .schedule-card {
    background: rgba(255, 255, 255, .07);
    border-color: rgba(255, 255, 255, .14);
  }
  .form-dark + .quiz-card select {
    background: rgba(255,255,255,.95);
  }
  .slot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .slot-btn {
    min-height: 44px;
    border: 1px solid rgba(8, 174, 234, .28);
    border-radius: 12px;
    background: #fff;
    color: var(--text);
    font-weight: 900;
    cursor: pointer;
  }
  .slot-btn.active {
    background: var(--blue);
    color: #fff;
    border-color: var(--blue);
  }
  .stats, .bar, .mini, .grid, .cards, .casegrid, .icons {
    display: grid;
    gap: 18px;
  }
  .stats, .bar { grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 28px auto clamp(42px, 7vw, 70px); }
  .mini, .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid, .icons { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .casegrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat, .card, .service, .mini > div, .icon, .case {
    background: #fff;
    border-radius: 20px;
    padding: clamp(20px, 3vw, 28px);
    box-shadow: 0 12px 30px rgba(7,8,66,.08);
    min-width: 0;
  }
  .stat { text-align: center; }
  .stat b, .bar b, .case strong { display: block; color: var(--blue); font-size: clamp(28px, 4vw, 36px); }
  .bar {
    background: linear-gradient(135deg, var(--blue), var(--blue2));
    color: #fff;
    padding: clamp(24px, 4vw, 34px);
    border-radius: 22px;
    text-align: center;
  }
  .bar b { color: #fff; }
  .section, .services, .logos { text-align: center; padding: clamp(28px, 5vw, 64px) 0; }
  .section h2, .services h2 { font-size: clamp(28px, 4vw, 36px); }
  .card, .service { text-align: left; }
  .service { text-align: center; }
  .ico {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--blue);
    color: #fff;
    margin: 0 auto 14px;
    display: grid;
    place-items: center;
    font-weight: 950;
  }
  .icon, .case {
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.12);
    color: #b8c7e8;
    box-shadow: none;
    text-align: center;
  }
  .icon b { display: block; color: #fff; margin-bottom: 6px; }
  .case { text-align: left; }
  .logos { color: #9aa6b9; }
  .footercta, .footer, .cta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 22px;
    border-radius: 28px 28px 0 0;
    padding: clamp(30px, 5vw, 42px);
    margin-top: clamp(38px, 6vw, 70px);
    background: var(--navy);
    color: #fff;
  }
  .footer, .dark .footer { margin-top: 0; border-top: 1px solid rgba(255,255,255,.12); border-radius: 0; background: transparent; padding-inline: 0; }
  .footercta p, .cta p, .footer p { color: #c7d8ff; }
  @media (max-width: 920px) {
    .container { width: min(100% - 28px, 760px); }
    .menu a:not(.btn) { display: none; }
    .hero, .leadbox, .strip, .lead-dark { grid-template-columns: 1fr; }
    .hero { text-align: left; }
    .lead-text { max-width: none; }
    .visual { order: -1; min-height: 360px; }
    .hero-img { width: min(520px, 100%); }
    .stats, .bar, .grid, .icons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mini, .cards, .casegrid { grid-template-columns: 1fr; }
    .footercta, .footer, .cta { flex-direction: column; align-items: stretch; }
    .footercta .btn, .footer .btn, .cta .btn { width: 100%; }
  }
  @media (max-width: 560px) {
    .container { width: min(100% - 22px, 430px); }
    .nav { min-height: auto; align-items: flex-start; }
    .logo { width: min(176px, 48vw); }
    .logo.dark-logo { max-height: 54px; }
    .menu .btn { min-height: 44px; padding: 12px 14px; font-size: 10px; white-space: nowrap; }
    h1 { font-size: clamp(34px, 11vw, 42px); }
    .hero { min-height: auto; padding-top: 18px; }
    .visual { min-height: 300px; }
    .b1, .b2 { display: none; }
    .b3 { width: 82px; height: 82px; }
    .leadbox, .strip, .lead-dark { padding: 20px; border-radius: 20px; }
    .form input, .form .btn { min-height: 50px; }
    .stats, .bar, .grid, .icons { grid-template-columns: 1fr; }
    .stat, .card, .service, .mini > div, .icon, .case { padding: 20px; }
  }
</style>`;

function tgaQuizScript(slug) {
  return `
<script>
(() => {
  const root = document.currentScript.closest("main") || document;
  const form = root.querySelector("[data-tga-lead-form]");
  if (!form) return;

  const quiz = root.querySelector("[data-tga-quiz]");
  const schedule = root.querySelector("[data-tga-schedule]");
  const success = root.querySelector("[data-tga-success]");
  const scoreButton = root.querySelector("[data-tga-score]");
  const submitButton = root.querySelector("[data-tga-submit]");
  const scoreLabel = root.querySelector("[data-tga-score-label]");
  const scoreCopy = root.querySelector("[data-tga-score-copy]");
  const slotsEl = root.querySelector("[data-tga-slots]");
  let leadData = null;
  let quizData = null;
  let selectedSlot = "";
  let score = 0;

  function nextSlots() {
    const slots = [];
    const now = new Date();
    const hours = [9, 11, 14, 16];
    for (let day = 1; slots.length < 8 && day <= 10; day += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      const weekday = date.getDay();
      if (weekday === 0 || weekday === 6) continue;
      for (const hour of hours) {
        const slot = new Date(date);
        slot.setHours(hour, 0, 0, 0);
        if (slot > now) slots.push(slot);
        if (slots.length >= 8) break;
      }
    }
    return slots;
  }

  function formatSlot(date) {
    return date.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(".", "");
  }

  function renderSlots() {
    slotsEl.innerHTML = "";
    nextSlots().forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot-btn";
      button.textContent = formatSlot(slot);
      button.addEventListener("click", () => {
        selectedSlot = slot.toISOString();
        root.querySelectorAll(".slot-btn").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        submitButton.disabled = false;
      });
      slotsEl.appendChild(button);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    leadData = Object.fromEntries(new FormData(form).entries());
    form.hidden = true;
    quiz.hidden = false;
    quiz.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  scoreButton.addEventListener("click", () => {
    quizData = Object.fromEntries(new FormData(quiz).entries());
    score = Math.min(100, Object.values(quizData).reduce((total, value) => total + Number(value || 0), 0));
    quiz.hidden = true;
    schedule.hidden = false;

    if (score >= 70) {
      scoreLabel.textContent = "Seu score foi " + score + "/100. Faz sentido agendar uma call.";
      scoreCopy.textContent = "Escolha um horario para uma conversa de 30 minutos com a equipe TGA.";
      renderSlots();
    } else {
      scoreLabel.textContent = "Seu score foi " + score + "/100. Vamos analisar seu caso primeiro.";
      scoreCopy.textContent = "Voce ainda pode enviar o diagnostico. A equipe TGA vai avaliar e retornar com o melhor proximo passo.";
      slotsEl.innerHTML = "";
      selectedSlot = "";
      submitButton.disabled = false;
      submitButton.textContent = "Enviar diagnostico";
    }

    schedule.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  submitButton.addEventListener("click", async () => {
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    const payload = {
      ...leadData,
      quiz: quizData,
      score,
      qualified: score >= 70,
      scheduledAt: score >= 70 ? selectedSlot : null,
    };

    try {
      const response = await fetch("/api/landing-pages/${slug}/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Falha no envio");
      schedule.hidden = true;
      success.style.display = "block";
      success.querySelector("b").textContent = score >= 70 && selectedSlot ? "Call agendada com sucesso." : "Diagnostico enviado.";
      success.querySelector("span").textContent = score >= 70 && selectedSlot
        ? "Reservamos 30 minutos na agenda da TGA para falar com voce."
        : "A equipe TGA vai avaliar seu diagnostico e retornar.";
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = score >= 70 ? "Confirmar diagnostico" : "Enviar diagnostico";
      alert("Nao foi possivel enviar agora. Tente novamente em instantes.");
    }
  });
})();
</script>`;
}

function pageClaro({ logo, hero, slug }) {
  return `${css}
<main class="page light">
  <header class="container nav">
    <img class="logo" src="${logo}" alt="TGA Marketing para Farmacias">
    <nav class="menu"><a href="#servicos">Servicos</a><a href="#resultados">Resultados</a><a href="#contato">Contato</a><a class="btn blue" href="#diagnostico">Falar com especialista</a></nav>
  </header>
  <section class="container hero">
    <div>
      <div class="eyebrow">Assessoria para farmacias</div>
      <h1>Mais visibilidade. Mais clientes. Mais vendas para <span>sua farmacia.</span></h1>
      <p class="lead-text">Estrategias de marketing feitas para farmacias que querem atrair clientes todos os dias, vender mais no balcao e no digital e se tornar referencia na regiao.</p>
      <div class="checks"><div><span class="check">✓</span>Atraia novos clientes todos os dias</div><div><span class="check">✓</span>Aumente vendas com trafego qualificado</div><div><span class="check">✓</span>Fortaleca sua marca e fidelize clientes</div></div>
      <a class="btn blue" href="#diagnostico">Quero uma analise gratuita</a>
    </div>
    <div class="visual"><div class="circle"></div><div class="bubble b1"></div><div class="bubble b2"></div><div class="bubble b3"></div><div class="hero-img"><img src="${hero}" alt="Farmaceutica representando crescimento para farmacias"></div></div>
  </section>
  <section id="diagnostico" class="container leadbox">
    <div><h2>Quero mais clientes para minha farmacia!</h2><p>Preencha os dados e receba uma analise gratuita do marketing atual da sua farmacia.</p><div class="checks"><div><span class="check">✓</span>Analise personalizada</div><div><span class="check">✓</span>Plano de acao estrategico</div><div><span class="check">✓</span>Sem compromisso</div></div></div>
    <div>${form(slug, "Quero minha analise gratuita")}</div>
  </section>
  <section id="resultados" class="container stats"><div class="stat"><b>+150</b>farmacias atendidas</div><div class="stat"><b>+250%</b>aumento medio de trafego</div><div class="stat"><b>+80%</b>crescimento nas vendas</div><div class="stat"><b>100%</b>focado em farmacias</div></section>
  <section id="servicos" class="container section"><h2>Sua farmacia pode ser a proxima historia de sucesso.</h2><div class="cards"><div class="card"><h3>Trafego Pago</h3><p>Campanhas para atrair pessoas proximas procurando medicamentos, dermocosmeticos e servicos farmaceuticos.</p></div><div class="card"><h3>Redes Sociais</h3><p>Conteudo que educa, gera confianca e transforma seguidores em clientes recorrentes.</p></div><div class="card"><h3>Posicionamento Local</h3><p>Estrategia para sua farmacia ser lembrada antes da concorrencia no bairro e na cidade.</p></div></div></section>
  <section id="contato" class="container footercta"><div><h2>Pronto para vender mais?</h2><p>Fale agora com um especialista e descubra o plano ideal para sua farmacia.</p></div><a class="btn blue" href="#diagnostico">Falar com especialista</a></section>
  ${tgaQuizScript(slug)}
</main>`;
}

function pageEscuro({ logoDark, hero, slug }) {
  return `${css}
<main class="page dark">
  <header class="container nav">
    <img class="logo dark-logo" src="${logoDark}" alt="TGA Marketing para Farmacias">
    <nav class="menu"><a href="#servicos">Servicos</a><a href="#resultados">Resultados</a><a href="#cases">Cases</a><a class="btn glow" href="#form">Quero mais clientes</a></nav>
  </header>
  <section class="container hero">
    <div>
      <span class="pill">Marketing que vende todos os dias</span>
      <h1>Atraimos. Conectamos. Convertemos. Multiplicamos resultados <span>para farmacias.</span></h1>
      <p class="lead-text">Uma assessoria completa para farmacias que querem parar de depender apenas do movimento da rua e criar uma maquina previsivel de captacao de clientes.</p>
      <div class="icons"><div class="icon"><b>Trafego</b>Pago</div><div class="icon"><b>Gestao</b>Redes sociais</div><div class="icon"><b>Conteudo</b>Que converte</div><div class="icon"><b>Plano</b>Comercial</div></div>
    </div>
    <div class="visual"><div class="hero-img"><img src="${hero}" alt="Capsula luminosa representando tecnologia para farmacias"></div></div>
  </section>
  <section id="form" class="container lead-dark">
    <div><h2>Receba uma analise gratuita e descubra como levar mais clientes para <span class="accent">a sua farmacia.</span></h2><p>Preencha o formulario e fale com um especialista ainda hoje.</p></div>
    <div>${form(slug, "Quero mais clientes", "dark")}</div>
  </section>
  <section id="resultados" class="container bar"><div><b>+150</b>farmacias atendidas</div><div><b>+300%</b>aumento medio de trafego</div><div><b>+90%</b>crescimento nas vendas</div><div><b>100%</b>especialistas em farmacias</div></section>
  <section id="cases" class="container section"><h2>Cases que comprovam nosso impacto</h2><div class="casegrid"><div class="case"><h3>Drogaria Bem Estar</h3><strong>+180%</strong><p>de aumento no faturamento em campanhas locais.</p></div><div class="case"><h3>Farmacia Popular</h3><strong>+250%</strong><p>de trafego no perfil e mais conversas no WhatsApp.</p></div></div></section>
  <section id="servicos" class="container section"><h2>O que fazemos pela sua farmacia</h2><div class="cards"><div class="card"><h3>Trafego Pago</h3><p>Campanhas locais para gerar conversas qualificadas.</p></div><div class="card"><h3>Redes Sociais</h3><p>Conteudo profissional para atrair e converter.</p></div><div class="card"><h3>Plano Comercial</h3><p>Oferta, calendario e rotina para vender todos os dias.</p></div></div></section>
  <footer class="container footer"><div><h2>Nao deixe sua concorrencia na frente.</h2><p>Vamos posicionar sua farmacia no lugar que ela merece.</p></div><a href="#form" class="btn glow">Falar com especialista</a></footer>
  ${tgaQuizScript(slug)}
</main>`;
}

function pageDireta({ logo, hero, slug }) {
  return `${css}
<main class="page light">
  <header class="container nav">
    <img class="logo" src="${logo}" alt="TGA Marketing para Farmacias">
    <nav class="menu"><a href="#servicos">Servicos</a><a href="#prova">Prova</a><a href="#contato">Contato</a><a href="#lead" class="btn">Quero vender mais</a></nav>
  </header>
  <section class="container hero">
    <div>
      <h1>Marketing que transforma farmacias em <span>referencia na regiao.</span></h1>
      <p class="lead-text">Estrategias personalizadas para atrair, engajar e fidelizar clientes, aumentando suas vendas todos os dias.</p>
      <div class="mini"><div><b>Mais visibilidade</b>para sua marca</div><div><b>Mais clientes</b>na loja hoje</div><div><b>Mais vendas</b>todos os dias</div></div>
    </div>
    <div class="visual"><div class="blob"></div><div class="bubble b1"></div><div class="bubble b3"></div><div class="hero-img"><img src="${hero}" alt="Farmaceutico representando autoridade regional"></div></div>
  </section>
  <section id="lead" class="container strip">
    <div><h2>Quero uma farmacia mais visivel e com mais clientes!</h2><p>Preencha ao lado e receba uma proposta personalizada para o seu negocio.</p><div class="checks"><div><span class="check">✓</span>Diagnostico gratuito</div><div><span class="check">✓</span>Plano estrategico</div><div><span class="check">✓</span>Sem compromisso</div></div></div>
    <div>${form(slug, "Quero vender mais")}</div>
  </section>
  <section id="servicos" class="container services"><h2>O que fazemos pela sua farmacia</h2><div class="grid"><div class="service"><div class="ico">✓</div><h3>Trafego Pago</h3><p>Campanhas locais para gerar chamadas, rotas e conversas no WhatsApp.</p></div><div class="service"><div class="ico">↗</div><h3>Gestao de Redes</h3><p>Conteudo profissional que conecta, vende e cria confianca.</p></div><div class="service"><div class="ico">#</div><h3>Conteudo Estrategico</h3><p>Posts e ofertas que posicionam sua farmacia como escolha obvia.</p></div><div class="service"><div class="ico">R$</div><h3>Planejamento</h3><p>Acoes comerciais para calendario sazonal, ofertas e recorrencia.</p></div></div></section>
  <section id="prova" class="container logos"><h3>Confianca de quem ja transformou resultados</h3><p>Drogaria Bem Estar • Drogaria Saude • Farmacia Popular • Farma Vida+</p></section>
  <section id="contato" class="container cta"><div><h2>Sua farmacia pode vender mais. Vamos criar essa historia juntos?</h2><p>Fale agora com um especialista.</p></div><a href="#lead" class="btn blue">Falar com especialista</a></section>
  ${tgaQuizScript(slug)}
</main>`;
}

async function main() {
  await Promise.all([fs.access(LOGO_WIDE), fs.access(LOGO_INSTA), fs.access(HERO_FEMALE), fs.access(HERO_MALE), fs.access(HERO_CAPSULE)]);
  const { logo, logoDark, heroFemale, heroMale, heroCapsule } = STATIC_ASSETS;

  const organization = await prisma.organization.findUnique({ where: { id: ORG_ID }, select: { id: true } });
  if (!organization) throw new Error(`Organizacao TGA nao encontrada: ${ORG_ID}`);

  const pages = [
    {
      name: "TGA Farmacias - Mais visibilidade",
      slug: "tga-farmacias-mais-visibilidade",
      metaTitle: "Mais visibilidade para sua farmacia | TGA Marketing",
      metaDescription: "Landing page clara para farmacias com foco em visibilidade, clientes e vendas.",
      content: pageClaro({ logo, hero: heroFemale, slug: "tga-farmacias-mais-visibilidade" }),
    },
    {
      name: "TGA Farmacias - Atraimos Conectamos",
      slug: "tga-farmacias-atraimos-conectamos",
      metaTitle: "Atraimos, conectamos e convertemos | TGA Marketing",
      metaDescription: "Landing page premium escura para captacao de clientes para farmacias.",
      content: pageEscuro({ logoDark, hero: heroCapsule, slug: "tga-farmacias-atraimos-conectamos" }),
    },
    {
      name: "TGA Farmacias - Referencia na regiao",
      slug: "tga-farmacias-referencia-regiao",
      metaTitle: "Farmacia referencia na regiao | TGA Marketing",
      metaDescription: "Landing page de conversao direta para farmacias venderem mais.",
      content: pageDireta({ logo, hero: heroMale, slug: "tga-farmacias-referencia-regiao" }),
    },
  ];

  const saved = [];
  for (const page of pages) {
    const record = await prisma.landingPage.upsert({
      where: { slug: page.slug },
      create: {
        name: page.name,
        slug: page.slug,
        organizationId: organization.id,
        status: "published",
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        publishedAt: new Date(),
        theme: { primaryColor: "#08aeea", secondaryColor: "#050638", source: "tga-attached-html-mobile" },
      },
      update: {
        name: page.name,
        organizationId: organization.id,
        status: "published",
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        sections: null,
        heroImage: null,
        publishedAt: new Date(),
        theme: { primaryColor: "#08aeea", secondaryColor: "#050638", source: "tga-attached-html-mobile" },
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
