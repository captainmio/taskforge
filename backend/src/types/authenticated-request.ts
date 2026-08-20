import type { Request } from "express";

export interface AuthenticatedUser {
  id: number;
  email: string;
}

export type AuthenticatedRequest<
  TBody = unknown,
  TParams = Record<string, never>,
  TQuery = Record<string, never>,
> = Request<
  TParams,
  unknown,
  TBody,
  TQuery
> & {
  user: AuthenticatedUser;
};
