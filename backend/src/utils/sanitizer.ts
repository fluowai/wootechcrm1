/**
 * Whitelist de campos permitidos por recurso.
 * Impede que o cliente envie campos proibidos como organizationId, id, etc.
 */

const FORBIDDEN_FIELDS = [
  "id",
  "organizationId",
  "agencyId",
  "createdAt",
  "updatedAt",
  "deletedAt",
];

const LEAD_FIELDS = [
  "name", "email", "phone", "whatsapp", "cpf", "jobTitle",
  "birthDate", "status", "value", "tags", "source", "channel",
  "notes", "temperature", "score", "lgpdConsent", "lgpdDate",
  "assignedToId", "clientId", "pipelineId", "stageId", "workspaceId",
  "cnpj", "owners", "managementTeam", "aiDiagnosis",
];

const CLIENT_FIELDS = [
  "corporateName", "tradeName", "cnpj", "cpf", "email", "phone", "website",
  "address", "city", "state", "zipCode", "segment", "porte", "employees",
  "revenue", "responsibleName", "responsibleCpf", "responsibleEmail",
  "responsiblePhone", "responsibleRole", "status", "source", "sourceDetail",
  "portalAccess", "notes", "tags", "assignedToId",
];

const OPPORTUNITY_FIELDS = [
  "title", "description", "pipelineId", "stageId", "stage", "probability",
  "value", "estimatedValue", "expectedCloseDate", "closedAt", "status",
  "lostReason", "temperature", "score", "clientId", "assignedToId",
  "nextActionAt", "lastInteractionAt", "objections", "customFields",
];

const TASK_FIELDS = [
  "title", "description", "status", "priority", "dueDate", "completedAt",
  "assignedToId", "leadId", "opportunityId", "proposalId", "projectId",
];

const PROPOSAL_FIELDS = [
  "title", "status", "clientId", "leadId", "logoUrl", "footerText", "content",
];

const AUTOMATION_FIELDS = [
  "name", "description", "isActive", "triggerType", "triggerConfig", "actions",
];

const USER_FIELDS = [
  "name", "email", "password", "role", "status", "avatarUrl", "department",
  "workspaceId", "accessProfileId", "roleId",
];

const FIELD_MAP: Record<string, string[]> = {
  lead: LEAD_FIELDS,
  client: CLIENT_FIELDS,
  opportunity: OPPORTUNITY_FIELDS,
  task: TASK_FIELDS,
  proposal: PROPOSAL_FIELDS,
  automation: AUTOMATION_FIELDS,
  user: USER_FIELDS,
};

/**
 * Filtra um objeto body, removendo campos proibidos e mantendo apenas os permitidos.
 * @param body - O req.body original
 * @param resource - Nome do recurso (lead, client, opportunity, etc.)
 * @returns Objeto sanitizado
 */
export function sanitizeBody(body: Record<string, any>, resource: string): Record<string, any> {
  const allowedFields = FIELD_MAP[resource];
  if (!allowedFields) {
    // Se não há whitelist definida, ao menos remover campos proibidos
    const result = { ...body };
    for (const field of FORBIDDEN_FIELDS) {
      delete result[field];
    }
    return result;
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key) && !FORBIDDEN_FIELDS.includes(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

/**
 * Middleware Express para sanitizar automaticamente o body.
 */
export function sanitizeMiddleware(resource: string) {
  return (req: any, res: any, next: any) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeBody(req.body, resource);
    }
    next();
  };
}
