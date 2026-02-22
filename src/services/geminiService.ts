import { GoogleGenAI } from "@google/genai";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const generateReportSummary = async (incidentData: any) => {
  if (!genAI) {
    return "Gemini API Key não configurada. O resumo automático está desativado.";
  }

  try {
    const response = await (genAI as any).models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise os seguintes dados de um incidente de Facility Management e forneça um resumo executivo profissional em português:
      ${JSON.stringify(incidentData)}`,
      config: {
        systemInstruction: "Você é um especialista em Facility Management. Forneça análises técnicas e recomendações de melhoria baseadas nos dados fornecidos.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao gerar resumo com Gemini:", error);
    return "Não foi possível gerar o resumo automático.";
  }
};
