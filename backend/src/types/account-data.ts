import { z } from "zod";

export const accountDataSchema = z
  .object({
    format: z.literal("enem.dev-account-data"),
    version: z.literal(1),
    studentState: z.unknown(),
    writingEssays: z.array(z.unknown()),
    personalWritingTopics: z.array(z.unknown()),
    personalQuestionRecords: z.array(z.unknown()),
    deleted: z
      .object({
        essays: z.record(z.string(), z.string()),
        topics: z.record(z.string(), z.string()),
        questionRecords: z.record(z.string(), z.string()),
      })
      .strict(),
  })
  .strict();

export const saveAccountDataSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    data: accountDataSchema,
  })
  .strict();

export type AccountData = z.infer<typeof accountDataSchema>;
export type SaveAccountData = z.infer<typeof saveAccountDataSchema>;
