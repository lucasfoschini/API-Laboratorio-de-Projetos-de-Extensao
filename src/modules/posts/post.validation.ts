import { z } from "zod";
import { MediaType } from "@prisma/client";

// schema for individual media items attached to a post
const mediaItemSchema = z.object({
  url: z.string().url("URL inválida"),
  type: z.nativeEnum(MediaType),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const createPostSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(5, "Título muito curto").max(100, "Título muito longo"),
    content: z.string().min(20, "Conteúdo muito curto"),
    media: z.array(mediaItemSchema).optional(),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({ postId: z.string().uuid() }),
  body: z.object({
    title: z.string().min(5, "Título muito curto").max(100, "Título muito longo").optional(),
    content: z.string().min(20, "Conteúdo muito curto").optional(),
    media: z.array(mediaItemSchema).optional(),
  }),
});
