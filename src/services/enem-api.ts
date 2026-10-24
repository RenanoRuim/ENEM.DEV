import type { EnemExam, EnemQuestionsResponse } from "@/types/enem";

const API_BASE_URL = "https://api.enem.dev/v1";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_REQUEST_INTERVAL_MS = 1000;

let nextRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();
const examListCache = new Map<string, Promise<EnemExam[]>>();
const questionPageCache = new Map<string, Promise<EnemQuestionsResponse>>();

export interface FetchQuestionsOptions {
  limit?: number;
  offset?: number;
  language?: string;
}

export class EnemApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter: string | null = null,
  ) {
    super(message);
    this.name = "EnemApiError";
  }
}

async function waitForRequestSlot(): Promise<void> {
  const previousRequest = requestQueue;
  let releaseRequest!: () => void;
  requestQueue = new Promise((resolve) => {
    releaseRequest = resolve;
  });

  await previousRequest;

  const waitTime = Math.max(0, nextRequestAt - Date.now());
  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
  releaseRequest();
}

function getCached<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const request = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, request);
  return request;
}

async function fetchJson<T>(url: string): Promise<T> {
  await waitForRequestSlot();
  const response = await fetch(url);

  if (!response.ok) {
    const details = await response.text();
    const retryAfter = response.headers.get("Retry-After");
    const retryMessage =
      response.status === 429 && retryAfter
        ? ` Tente novamente depois de ${retryAfter} (Retry-After).`
        : "";
    const errorDetails = details ? ` ${details}` : "";

    throw new EnemApiError(
      `Falha ao consultar a API ENEM (HTTP ${response.status}).${retryMessage}${errorDetails}`,
      response.status,
      retryAfter,
    );
  }

  return response.json() as Promise<T>;
}

export function fetchExams(): Promise<EnemExam[]> {
  return getCached(examListCache, "exams", () =>
    fetchJson<EnemExam[]>(`${API_BASE_URL}/exams`),
  );
}

export function fetchQuestions(
  year: number,
  options: FetchQuestionsOptions = {},
): Promise<EnemQuestionsResponse> {
  if (!Number.isInteger(year) || year <= 0) {
    throw new RangeError("O ano deve ser um numero inteiro positivo.");
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const offset = options.offset ?? 0;

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`O limite deve ser um inteiro entre 1 e ${MAX_LIMIT}.`);
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError("O offset deve ser um numero inteiro igual ou maior que zero.");
  }

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (options.language) {
    query.set("language", options.language);
  }

  const cacheKey = `${year}:${options.language ?? ""}:${limit}:${offset}`;
  return getCached(questionPageCache, cacheKey, () =>
    fetchJson<EnemQuestionsResponse>(
      `${API_BASE_URL}/exams/${year}/questions?${query.toString()}`,
    ),
  );
}

export function clearQuestionPageCache(year?: number): void {
  if (year === undefined) {
    questionPageCache.clear();
    return;
  }

  const prefix = `${year}:`;
  for (const key of questionPageCache.keys()) {
    if (key.startsWith(prefix)) {
      questionPageCache.delete(key);
    }
  }
}
