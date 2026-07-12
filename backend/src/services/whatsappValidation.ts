import { PrismaClient } from "@prisma/client";
import { callBridge } from "./whatsappBridge.js";
import { logger } from "../utils/logger.js";

type WhatsAppValidationResult = {
  isValid: boolean;
  hasWhatsApp: boolean;
  pushName: string | null;
  profilePicture: string | null;
  pushNameMatchesCompany: boolean;
  pushNameMatchScore: number;
  validationNotes: string[];
};

export class WhatsAppValidationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async validateWhatsApp(
    phone: string,
    businessName: string,
    channelId?: string | null
  ): Promise<WhatsAppValidationResult> {
    const result: WhatsAppValidationResult = {
      isValid: false,
      hasWhatsApp: false,
      pushName: null,
      profilePicture: null,
      pushNameMatchesCompany: false,
      pushNameMatchScore: 0,
      validationNotes: [],
    };

    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;

    // 1. Verificar se o número existe via bridge
    try {
      const exists = await this.checkNumberExists(formattedPhone, channelId);
      result.hasWhatsApp = exists.exists;
      result.isValid = exists.exists;

      if (!exists.exists) {
        result.validationNotes.push("Número não possui WhatsApp ativo");
        return result;
      }
    } catch (error: any) {
      result.validationNotes.push(`Erro ao verificar número: ${error?.message}`);
      // Continuar mesmo com erro - pode ser temporário
    }

    // 2. Buscar pushname e foto de perfil via bridge
    try {
      const profile = await this.getContactProfile(formattedPhone, channelId);
      result.pushName = profile.pushName;
      result.profilePicture = profile.profilePicture;

      if (profile.pushName) {
        result.validationNotes.push(`Pushname encontrado: "${profile.pushName}"`);
      } else {
        result.validationNotes.push("Pushname não disponível");
      }
    } catch (error: any) {
      result.validationNotes.push(`Erro ao buscar perfil: ${error?.message}`);
    }

    // 3. Comparar pushname com nome da empresa
    if (result.pushName && businessName) {
      const match = this.comparePushNameWithCompany(
        result.pushName,
        businessName
      );
      result.pushNameMatchesCompany = match.matches;
      result.pushNameMatchScore = match.score;

      if (match.matches) {
        result.validationNotes.push(
          `Pushname bate com empresa (score: ${match.score}%)`
        );
      } else {
        result.validationNotes.push(
          `Pushname NÃO bate com empresa (score: ${match.score}%) - Possível número genérico`
        );
      }
    }

    return result;
  }

  private async checkNumberExists(
    phone: string,
    channelId?: string | null
  ): Promise<{ exists: boolean; jid: string | null }> {
    try {
      const result = await callBridge("/contacts/check-exists", {
        phone,
        channelId: channelId || undefined,
      });
      return {
        exists: result.exists || false,
        jid: result.jid || null,
      };
    } catch {
      // Se o bridge não suportar, assumir que existe
      return { exists: true, jid: null };
    }
  }

  private async getContactProfile(
    phone: string,
    channelId?: string | null
  ): Promise<{ pushName: string | null; profilePicture: string | null }> {
    try {
      const result = await callBridge("/contacts/profile", {
        phone,
        channelId: channelId || undefined,
      });
      return {
        pushName: result.pushName || result.pushname || result.name || null,
        profilePicture: result.profilePicture || result.picture || null,
      };
    } catch {
      return { pushName: null, profilePicture: null };
    }
  }

  private comparePushNameWithCompany(
    pushName: string,
    businessName: string
  ): { matches: boolean; score: number } {
    const normalizedPush = this.normalizeText(pushName);
    const normalizedBusiness = this.normalizeText(businessName);

    // Ignorar pushnames genéricos
    const genericNames = [
      "whatsapp",
      " usuario",
      " usuario whatsapp",
      "sem nome",
      "no name",
      "new number",
      "novo numero",
      "biz",
      "business",
    ];

    if (genericNames.some((g) => normalizedPush.includes(g))) {
      return { matches: false, score: 0 };
    }

    // Se o pushname é só um primeiro nome, não considerar match
    const pushWords = normalizedPush.split(/\s+/).filter((w) => w.length > 2);
    const businessWords = normalizedBusiness
      .split(/[\s,.-]+/)
      .filter((w) => w.length > 2);

    if (pushWords.length <= 1 && businessWords.length > 2) {
      return { matches: false, score: 15 };
    }

    // Calcular similaridade
    let matchScore = 0;

    // Match exato
    if (normalizedPush === normalizedBusiness) {
      return { matches: true, score: 100 };
    }

    // PushName contém o nome da empresa ou vice-versa
    if (normalizedPush.includes(normalizedBusiness)) {
      matchScore = 90;
    } else if (normalizedBusiness.includes(normalizedPush)) {
      matchScore = 85;
    } else {
      // Verificar palavras em comum
      const commonWords = pushWords.filter((w) =>
        businessWords.some((bw) => bw.includes(w) || w.includes(bw))
      );
      const matchRatio = commonWords.length / Math.max(pushWords.length, 1);
      matchScore = Math.round(matchRatio * 70);

      // Bônus se tem palavras significativas (>4 chars) em comum
      const significantCommon = commonWords.filter((w) => w.length > 4);
      if (significantCommon.length > 0) {
        matchScore = Math.min(matchScore + 20, 95);
      }
    }

    return {
      matches: matchScore >= 50,
      score: matchScore,
    };
  }

  private normalizeText(text: string): string {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  async saveValidationResult(
    leadId: string,
    validation: WhatsAppValidationResult
  ): Promise<void> {
    try {
      await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          rawData: {
            whatsappValidation: {
              hasWhatsApp: validation.hasWhatsApp,
              pushName: validation.pushName,
              pushNameMatchesCompany: validation.pushNameMatchesCompany,
              pushNameMatchScore: validation.pushNameMatchScore,
              validationNotes: validation.validationNotes,
              validatedAt: new Date().toISOString(),
            },
          },
        },
      });
    } catch (error: any) {
      logger.warn("WhatsAppValidation", "Erro ao salvar validação", {
        leadId,
        error: error?.message,
      });
    }
  }
}
