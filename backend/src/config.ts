import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:8081"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function getConfig() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const invalid = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Backend configuration is incomplete. Check these environment variables: ${invalid.join(", ")}`,
    );
  }
  return parsed.data;
}
