import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-5'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  // Dev-only cost lever: skip the walking-budget retry loop and accept the
  // first propose_itinerary attempt as-is. Must default to off (full
  // validation) so a fresh clone — e.g. an interviewer's — behaves per spec
  // without needing to know this flag exists. Only set in a local, uncommitted
  // .env for cheap local iteration.
  // (z.coerce.boolean() would treat the string "false" as truthy — JS
  // Boolean("false") is true — so this compares the raw string instead.)
  SKIP_BUDGET_VALIDATION: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
