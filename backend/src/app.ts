import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";

import type { getConfig } from "./config.js";
import { createAccountDataRouter } from "./routes/account-data.js";
import { createEnemRouter } from "./routes/enem.js";
import { createWritingImagesRouter } from "./routes/writing-images.js";

type Config = ReturnType<typeof getConfig>;

export function createApp(config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "32mb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.use("/api/enem", createEnemRouter());
  app.use("/api/me/data", createAccountDataRouter(config));
  app.use("/api/me/writing-images", createWritingImagesRouter(config));
  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found." });
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    console.error("API request failed:", error instanceof Error ? error.message : "Unknown error");
    if (response.headersSent) return;
    response.status(502).json({ error: "The API request could not be completed." });
  };
  app.use(errorHandler);

  return app;
}
