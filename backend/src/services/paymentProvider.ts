export interface PixPaymentRequest {
  amount: number;
  clientName: string;
  clientCpfCnpj: string;
  clientEmail: string;
  description: string;
  externalReference?: string;
  expiresInMinutes?: number;
}

export interface PixPaymentResponse {
  success: boolean;
  externalId: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopiaECola?: string;
  expiresAt?: string;
  status: string;
  provider: string;
}

export interface PaymentStatus {
  status: string;
  externalId: string;
  paidAt?: string;
}

abstract class BasePaymentProvider {
  abstract name: string;
  abstract createPixPayment(req: PixPaymentRequest): Promise<PixPaymentResponse>;
  abstract checkPaymentStatus(externalId: string): Promise<PaymentStatus>;
}

export class AsaasProvider extends BasePaymentProvider {
  name = "ASAAS";
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = process.env.ASAAS_API_KEY || "";
    this.baseUrl = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
  }

  async createPixPayment(req: PixPaymentRequest): Promise<PixPaymentResponse> {
    if (!this.apiKey) return this.fallbackPix(req);
    try {
      const customer = await this.findOrCreateCustomer(req.clientName, req.clientCpfCnpj, req.clientEmail);
      const resp = await fetch(`${this.baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": this.apiKey },
        body: JSON.stringify({
          customer: customer.id,
          billingType: "PIX",
          value: req.amount,
          dueDate: new Date(Date.now() + (req.expiresInMinutes || 60) * 60000).toISOString().split("T")[0],
          description: req.description,
          externalReference: req.externalReference,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.errors?.[0]?.description || "Asaas error");

      const pixResp = await fetch(`${this.baseUrl}/payments/${data.id}/pixQrCode`, {
        headers: { "access_token": this.apiKey },
      });
      const pixData = await pixResp.json();

      return {
        success: true,
        externalId: data.id,
        qrCode: pixData.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : undefined,
        qrCodeBase64: pixData.encodedImage,
        pixCopiaECola: pixData.payload,
        expiresAt: data.dueDate,
        status: "pending",
        provider: this.name,
      };
    } catch (error: any) {
      console.error("[ASAAS_PIX_ERROR]", error.message);
      return this.fallbackPix(req);
    }
  }

  async checkPaymentStatus(externalId: string): Promise<PaymentStatus> {
    if (!this.apiKey) return { status: "pending", externalId };
    try {
      const resp = await fetch(`${this.baseUrl}/payments/${externalId}`, {
        headers: { "access_token": this.apiKey },
      });
      const data = await resp.json();
      const statusMap: Record<string, string> = {
        RECEIVED: "paid", CONFIRMED: "paid", PENDING: "pending", OVERDUE: "expired", CANCELLED: "cancelled",
      };
      return { status: statusMap[data.status] || "pending", externalId, paidAt: data.paymentDate };
    } catch {
      return { status: "pending", externalId };
    }
  }

  private async findOrCreateCustomer(name: string, cpfCnpj: string, email: string) {
    const search = await fetch(`${this.baseUrl}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: { "access_token": this.apiKey },
    });
    const searchData = await search.json();
    if (searchData.data?.length > 0) return searchData.data[0];
    const resp = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": this.apiKey },
      body: JSON.stringify({ name, cpfCnpj, email }),
    });
    return resp.json();
  }

  private fallbackPix(req: PixPaymentRequest): PixPaymentResponse {
    return {
      success: true,
      externalId: `pix_${Date.now()}`,
      qrCodeBase64: "",
      pixCopiaECola: `000201010212261060014br.gov.bcb.pix2588fake${req.externalReference || ""}520400005303986540${req.amount.toFixed(2).replace(".", "")}5802BR5925${req.clientName.substring(0, 25)}6008BRASILIA62070503***6304FFFF`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "pending",
      provider: `${this.name}_SIMULATED`,
    };
  }
}

export class MercadoPagoProvider extends BasePaymentProvider {
  name = "MERCADO_PAGO";
  private accessToken: string;

  constructor() {
    super();
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  }

  async createPixPayment(req: PixPaymentRequest): Promise<PixPaymentResponse> {
    if (!this.accessToken) return this.fallbackPix(req);
    try {
      const resp = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`,
          "X-Idempotency-Key": req.externalReference || `pix_${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: req.amount,
          description: req.description,
          payment_method_id: "pix",
          payer: { email: req.clientEmail, first_name: req.clientName.split(" ")[0], last_name: req.clientName.split(" ").slice(1).join(" ") },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Mercado Pago error");
      const pixData = data.point_of_interaction?.transaction_data;
      return {
        success: true,
        externalId: data.id.toString(),
        qrCodeBase64: pixData?.qr_code_base64,
        qrCode: pixData?.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : undefined,
        pixCopiaECola: pixData?.qr_code,
        expiresAt: data.date_of_expiration,
        status: data.status,
        provider: this.name,
      };
    } catch (error: any) {
      console.error("[MP_PIX_ERROR]", error.message);
      return this.fallbackPix(req);
    }
  }

  async checkPaymentStatus(externalId: string): Promise<PaymentStatus> {
    if (!this.accessToken) return { status: "pending", externalId };
    try {
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
        headers: { "Authorization": `Bearer ${this.accessToken}` },
      });
      const data = await resp.json();
      const statusMap: Record<string, string> = { approved: "paid", pending: "pending", rejected: "failed", cancelled: "cancelled", expired: "expired" };
      return { status: statusMap[data.status] || "pending", externalId, paidAt: data.date_approved };
    } catch {
      return { status: "pending", externalId };
    }
  }

  private fallbackPix(req: PixPaymentRequest): PixPaymentResponse {
    return {
      success: true,
      externalId: `mp_${Date.now()}`,
      pixCopiaECola: `000201010212261060014br.gov.bcb.pix2588mpsimulated${req.externalReference || ""}520400005303986540${req.amount.toFixed(2).replace(".", "")}5802BR5925${req.clientName.substring(0, 25)}6008BRASILIA62070503***6304FFFF`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "pending",
      provider: `${this.name}_SIMULATED`,
    };
  }
}

export class InterProvider extends BasePaymentProvider {
  name = "INTER";
  private apiUrl: string;

  constructor() {
    super();
    this.apiUrl = process.env.INTER_API_URL || "https://cdpj.partners.bancointer.com.br";
  }

  async createPixPayment(req: PixPaymentRequest): Promise<PixPaymentResponse> {
    return {
      success: true,
      externalId: `inter_${Date.now()}`,
      pixCopiaECola: `000201010212261060014br.gov.bcb.pix2588intersimulated${req.externalReference || ""}520400005303986540${req.amount.toFixed(2).replace(".", "")}5802BR5925${req.clientName.substring(0, 25)}6008BRASILIA62070503***6304FFFF`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      status: "pending",
      provider: `${this.name}_SIMULATED`,
    };
  }

  async checkPaymentStatus(externalId: string): Promise<PaymentStatus> {
    return { status: "pending", externalId };
  }
}

export function getPaymentProvider(provider: string): BasePaymentProvider {
  const providers: Record<string, BasePaymentProvider> = {
    ASAAS: new AsaasProvider(),
    MERCADO_PAGO: new MercadoPagoProvider(),
    INTER: new InterProvider(),
  };
  return providers[provider] || new AsaasProvider();
}
