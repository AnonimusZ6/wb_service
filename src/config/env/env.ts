import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const envSchema = z.object({
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.string().regex(/^\d+$/).transform(Number).default("5432"),
  POSTGRES_DB: z.string().default("postgres"),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default("postgres"),

  APP_PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  WB_API_KEY: z.string().min(1, "WB_API_KEY is required"),

  GOOGLE_CREDENTIALS: z
    .union([
      z.string().transform((str) => {
        try {
          return JSON.parse(str.trim())
        } catch (error) {
          throw new Error(`Не правильный формат GOOGLE_CRIDENTIALS: ${error}`)
        }
      }),
      z.record(z.any()),
    ])
    .refine(
      (data) => {
        return data && typeof data === "object" && "client_email" in data && "private_key" in data
      },
      {
        message: "Google credentials должен содержать client_email и private_key",
      },
    )
    .optional(),

  GOOGLE_SHEET_IDS: z
    .string()
    .transform((str) => {
      if (!str || str.trim() === "") return []
      const ids = str
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
      return ids
    })
    .default("#"),

  // Планировщик крон
  TARIFFS_UPDATE_CRON: z.string().default("0 * * * *"),
  // Планировщик крон
  SHEETS_UPDATE_CRON: z.string().default("0 * * * *"),
})

type EnvConfig = z.infer<typeof envSchema>

const env = envSchema.parse({
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  APP_PORT: process.env.APP_PORT,
  NODE_ENV: process.env.NODE_ENV,
  WB_API_KEY: process.env.WB_API_KEY,
  GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS,
  GOOGLE_SHEET_IDS: process.env.GOOGLE_SHEET_IDS,
  TARIFFS_UPDATE_CRON: process.env.TARIFFS_UPDATE_CRON,
  SHEETS_UPDATE_CRON: process.env.SHEETS_UPDATE_CRON,
}) as EnvConfig

export default env
