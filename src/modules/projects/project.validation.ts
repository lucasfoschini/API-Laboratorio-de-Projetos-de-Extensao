import { ProjectArea, ProjectStatus } from "@prisma/client";
import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    title:               z.string().min(5).max(120),
    description:         z.string().min(20),
    area:                z.nativeEnum(ProjectArea),
    areas:               z.array(z.string()).optional(),
    vacancies:           z.coerce.number().int().min(1).max(100),
    tags:                z.array(z.string()).optional(),
    startDate:           z.string().datetime({ offset: true }).optional(),
    endDate:             z.string().datetime({ offset: true }).optional(),
    applicationDeadline: z.string().datetime({ offset: true }).optional(),
    coverImage:          z.string().url().optional(),
    tempo:               z.string().min(1),
    custo:               z.coerce.number().nonnegative().default(0),
    escopo:              z.string().min(5),
    contactEmail:        z.string().email().optional(),
    contactInfo:         z.string().optional(),
    memberIds:           z.array(z.string().uuid()).optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title:               z.string().min(5).max(120).optional(),
    description:         z.string().min(20).optional(),
    area:                z.nativeEnum(ProjectArea).optional(),
    areas:               z.array(z.string()).optional(),
    status:              z.nativeEnum(ProjectStatus).optional(),
    vacancies:           z.coerce.number().int().min(1).optional(),
    tags:                z.array(z.string()).optional(),
    startDate:           z.string().datetime({ offset: true }).optional(),
    endDate:             z.string().datetime({ offset: true }).optional(),
    applicationDeadline: z.string().datetime({ offset: true }).optional(),
    coverImage:          z.string().url().optional(),
    tempo:               z.string().optional(),
    custo:               z.coerce.number().nonnegative().optional(),
    escopo:              z.string().optional(),
    contactEmail:        z.string().email().optional(),
    contactInfo:         z.string().optional(),
  }),
});

export const projectIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});