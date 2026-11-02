import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import type { getConfig } from "../config.js";
import { createAuthenticate } from "../middleware/authenticate.js";
import {
  createSupabaseClient,
  createUserSupabaseClient,
} from "../services/supabase.js";

type Config = ReturnType<typeof getConfig>;

const imageSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u),
  })
  .strict();
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const BUCKET = "writing-prompt-images";

function getImageId(request: Request, response: Response): string | null {
  const imageId = request.params.imageId;
  if (
    typeof imageId !== "string" ||
    !/^prompt-[a-z0-9]+-[a-z0-9]+$/u.test(imageId)
  ) {
    response.status(400).json({ error: "Invalid image identifier." });
    return null;
  }
  return imageId;
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "webp";
  }
}

export function createWritingImagesRouter(config: Config) {
  const router = Router();
  const authenticate = createAuthenticate(createSupabaseClient(config));
  router.use(authenticate);

  router.put("/:imageId", async (request, response, next) => {
    try {
      const userId = request.userId;
      const imageId = getImageId(request, response);
      if (!userId || !imageId) return;

      const body = imageSchema.safeParse(request.body);
      if (!body.success) {
        response.status(400).json({ error: "Invalid writing image payload." });
        return;
      }
      const bytes = Buffer.from(body.data.base64, "base64");
      if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
        response.status(413).json({ error: "Writing images must be at most 3 MB." });
        return;
      }

      const client = createUserSupabaseClient(
        config,
        request.accessToken ?? "",
      );
      const path = `${userId}/${imageId}.${getExtension(body.data.mimeType)}`;
      const { error } = await client.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: body.data.mimeType,
          upsert: true,
        });
      if (error) {
        next(error);
        return;
      }
      response.json({ uploaded: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:imageId", async (request, response, next) => {
    try {
      const userId = request.userId;
      const imageId = getImageId(request, response);
      if (!userId || !imageId) return;

      const mimeType = request.query.mimeType;
      if (
        typeof mimeType !== "string" ||
        !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
      ) {
        response.status(400).json({ error: "Invalid image MIME type." });
        return;
      }

      const client = createUserSupabaseClient(
        config,
        request.accessToken ?? "",
      );
      const { data, error } = await client.storage
        .from(BUCKET)
        .download(`${userId}/${imageId}.${getExtension(mimeType)}`);
      if (error) {
        if ("statusCode" in error && String(error.statusCode) === "404") {
          response.status(404).json({ error: "Writing image was not found." });
          return;
        }
        next(error);
        return;
      }
      const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
      response.json({ mimeType, base64 });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
