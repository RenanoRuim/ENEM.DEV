import { Router } from "express";
import type { Request, Response } from "express";
import type { z } from "zod";

import type { getConfig } from "../config.js";
import { createAuthenticate } from "../middleware/authenticate.js";
import {
  createSupabaseClient,
  createUserSupabaseClient,
} from "../services/supabase.js";
import { saveAccountDataSchema } from "../types/account-data.js";

type Config = ReturnType<typeof getConfig>;

function getUserId(request: Request, response: Response): string | null {
  if (!request.userId) {
    response.status(401).json({ error: "Authentication required." });
    return null;
  }
  return request.userId;
}

export function createAccountDataRouter(config: Config) {
  const router = Router();
  const supabase = createSupabaseClient(config);
  const authenticate = createAuthenticate(supabase);

  router.use(authenticate);

  router.get("/", async (request, response, next) => {
    try {
      const userId = getUserId(request, response);
      if (!userId) return;

      const userClient = createUserSupabaseClient(
        config,
        request.accessToken ?? "",
      );
      const { data, error } = await userClient
        .from("user_app_data")
        .select("data, revision")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        next(error);
        return;
      }

      response.json({
        data: data?.data ?? null,
        revision: data?.revision ?? 0,
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/", async (request, response, next) => {
    try {
      const userId = getUserId(request, response);
      if (!userId) return;

      const body = saveAccountDataSchema.safeParse(request.body);
      if (!body.success) {
        response.status(400).json({
          error: "Invalid account data payload.",
          issues: body.error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }

      const userClient = createUserSupabaseClient(
        config,
        request.accessToken ?? "",
      );

      if (body.data.expectedRevision === 0) {
        const { data, error } = await userClient
          .from("user_app_data")
          .insert({
            user_id: userId,
            data: body.data.data,
            revision: 1,
          })
          .select("revision")
          .maybeSingle();

        if (error?.code === "23505") {
          response.status(409).json({ error: "Account data changed on another device." });
          return;
        }
        if (error) {
          next(error);
          return;
        }
        response.status(201).json({ revision: data?.revision ?? 1 });
        return;
      }

      const nextRevision = body.data.expectedRevision + 1;
      const { data, error } = await userClient
        .from("user_app_data")
        .update({
          data: body.data.data,
          revision: nextRevision,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("revision", body.data.expectedRevision)
        .select("revision")
        .maybeSingle();

      if (error) {
        next(error);
        return;
      }
      if (!data) {
        response.status(409).json({ error: "Account data changed on another device." });
        return;
      }
      response.json({ revision: data.revision });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
