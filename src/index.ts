import { FetchTariffsJob } from "./job/fetch-tariffs.job.js"
import { UpdateSheetsJob } from "./job/update-sheets.job.js"
import env from "./config/env/env.js"
import cron from "node-cron"

const fetchTariffsJob = new FetchTariffsJob()
const updateSheetsJob = new UpdateSheetsJob()

// Флаги выполнения
const jobFlags = {
  tariffs: { isRunning: false },
  sheets: { isRunning: false },
}

// Универсальный обработчик задач
async function runScheduledJob(job: { run: () => Promise<void> }, jobName: string, flag: { isRunning: boolean }) {
  if (flag.isRunning) {
    console.log(`[${jobName}] Пропуск - задача уже выполняется`)
    return
  }

  try {
    flag.isRunning = true
    console.log(`[${jobName}] Запуск в ${new Date().toISOString()}`)
    await job.run()
  } catch (error) {
    console.error(`[${jobName}] Ошибка:`, error instanceof Error ? error.message : error)
  } finally {
    flag.isRunning = false
  }
}

// Инициализация планировщиков
export function startSchedulers() {
  // Планировщик тарифов
  cron.schedule(
    env.TARIFFS_UPDATE_CRON,
    () => {
      runScheduledJob(fetchTariffsJob, "TARIFFS", jobFlags.tariffs)
    },
    {
      timezone: "UTC", // Планировщик cron
    },
  )

  // Планировщик таблиц
  cron.schedule(
    env.SHEETS_UPDATE_CRON,
    () => {
      runScheduledJob(updateSheetsJob, "SHEETS", jobFlags.sheets)
    },
    {
      timezone: "UTC", 
    },
  )

  console.log(`
  Планировщики запущены:
  - Тарифы: по расписанию "${env.TARIFFS_UPDATE_CRON}" (UTC)
  - Таблицы: по расписанию "${env.SHEETS_UPDATE_CRON}" (UTC)
`)
}


export const jobs = {
  fetchTariffsJob,
  updateSheetsJob,
}
