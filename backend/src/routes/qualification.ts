import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  submitQualification,
  getQualificationFormPublic,
  listQualificationForms,
  listSubmissions,
  scheduleQualification,
  getTeamAvailability,
  enrollQualificationInFunnel,
} from "../services/qualificationService.js";
import { generateQualificationFormWithGroq } from "../services/qualificationAiGenerator.js";

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRequestOrigin(req: Request) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}`;
}

function buildQualificationPublicUrl(req: Request, formId: string) {
  const url = new URL(`/qualification/${formId}`, getRequestOrigin(req));
  url.searchParams.set("utm_source", "nexus");
  url.searchParams.set("utm_medium", "qualification_form");
  url.searchParams.set("utm_campaign", `qualificacao_${formId.slice(0, 8)}`);
  return url.toString();
}

function safeJsonForHtml(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeJsString(text: string) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, "\\n")
    .replace(/</g, "\\u003c");
}

export function qualificationPublicRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/public/forms/:id", async (req, res, next) => {
    try {
      const form = await getQualificationFormPublic(prisma, req.params.id);
      if (!form) return res.status(404).json({ error: "Formulário não encontrado" });
      res.json({ success: true, form: { ...form, publicUrl: buildQualificationPublicUrl(req, form.id) } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/forms/:id/submit", async (req, res, next) => {
    try {
      const { name, email, phone, notes, answers, tracking } = req.body;
      if (!name || !email || !answers) {
        return res.status(400).json({ error: "name, email e answers são obrigatórios" });
      }
      const result = await submitQualification(prisma, req.params.id, {
        name,
        email,
        phone,
        notes,
        answers,
        tracking: {
          ...(tracking && typeof tracking === "object" ? tracking : {}),
          ip: req.ip,
          userAgent: req.get("user-agent") || "",
        },
      });
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar formulário" });
    }
  });

  return router;
}

export function qualificationPublicPageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/qualification/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await getQualificationFormPublic(prisma, req.params.id);
      if (!form) return res.status(404).send("Formulario nao encontrado");

      const fieldsJson = safeJsonForHtml(form.icpFields || []);
      const apiUrl = escapeJsString(getRequestOrigin(req));
      const formId = escapeJsString(form.id);
      const title = escapeHtml(form.name);
      const description = escapeHtml(form.description || "Responda para sabermos se conseguimos ajudar agora.");
      const successMessage = escapeHtml(form.schedulingMessage || "Recebemos suas respostas. Nosso time vai analisar e retornar em breve.");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh;padding:32px 16px;display:flex;align-items:center;justify-content:center}
    .shell{width:100%;max-width:760px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:28px;box-shadow:0 24px 70px rgba(15,23,42,.12);overflow:hidden}
    .hero{padding:34px 34px 26px;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff}
    .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:#ddd6fe;margin-bottom:12px}
    h1{font-size:34px;line-height:1.05;letter-spacing:-.04em;margin:0 0 12px;font-weight:900}
    .hero p{font-size:15px;line-height:1.65;color:#ede9fe;margin:0;max-width:620px}
    form{padding:30px 34px 34px;display:grid;gap:18px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .field{display:grid;gap:7px}
    .field.full{grid-column:1/-1}
    label{font-size:12px;font-weight:800;color:#334155}
    input,textarea,select{width:100%;border:1px solid #dbe3ef;border-radius:14px;padding:13px 14px;font:inherit;font-size:14px;color:#0f172a;outline:none;background:#fff;transition:border-color .2s,box-shadow .2s}
    textarea{min-height:104px;resize:vertical}
    input:focus,textarea:focus,select:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.1)}
    .options{display:grid;gap:8px}
    .option{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:14px;padding:12px 13px;font-size:14px;font-weight:650;color:#334155;cursor:pointer}
    .option input{width:16px;height:16px;padding:0}
    .help{font-size:12px;color:#64748b;line-height:1.5}
    .actions{display:flex;align-items:center;gap:12px;margin-top:4px;flex-wrap:wrap}
    button{border:0;border-radius:16px;background:#6d28d9;color:#fff;font-size:15px;font-weight:900;padding:15px 22px;cursor:pointer;box-shadow:0 16px 30px rgba(109,40,217,.22)}
    button:disabled{opacity:.55;cursor:not-allowed}
    .status{font-size:13px;font-weight:700;color:#64748b}
    .success{padding:26px 34px 34px;display:none}
    .success.visible{display:block}
    .success-box{border-radius:22px;background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;padding:22px}
    .success-box h2{margin:0 0 8px;font-size:24px;letter-spacing:-.03em}
    .success-box p{margin:0;line-height:1.6}
    .error{display:none;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:700}
    .error.visible{display:block}
    @media(max-width:640px){body{padding:0;background:#fff}.card{border-radius:0;border:0;box-shadow:none}.hero,form,.success{padding-left:22px;padding-right:22px}.grid{grid-template-columns:1fr}h1{font-size:28px}}
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <header class="hero">
        <div class="eyebrow">Qualificacao Nexus360</div>
        <h1>${title}</h1>
        <p>${description}</p>
      </header>
      <form id="qualification-form">
        <div class="grid">
          <div class="field">
            <label for="lead-name">Nome completo *</label>
            <input id="lead-name" name="name" autocomplete="name" required />
          </div>
          <div class="field">
            <label for="lead-email">Email *</label>
            <input id="lead-email" name="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="lead-phone">Telefone/WhatsApp</label>
            <input id="lead-phone" name="phone" autocomplete="tel" />
          </div>
        </div>
        <div id="dynamic-fields" class="grid"></div>
        <div class="field full">
          <label for="lead-notes">Observacoes</label>
          <textarea id="lead-notes" name="notes" placeholder="Conte qualquer contexto importante para o time comercial."></textarea>
        </div>
        <div class="error" id="error-box"></div>
        <div class="actions">
          <button id="submit-btn" type="submit">Enviar qualificacao</button>
          <span class="status" id="status-text">Leva menos de 2 minutos.</span>
        </div>
        <p class="help">Ao enviar, seus dados serao usados para avaliar aderencia e contato comercial. Parametros de origem da campanha sao registrados para rastreamento.</p>
      </form>
      <div class="success" id="success-screen">
        <div class="success-box">
          <h2>Formulario enviado!</h2>
          <p>${successMessage}</p>
        </div>
      </div>
    </section>
  </main>
  <script>
    const FORM_ID = '${formId}';
    const API_URL = '${apiUrl}';
    const FIELDS = ${fieldsJson};

    const params = new URLSearchParams(window.location.search);
    const tracking = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      referrer: document.referrer || '',
      landingUrl: window.location.href,
      path: window.location.pathname
    };

    function esc(value) {
      return String(value || '').replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
    }

    function fieldTemplate(field) {
      const required = field.required ? 'required' : '';
      const full = field.type === 'textarea' || field.type === 'multi_select' ? ' full' : '';
      const label = '<label>' + esc(field.label) + (field.required ? ' *' : '') + '</label>';
      if (field.type === 'textarea') {
        return '<div class="field' + full + '">' + label + '<textarea data-key="' + esc(field.key) + '" ' + required + '></textarea></div>';
      }
      if (field.type === 'select') {
        return '<div class="field' + full + '">' + label + '<select data-key="' + esc(field.key) + '" ' + required + '><option value="">Selecione...</option>' + (field.options || []).map(function(option) { return '<option value="' + esc(option) + '">' + esc(option) + '</option>'; }).join('') + '</select></div>';
      }
      if (field.type === 'multi_select') {
        return '<div class="field' + full + '">' + label + '<div class="options">' + (field.options || []).map(function(option) { return '<label class="option"><input type="checkbox" data-key="' + esc(field.key) + '" value="' + esc(option) + '" />' + esc(option) + '</label>'; }).join('') + '</div></div>';
      }
      if (field.type === 'boolean') {
        return '<div class="field' + full + '">' + label + '<label class="option"><input type="checkbox" data-key="' + esc(field.key) + '" /> Sim</label></div>';
      }
      const inputType = field.type === 'number' ? 'number' : 'text';
      return '<div class="field' + full + '">' + label + '<input type="' + inputType + '" data-key="' + esc(field.key) + '" ' + required + ' /></div>';
    }

    function collectAnswers() {
      const answers = {};
      FIELDS.forEach(function(field) {
        if (field.type === 'multi_select') {
          answers[field.key] = Array.from(document.querySelectorAll('[data-key="' + field.key + '"]:checked')).map(function(input) { return input.value; });
        } else if (field.type === 'boolean') {
          const input = document.querySelector('[data-key="' + field.key + '"]');
          answers[field.key] = Boolean(input && input.checked);
        } else {
          const input = document.querySelector('[data-key="' + field.key + '"]');
          const value = input ? input.value : '';
          answers[field.key] = field.type === 'number' && value !== '' ? Number(value) : value;
        }
      });
      return answers;
    }

    document.getElementById('dynamic-fields').innerHTML = FIELDS.map(fieldTemplate).join('');

    document.getElementById('qualification-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const submitBtn = document.getElementById('submit-btn');
      const statusText = document.getElementById('status-text');
      const errorBox = document.getElementById('error-box');
      errorBox.classList.remove('visible');
      submitBtn.disabled = true;
      statusText.textContent = 'Enviando...';

      try {
        const formData = new FormData(form);
        const body = {
          name: formData.get('name') || '',
          email: formData.get('email') || '',
          phone: formData.get('phone') || '',
          notes: formData.get('notes') || '',
          answers: collectAnswers(),
          tracking
        };
        const response = await fetch(API_URL + '/api/qualification/public/forms/' + FORM_ID + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) throw new Error(result.error || 'Nao foi possivel enviar o formulario.');
        form.style.display = 'none';
        document.getElementById('success-screen').classList.add('visible');
      } catch (error) {
        errorBox.textContent = error.message || 'Erro ao enviar.';
        errorBox.classList.add('visible');
        submitBtn.disabled = false;
        statusText.textContent = 'Tente novamente em instantes.';
      }
    });
  </script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8").send(html);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function qualificationRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/forms", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const forms = await listQualificationForms(prisma, orgId);
      res.json({
        success: true,
        forms: forms.map((form) => ({
          ...form,
          publicUrl: buildQualificationPublicUrl(req, form.id),
        })),
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return res.json({ success: true, forms: [] });
      }
      next(error);
    }
  });

  router.post("/forms/generate-ai", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const form = await generateQualificationFormWithGroq(prisma, orgId, req.body);
      res.json({ success: true, form });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao gerar formulario com IA" });
    }
  });

  router.get("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const form = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { _count: { select: { submissions: true } } },
      });
      if (!form) return res.status(404).json({ error: "Formulário não encontrado" });
      res.json({ success: true, form: { ...form, publicUrl: buildQualificationPublicUrl(req, form.id) } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/forms", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { name, description, icpFields, routingRules, allowScheduling, schedulingMessage, schedulingLeadTime, createLead, leadPipelineId, leadStageId, createFunnelLead, funnelId } = req.body;
      if (!name || !icpFields) {
        return res.status(400).json({ error: "name e icpFields são obrigatórios" });
      }
      const form = await prisma.qualificationForm.create({
        data: {
          organizationId: orgId,
          name,
          description: description || null,
          icpFields: icpFields as any,
          routingRules: routingRules || null,
          allowScheduling: allowScheduling !== false,
          schedulingMessage: schedulingMessage || null,
          schedulingLeadTime: schedulingLeadTime || 60,
          createLead: createLead !== false,
          leadPipelineId: leadPipelineId || null,
          leadStageId: leadStageId || null,
          createFunnelLead: createFunnelLead === true,
          funnelId: funnelId || null,
        },
      });
      res.status(201).json({ success: true, form, publicUrl: buildQualificationPublicUrl(req, form.id) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Formulário não encontrado" });

      const { name, description, icpFields, routingRules, allowScheduling, schedulingMessage, schedulingLeadTime, isActive, createLead, leadPipelineId, leadStageId, createFunnelLead, funnelId } = req.body;
      const form = await prisma.qualificationForm.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(icpFields !== undefined && { icpFields: icpFields as any }),
          ...(routingRules !== undefined && { routingRules: routingRules as any }),
          ...(allowScheduling !== undefined && { allowScheduling }),
          ...(schedulingMessage !== undefined && { schedulingMessage }),
          ...(schedulingLeadTime !== undefined && { schedulingLeadTime }),
          ...(isActive !== undefined && { isActive }),
          ...(createLead !== undefined && { createLead }),
          ...(leadPipelineId !== undefined && { leadPipelineId }),
          ...(leadStageId !== undefined && { leadStageId }),
          ...(createFunnelLead !== undefined && { createFunnelLead }),
          ...(funnelId !== undefined && { funnelId }),
        },
      });
      res.json({ success: true, form, publicUrl: buildQualificationPublicUrl(req, form.id) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Formulário não encontrado" });
      await prisma.qualificationForm.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Formulário removido" });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { status, formId, routedTo } = req.query as any;
      const submissions = await listSubmissions(prisma, orgId, { status, formId, routedTo });
      res.json({ success: true, submissions });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { form: { select: { name: true, icpFields: true } } },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });
      res.json({ success: true, submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/approve", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { routedTo, routedToUserId } = req.body;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const updated = await prisma.qualificationSubmission.update({
        where: { id: req.params.id },
        data: {
          status: "approved",
          ...(routedTo && { routedTo, routedToUserId: routedToUserId || null, routedAt: new Date(), routeReason: "Aprovação manual" }),
        },
      });
      res.json({ success: true, submission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/reject", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { reason } = req.body;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const updated = await prisma.qualificationSubmission.update({
        where: { id: req.params.id },
        data: { status: "rejected", routeReason: reason || "Reprovado manualmente" },
      });
      res.json({ success: true, submission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/schedule", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { scheduledTo, notes } = req.body;
      if (!scheduledTo) return res.status(400).json({ error: "scheduledTo é obrigatório" });

      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const result = await scheduleQualification(prisma, req.params.id, {
        scheduledTo,
        notes,
        userId: req.user?.id,
      });
      res.json({ success: true, submission: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao agendar" });
    }
  });

  router.post("/submissions/:id/enroll-funnel", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { funnelId } = req.body;
      const result = await enrollQualificationInFunnel(prisma, orgId, req.params.id, funnelId || "default");
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar ao funil" });
    }
  });

  router.get("/team", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const availability = await getTeamAvailability(prisma, orgId);
      res.json({ success: true, ...availability });
    } catch (error) {
      next(error);
    }
  });

  router.get("/team/users", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const users = await prisma.user.findMany({
        where: { organizationId: orgId, department: { in: ["SDR", "BDR", "CLOSER"] }, status: "ACTIVE" },
        select: { id: true, name: true, email: true, department: true },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, users });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
