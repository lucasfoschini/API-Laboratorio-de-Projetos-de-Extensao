import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      res.status(400).json({
        message: "Validation error",
        errors: result.error.flatten()
      });
      return;
    }

    // Aplica valores transformados (ex: email lowercase) de volta ao request
    const parsed = result.data as Record<string, unknown>;
    if (parsed.body)   req.body   = parsed.body;
    if (parsed.params) req.params = parsed.params as typeof req.params;
    if (parsed.query)  req.query  = parsed.query as typeof req.query;

    next();
  };
}
