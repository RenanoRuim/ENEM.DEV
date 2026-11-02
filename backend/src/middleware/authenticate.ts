import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createAuthenticate(supabase: SupabaseClient) {
  return async function authenticate(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    const authorization = request.header("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/iu);
    if (!match) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const accessToken = match[1];
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      response.status(401).json({ error: "The access token is invalid or expired." });
      return;
    }

    request.userId = data.user.id;
    request.accessToken = accessToken;
    next();
  };
}
