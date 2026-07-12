import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { generateQuizWithAi } from "../services/quizGenerator.js";
import { runGovernedAiText } from "../services/aiExecution.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ==================== PUBLIC ROUTES ====================

export function quizPublicRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/quiz/:slug", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { slug: req.params.slug },
        include: { questions: { orderBy: { order: "asc" } } },
      });

      if (!quiz || quiz.status !== "published" || !quiz.isActive) {
        return res.status(404).json({ error: "Quiz não encontrado" });
      }

      const tracking = (quiz.tracking as any) || {};
      const gaId = tracking?.gaId || "";
      const pixelId = tracking?.pixelId || "";
      const leadCapture = (quiz.leadCapture as any) || { fields: ["name", "email"] };

      const gaScript = gaId ? `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());
          gtag('config','${gaId}');
          gtag('event','quiz_view',{'quiz_id':'${quiz.id}','quiz_name':'${quiz.name}'});
        </script>` : "";

      const pixelScript = pixelId ? `
        <script>
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');
          fbq('track','PageView');
          fbq('track','ViewContent',{content_type:'quiz',content_id:'${quiz.id}'});
        </script>` : "";

      const questionsJson = escapeHtml(JSON.stringify(quiz.questions));
      const leadCaptureJson = escapeHtml(JSON.stringify(leadCapture));
      const apiUrl = `${req.protocol}://${req.get("host")}`;

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escHtml(quiz.metaTitle || quiz.name)}</title>
  <meta name="description" content="${escHtml(quiz.metaDescription || quiz.description || "")}" />
  <meta property="og:title" content="${escHtml(quiz.metaTitle || quiz.name)}" />
  <meta property="og:description" content="${escHtml(quiz.metaDescription || "")}" />
  ${quiz.metaImage ? `<meta property="og:image" content="${escHtml(quiz.metaImage)}" />` : ""}
  <meta property="og:type" content="website" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  ${gaScript}
  ${pixelScript}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .quiz-container{background:#fff;border-radius:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);width:100%;max-width:640px;padding:48px;position:relative;overflow:hidden}
    .quiz-bg{position:absolute;top:-50%;right:-50%;width:100%;height:100%;background:radial-gradient(circle at top right,rgba(59,130,246,.08),transparent 70%);pointer-events:none}
    .quiz-header{display:flex;align-items:center;gap:12px;margin-bottom:40px}
    .quiz-logo{width:44px;height:44px;background:#3b82f6;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900}
    .quiz-title{font-size:13px;font-weight:700;color:#0f172a;letter-spacing:-.01em}
    .quiz-brand{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
    .progress-bar{height:4px;background:#e2e8f0;border-radius:4px;margin-bottom:48px;overflow:hidden}
    .progress-fill{height:100%;background:#3b82f6;border-radius:4px;transition:width .6s cubic-bezier(.22,1,.36,1);width:0%}
    .step-label{font-size:12px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
    .question-text{font-size:28px;font-weight:800;line-height:1.2;letter-spacing:-.02em;margin-bottom:36px;color:#0f172a}
    .options{display:flex;flex-direction:column;gap:12px}
    .option-btn{display:flex;align-items:center;gap:16px;width:100%;padding:20px 24px;border:2px solid #e2e8f0;border-radius:16px;background:#fff;cursor:pointer;transition:all .2s;font-size:16px;font-weight:600;color:#0f172a;text-align:left;font-family:inherit}
    .option-btn:hover{border-color:#93c5fd;background:#f8fafc}
    .option-btn.selected{border-color:#3b82f6;background:#eff6ff;box-shadow:0 4px 12px rgba(59,130,246,.15)}
    .option-letter{width:36px;height:36px;border-radius:10px;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#94a3b8;flex-shrink:0;transition:all .2s}
    .option-btn.selected .option-letter{background:#3b82f6;border-color:#3b82f6;color:#fff}
    .option-check{width:24px;height:24px;border-radius:50%;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;margin-left:auto;flex-shrink:0;transition:all .2s;font-size:12px;color:#fff}
    .option-btn.selected .option-check{background:#3b82f6;border-color:#3b82f6}
    .text-input{width:100%;padding:20px 24px;border:2px solid #e2e8f0;border-radius:16px;font-size:18px;font-weight:600;outline:none;transition:all .2s;font-family:inherit;background:#fff}
    .text-input:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.1)}
    .text-input::placeholder{color:#94a3b8;font-weight:400}
    .rating-grid{display:flex;gap:8px;flex-wrap:wrap}
    .rating-btn{width:56px;height:56px;border-radius:16px;border:2px solid #e2e8f0;background:#fff;cursor:pointer;font-size:20px;font-weight:800;color:#94a3b8;transition:all .2s;font-family:inherit}
    .rating-btn:hover{border-color:#93c5fd;color:#3b82f6}
    .rating-btn.selected{background:#3b82f6;border-color:#3b82f6;color:#fff;box-shadow:0 4px 12px rgba(59,130,246,.3)}
    .nav-buttons{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid #f1f5f9}
    .btn-back{background:none;border:none;cursor:pointer;font-size:14px;font-weight:700;color:#94a3b8;font-family:inherit;padding:12px 0;transition:color .2s}
    .btn-back:hover{color:#475569}
    .btn-next{padding:16px 32px;background:#0f172a;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit}
    .btn-next:hover{background:#1e293b}
    .btn-next:disabled{opacity:.3;cursor:not-allowed}
    .btn-submit{padding:16px 40px;background:#059669;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit}
    .btn-submit:hover{background:#047857}
    .btn-submit:disabled{opacity:.3;cursor:not-allowed}
    .result-screen{text-align:center;padding:20px 0}
    .result-icon{width:80px;height:80px;border-radius:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:40px}
    .result-icon.success{background:#d1fae5;color:#059669}
    .result-icon.fail{background:#fee2e2;color:#dc2626}
    .result-title{font-size:28px;font-weight:800;margin-bottom:8px;letter-spacing:-.02em}
    .result-text{color:#64748b;font-size:16px;line-height:1.6;margin-bottom:8px}
    .result-score{font-size:48px;font-weight:900;color:#3b82f6;margin:16px 0}
    .result-label{font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
    .step-indicator{display:flex;gap:8px;margin-bottom:40px;justify-content:center}
    .step-dot{width:8px;height:8px;border-radius:50%;background:#e2e8f0;transition:all .3s}
    .step-dot.active{background:#3b82f6;width:24px;border-radius:4px}
    .step-dot.done{background:#93c5fd}
    .slide{animation:slideIn .35s ease-out}
    @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .pulse{animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  </style>
</head>
<body>
  <div class="quiz-container">
    <div class="quiz-bg"></div>
    <div id="app"></div>
  </div>

  <script>
    const QUESTIONS = ${questionsJson};
    const LEAD_CAPTURE = ${leadCaptureJson};
    const QUIZ_ID = '${quiz.id}';
    const QUIZ_NAME = '${escHtml(quiz.name)}';
    const API_URL = '${apiUrl}';
    const QUIZ_SLUG = '${quiz.slug}';
    const PASS_SCORE = ${quiz.passScore || 0};

    // UTM params
    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      content: params.get('utm_content') || '',
      term: params.get('utm_term') || '',
    };

    let state = { step: -1, answers: {}, contact: {} };
    const totalSteps = QUESTIONS.length;

    function render() {
      const app = document.getElementById('app');
      if (state.step === -2) return renderResult(app);
      if (state.step === -1) return renderIntro(app);
      return renderQuestion(app);
    }

    function renderIntro(container) {
      container.innerHTML = \`
        <div class="quiz-header">
          <div class="quiz-logo">Q</div>
          <div>
            <div class="quiz-title">\${QUIZ_NAME}</div>
            <div class="quiz-brand">Qualificação Nexus360</div>
          </div>
        </div>
        <div class="slide" style="text-align:center;padding:20px 0">
          <div style="font-size:48px;margin-bottom:24px">📋</div>
          <h1 style="font-size:32px;font-weight:900;letter-spacing:-.03em;margin-bottom:12px">\${QUIZ_NAME}</h1>
          <p style="color:#64748b;font-size:16px;line-height:1.6;margin-bottom:32px">Responda algumas perguntas rápidas para que possamos entender melhor seu perfil.</p>
          <button onclick="startQuiz()" style="padding:18px 48px;background:#0f172a;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">Começar Quiz</button>
          <p style="margin-top:16px;font-size:12px;color:#94a3b8">Leva menos de 2 minutos</p>
        </div>
      \`;
    }

    function renderQuestion(container) {
      const q = QUESTIONS[state.step];
      const progress = ((state.step) / totalSteps) * 100;
      const isLast = state.step === totalSteps - 1;

      let inputHtml = '';
      if (q.type === 'multiple_choice' && q.options) {
        inputHtml = '<div class="options">' + q.options.map((opt, i) => \`
          <button class="option-btn \${state.answers[q.id] === opt ? 'selected' : ''}" onclick="selectOption('\${q.id}','\${escJsStr(opt)}')">
            <span class="option-letter">\${String.fromCharCode(65 + i)}</span>
            <span>\${opt}</span>
            <span class="option-check">\${state.answers[q.id] === opt ? '✓' : ''}</span>
          </button>
        \`).join('') + '</div>';
      } else if (q.type === 'rating') {
        const max = Array.isArray(q.options) ? parseInt(q.options[0]) : 5;
        inputHtml = '<div class="rating-grid">' + Array.from({length: max}, (_, i) => i + 1).map(v => \`
          <button class="rating-btn \${state.answers[q.id] === v ? 'selected' : ''}" onclick="selectRating('\${q.id}',\${v})">\${v}</button>
        \`).join('') + '</div>';
      } else if (q.type === 'email' || q.type === 'phone') {
        inputHtml = \`
          <input class="text-input" type="\${q.type}" placeholder="\${q.type === 'email' ? 'seu@email.com' : '(00) 00000-0000'}" 
            value="\${state.answers[q.id] || ''}" oninput="updateText('\${q.id}',this.value)" autofocus />
        \`;
      } else {
        inputHtml = \`
          <input class="text-input" type="text" placeholder="Digite sua resposta..." 
            value="\${state.answers[q.id] || ''}" oninput="updateText('\${q.id}',this.value)" autofocus />
        \`;
      }

      container.innerHTML = \`
        <div class="progress-bar"><div class="progress-fill" style="width:\${progress}%"></div></div>
        <div class="step-indicator">\${QUESTIONS.map((_, i) => \`
          <div class="step-dot \${i === state.step ? 'active' : ''} \${i < state.step || state.answers[QUESTIONS[i]?.id] ? 'done' : ''}"></div>
        \`).join('')}</div>
        <div class="slide">
          <div class="step-label">Passo \${state.step + 1} de \${totalSteps}</div>
          <div class="question-text">\${q.text}</div>
          \${inputHtml}
          <div class="nav-buttons">
            <button class="btn-back" onclick="prevStep()">← Voltar</button>
            \${isLast 
              ? '<button class="btn-submit" onclick="submitQuiz()" \${!state.answers[q.id] && q.required ? 'disabled' : ''}>Enviar →</button>'
              : '<button class="btn-next" onclick="nextStep()" \${!state.answers[q.id] && q.required ? 'disabled' : ''}>Próxima →</button>'
            }
          </div>
        </div>
      \`;
    }

    function renderResult(container) {
      const score = calculateScore();
      const qualified = PASS_SCORE > 0 ? score.percentage >= PASS_SCORE : true;
      container.innerHTML = \`
        <div class="slide result-screen">
          <div class="result-icon \${qualified ? 'success' : 'fail'}">\${qualified ? '✓' : '✕'}</div>
          <div class="result-title">\${qualified ? 'Obrigado!' : 'Obrigado pelo interesse!'}</div>
          <div class="result-text">\${qualified ? 'Recebemos suas respostas. Entraremos em contato em breve!' : 'Seu perfil não se encaixa no momento, mas agradecemos seu interesse.'}</div>
          <div class="result-label">Seu Score</div>
          <div class="result-score">\${score.percentage}%</div>
          <div class="result-text" style="font-size:14px">\${score.points} de \${score.maxPoints} pontos</div>
        </div>
      \`;
    }

    function calculateScore() {
      let points = 0, maxPoints = 0;
      QUESTIONS.forEach(q => {
        maxPoints += q.points || 1;
        if (state.answers[q.id]) points += q.points || 1;
      });
      return { points, maxPoints, percentage: maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0 };
    }

    function startQuiz() { state.step = 0; render(); }
    function nextStep() { if (state.step < totalSteps - 1) { state.step++; render(); } }
    function prevStep() { if (state.step > 0) { state.step--; render(); } else { state.step = -1; render(); } }
    function selectOption(qId, val) { state.answers[qId] = val; render(); setTimeout(() => { if (state.step < totalSteps - 1) nextStep(); else submitQuiz(); }, 400); }
    function selectRating(qId, val) { state.answers[qId] = val; render(); }
    function updateText(qId, val) { state.answers[qId] = val; render(); }

    async function submitQuiz() {
      const score = calculateScore();
      const qualified = PASS_SCORE > 0 ? score.percentage >= PASS_SCORE : true;

      // Collect contact info from answers
      const contact = { name: '', email: '', phone: '' };
      QUESTIONS.forEach((q, i) => {
        const val = state.answers[q.id] || '';
        if (q.type === 'email') contact.email = val;
        else if (q.type === 'phone') contact.phone = val;
        else if (i === totalSteps - 1 && q.type === 'text') contact.name = val;
      });

      // Try to find name from first question or text answers
      if (!contact.name) {
        for (const q of QUESTIONS) {
          const val = state.answers[q.id];
          if (val && q.type === 'text' && !contact.name) contact.name = val;
          if (val && q.type === 'multiple_choice' && q.text.toLowerCase().includes('nome')) contact.name = val;
        }
      }

      try {
        const res = await fetch(API_URL + '/api/quiz/' + QUIZ_SLUG + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: state.answers,
            score: score.points,
            maxScore: score.maxPoints,
            percentage: score.percentage,
            qualified,
            contactName: contact.name || 'Visitante',
            contactEmail: contact.email || '',
            contactPhone: contact.phone || '',
            utm
          })
        });

        if (res.ok) {
          \${pixelId ? \`if (window.fbq) { fbq('track','Lead',{content_name:QUIZ_NAME,content_id:QUIZ_ID}); }\` : ''}
          \${gaId ? \`if (window.gtag) { gtag('event','quiz_complete',{quiz_id:QUIZ_ID,quiz_name:QUIZ_NAME,score:score.percentage}); }\` : ''}
        }
      } catch(e) {
        console.error('Submit error', e);
      }

      state.step = -2;
      render();
    }

    render();
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/quiz/:slug/submit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { slug: req.params.slug },
      });

      if (!quiz || quiz.status !== "published" || !quiz.isActive) {
        return res.status(404).json({ error: "Quiz não encontrado" });
      }

      const { answers, score, maxScore, percentage, qualified, contactName, contactEmail, contactPhone, utm } = req.body;
      if (!answers) return res.status(400).json({ error: "Respostas são obrigatórias" });

      const submission = await prisma.quizSubmission.create({
        data: {
          quizId: quiz.id,
          answers,
          score: score ?? null,
          maxScore: maxScore ?? null,
          percentage: percentage ?? null,
          qualified: qualified ?? null,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          metadata: utm || undefined,
        },
      });

      // If lead info was provided, create/update lead
      if (contactEmail) {
        const existingLead = await prisma.lead.findFirst({
          where: { email: contactEmail, organizationId: quiz.organizationId },
        });
        const lead = existingLead
          ? await prisma.lead.update({
              where: { id: existingLead.id },
              data: {
                name: contactName || undefined,
                phone: contactPhone || undefined,
                score: percentage || undefined,
                temperature: percentage && percentage >= 70 ? "HOT" : percentage && percentage >= 40 ? "WARM" : "COLD",
                source: `quiz:${quiz.slug}`,
              },
            })
          : await prisma.lead.create({
              data: {
                name: contactName || "Visitante",
                email: contactEmail,
                phone: contactPhone || "",
                organizationId: quiz.organizationId,
                score: percentage || 0,
                temperature: percentage && percentage >= 70 ? "HOT" : "COLD",
                source: `quiz:${quiz.slug}`,
                status: qualified ? "qualificado" : "novo",
              },
            });

        await prisma.quizSubmission.update({
          where: { id: submission.id },
          data: { leadId: lead.id },
        });
      }

      res.json({ success: true, submissionId: submission.id, score: percentage, qualified });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// ==================== PROTECTED ROUTES ====================

export function quizRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/quizzes", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const quizzes = await prisma.quiz.findMany({
        where: { organizationId: orgId },
        include: {
          questions: { orderBy: { order: "asc" } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, quizzes });
    } catch (error) {
      next(error);
    }
  });

  router.get("/quizzes/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });
      res.json({ success: true, quiz });
    } catch (error) {
      next(error);
    }
  });

  router.post("/quizzes", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const { name, description, quizType, scoringType, passScore, tracking, leadCapture, metaTitle, metaDescription, metaImage } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

      let slug = slugify(name);
      const existing = await prisma.quiz.findUnique({ where: { slug } });
      if (existing) slug = slug + "-" + Date.now().toString(36);

      const quiz = await prisma.quiz.create({
        data: {
          name,
          slug,
          description,
          quizType: quizType || "qualification",
          scoringType: scoringType || "points",
          passScore: passScore || null,
          tracking: tracking || undefined,
          leadCapture: leadCapture || undefined,
          metaTitle: metaTitle || name,
          metaDescription,
          metaImage,
          organizationId: orgId,
        },
      });
      res.json({ success: true, quiz });
    } catch (error) {
      next(error);
    }
  });

  router.put("/quizzes/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const { name, description, quizType, scoringType, passScore, isActive, tracking, leadCapture, scoringRules, metaTitle, metaDescription, metaImage } = req.body;

      const existing = await prisma.quiz.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Quiz não encontrado" });

      let slug = existing.slug;
      if (name && name !== existing.name) {
        slug = slugify(name);
        const slugExists = await prisma.quiz.findUnique({ where: { slug, NOT: { id: req.params.id } } });
        if (slugExists) slug = slug + "-" + Date.now().toString(36);
      }

      const quiz = await prisma.quiz.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name, slug }),
          ...(description !== undefined && { description }),
          ...(quizType && { quizType }),
          ...(scoringType && { scoringType }),
          ...(passScore !== undefined && { passScore }),
          ...(isActive !== undefined && { isActive }),
          ...(tracking !== undefined && { tracking }),
          ...(leadCapture !== undefined && { leadCapture }),
          ...(scoringRules !== undefined && { scoringRules }),
          ...(metaTitle !== undefined && { metaTitle }),
          ...(metaDescription !== undefined && { metaDescription }),
          ...(metaImage !== undefined && { metaImage }),
        },
      });
      res.json({ success: true, quiz });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/quizzes/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.quiz.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Quiz não encontrado" });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== QUESTIONS ====================

  router.post("/quizzes/:id/questions", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, organizationId: req.user!.orgId } });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });

      const { questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "questions deve ser um array não vazio" });
      }

      // Delete existing and recreate
      await prisma.quizQuestion.deleteMany({ where: { quizId: req.params.id } });

      const created = await prisma.$transaction(
        questions.map((q: any, i: number) =>
          prisma.quizQuestion.create({
            data: {
              quizId: req.params.id,
              order: i,
              text: q.text,
              type: q.type || "multiple_choice",
              options: q.options || undefined,
              points: q.points || 1,
              required: q.required !== false,
            },
          })
        )
      );

      res.json({ success: true, questions: created });
    } catch (error) {
      next(error);
    }
  });

  // ==================== AI GENERATION ====================

  router.post("/quizzes/generate", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const generated = await generateQuizWithAi(prisma, orgId, req.body);
      res.json({ success: true, ...generated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao gerar quiz com IA" });
    }
  });

  // ==================== APPROVE & PUBLISH ====================

  router.post("/quizzes/:id/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        include: { questions: true },
      });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });
      if (quiz.questions.length === 0) return res.status(400).json({ error: "Adicione pelo menos uma pergunta antes de publicar" });

      const updated = await prisma.quiz.update({
        where: { id: req.params.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          isActive: true,
        },
      });

      const publicUrl = `${req.protocol}://${req.get("host")}/quiz/${quiz.slug}`;
      res.json({ success: true, quiz: updated, publicUrl });
    } catch (error) {
      next(error);
    }
  });

  // ==================== SUBMISSIONS ====================

  router.get("/quizzes/:id/submissions", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, startDate, endDate } = req.query;
      const where: any = {
        quizId: req.params.id,
        quiz: { organizationId: req.user!.orgId },
      };
      if (status === "qualified") where.qualified = true;
      else if (status === "unqualified") where.qualified = false;
      if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate as string) };
      if (endDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate as string) };

      const submissions = await prisma.quizSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const stats = {
        total: submissions.length,
        qualified: submissions.filter((s) => s.qualified).length,
        unqualified: submissions.filter((s) => s.qualified === false).length,
        avgScore: submissions.length > 0
          ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length)
          : 0,
      };

      res.json({ success: true, submissions, stats });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escHtml(text: string): string {
  return escapeHtml(String(text ?? ""));
}

function escJsStr(text: string): string {
  return String(text ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
