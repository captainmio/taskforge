import type { Request } from "express";

export interface AuthenticatedUser {
  id: number;
  email: string;
}

export type AuthenticatedRequest<TBody = unknown> = Request<
  Record<string, never>,
  unknown,
  TBody
> & {
  user: AuthenticatedUser;
};
