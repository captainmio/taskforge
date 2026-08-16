import { type Request, type Response, type NextFunction } from "express";
import { type ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
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

    const validatedData = result.data;

    if (
      typeof validatedData === "object" &&
      validatedData !== null &&
      "body" in validatedData
    ) {
      req.body = validatedData.body;
    }

    next();
  };
};
