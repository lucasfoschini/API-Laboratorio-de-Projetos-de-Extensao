import { GoogleGenerativeAI } from "@google/generative-ai";
import { HttpError } from "../../utils/http-error";

const MODEL = "gemini-flash-latest";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError(503, "IA não configurada (GEMINI_API_KEY ausente)");
  return new GoogleGenerativeAI(key);
}

interface SuggestContext {
  title:       string;
  description?: string;
  area?:       string;
  pubType?:    string; // ARTICLE | REPORT | PRESENTATION | THESIS
}

export class AiService {
  /** Sugere tags separadas por ponto */
  async suggestTags(ctx: SuggestContext): Promise<string> {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL });

    const areaHint = ctx.area ? `Área: ${ctx.area}.` : "";
    const typeHint = ctx.pubType ? `Tipo de publicação: ${ctx.pubType}.` : "";
    const descHint = ctx.description ? `Descrição: ${ctx.description}` : "";

    const prompt = `
Você é um assistente acadêmico especializado em projetos de extensão universitária.
Gere exatamente 5 palavras-chave relevantes para o seguinte projeto/publicação.

Título: ${ctx.title}
${areaHint}
${typeHint}
${descHint}

Regras:
- Retorne APENAS as palavras-chave separadas por ponto e espaço (ex: "automação. controle. robótica. sensores. CLP")
- Sem explicações, sem numeração, sem formatação extra
- Palavras em português, específicas e técnicas
- Não repita o título
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  /** Sugere um resumo/abstract para uma publicação */
  async suggestAbstract(ctx: SuggestContext): Promise<string> {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL });

    const typeLabels: Record<string, string> = {
      ARTICLE:      "artigo científico",
      REPORT:       "relatório técnico",
      PRESENTATION: "apresentação",
      THESIS:       "trabalho de conclusão de curso (TCC)",
    };
    const typeLabel = ctx.pubType ? typeLabels[ctx.pubType] ?? ctx.pubType : "publicação acadêmica";
    const descHint  = ctx.description ? `Descrição do projeto: ${ctx.description}` : "";
    const areaHint  = ctx.area ? `Área: ${ctx.area}.` : "";

    const prompt = `
Você é um assistente acadêmico especializado em projetos de extensão universitária.
Escreva um resumo acadêmico conciso (3 a 5 frases) para um ${typeLabel} com base nas informações abaixo.

Título: ${ctx.title}
${areaHint}
${descHint}

Regras:
- Escreva em português formal e acadêmico
- O resumo deve apresentar o contexto, objetivo e contribuição esperada
- Sem marcadores, sem título, apenas o texto corrido do resumo
- Máximo de 120 palavras
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}
