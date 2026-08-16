import { type Request, type Response, type NextFunction } from "express";
import { type ZodType } from "zod";

type RequestValidationData = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

export const validate = <T extends RequestValidationData>(schema: ZodType<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    next();
  };
};
