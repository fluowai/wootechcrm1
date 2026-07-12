export function generateContractHtml(template: string, data: Record<string, any>): string {
  let html = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    html = html.replace(regex, String(value ?? ""));
  }
  return html;
}

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return value;
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return value;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function generateContractNumber(): string {
  const date = new Date();
  const seq = Math.floor(Math.random() * 999999);
  return `CT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(seq).padStart(6, "0")}`;
}

export function buildContractData(client: any, soldProduct: any, org: any): Record<string, any> {
  return {
    contratante_nome: client.corporateName,
    contratante_cnpj: formatCnpj(client.cnpj || ""),
    contratante_endereco: client.address || "",
    contratante_cidade: client.city || "",
    contratante_estado: client.state || "",
    contratante_email: client.responsibleEmail || client.email,
    contratante_telefone: formatPhone(client.responsiblePhone || client.phone || ""),
    responsavel_nome: client.responsibleName || "",
    responsavel_cpf: formatCpf(client.responsibleCpf || ""),
    responsavel_cargo: client.responsibleRole || "",

    prestadora_nome: org.name || "Nexus360",
    prestadora_cnpj: org.cnpj || "",
    prestadora_email: org.email || "",

    servico_nome: soldProduct?.name || "",
    servico_descricao: soldProduct?.description || "",
    valor_setup: formatMoney(soldProduct?.setupValue || 0),
    valor_mensal: formatMoney(soldProduct?.monthlyValue || 0),
    valor_comissao: formatMoney(soldProduct?.commissionValue || 0),
    prazo_contrato: `${soldProduct?.contractTerm || 12} meses`,
    data_inicio: new Date(soldProduct?.startDate || Date.now()).toLocaleDateString("pt-BR"),

    numero_contrato: generateContractNumber(),
    data_assinatura: new Date().toLocaleDateString("pt-BR"),
    cidade: org.city || client.city || "",
  };
}
