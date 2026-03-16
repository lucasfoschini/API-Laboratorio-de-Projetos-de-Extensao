import { PublicationType } from "@prisma/client";
import { z } from "zod";

// Helper: aceita URL válida, string vazia ou null/undefined
const optionalUrl = z.union([
  z.string().url("URL inválida"),
  z.literal(""),
  z.null(),
]).optional();

export const createPublicationSchema = z.object({
  body: z.object({
    title:      z.string().min(3, "Título muito curto"),
    abstract:   z.string().min(10, "Resumo muito curto"),
    content:    z.string().optional(),
    type:       z.nativeEnum(PublicationType),
    year:       z.coerce.number().int().min(1900).max(2100),
    journal:    z.string().optional(),
    doi:        z.string().optional(),
    zenodoLink: optionalUrl,
    tags:       z.array(z.string()).optional(),
    images:     z.array(z.union([z.string().url("URL de imagem inválida"), z.literal("")])).optional(),
    references: z.array(z.string().max(2000)).optional(),
    projectId:  z.string().uuid("ID do projeto inválido"),
    authorIds:  z.array(z.string().uuid()).optional(),
  }),
});

export const publicationIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const updatePublicationSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title:      z.string().min(3, "Título muito curto").optional(),
    abstract:   z.string().min(10, "Resumo muito curto").optional(),
    content:    z.string().nullable().optional(),
    type:       z.nativeEnum(PublicationType).optional(),
    year:       z.coerce.number().int().min(1900).max(2100).optional(),
    journal:    z.string().nullable().optional(),
    doi:        z.string().nullable().optional(),
    zenodoLink: optionalUrl,
    tags:       z.array(z.string()).optional(),
    images:     z.array(z.union([z.string().url("URL de imagem inválida"), z.literal("")])).optional(),
    references: z.array(z.string().max(2000)).optional(),
    projectId:  z.string().uuid("ID do projeto inválido").optional(),
    authorIds:  z.array(z.string().uuid()).optional(),
  }),
});