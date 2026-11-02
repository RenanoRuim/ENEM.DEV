import { Router } from "express";

const ENEM_API = "https://api.enem.dev/v1";
const MAX_LIMIT = 50;

export function createEnemRouter() {
  const router = Router();

  router.get("/exams", async (_request, response, next) => {
    try {
      const result = await fetch(`${ENEM_API}/exams`);
      const body = await result.text();
      response.status(result.status).type(result.headers.get("content-type") ?? "application/json").send(body);
    } catch (error) {
      next(error);
    }
  });

  router.get("/exams/:year/questions", async (request, response, next) => {
    const year = Number(request.params.year);
    const limit = Number(request.query.limit ?? 10);
    const offset = Number(request.query.offset ?? 0);
    const language = request.query.language;

    if (
      !Number.isInteger(year) || year <= 0 ||
      !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT ||
      !Number.isInteger(offset) || offset < 0 ||
      (language !== undefined && typeof language !== "string")
    ) {
      response.status(400).json({ error: "Invalid question query parameters." });
      return;
    }

    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (typeof language === "string" && language.length > 0) {
      query.set("language", language);
    }

    try {
      const result = await fetch(
        `${ENEM_API}/exams/${year}/questions?${query.toString()}`,
      );
      const body = await result.text();
      response.status(result.status).type(result.headers.get("content-type") ?? "application/json").send(body);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
