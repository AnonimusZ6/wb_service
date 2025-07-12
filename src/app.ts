import knex from "#postgres/knex.js"
import env from "./config/env/env.js"
import { startSchedulers, jobs } from "./index.js" 

async function runMigrations() {
  try {
    console.log("Выполнение миграций базы данных...")
    const [batchNo, log] = await knex.migrate.latest()
    console.log(`Применены миграции (batch ${batchNo}):`, log)
    return true
  } catch (error) {
    console.error("Ошибка выполнения миграций:", error)
    throw error
  }
}

async function checkDatabaseSchema() {
  try {
    console.log("Проверка структуры базы данных...")
    const hasTariffsTable = await knex.schema.hasTable("tariffs")
    if (!hasTariffsTable) {
      throw new Error("Таблица tariffs не существует")
    }
    console.log("Структура базы данных проверена")
  } catch (error) {
    console.error("Ошибка проверки структуры базы:", error)
    throw error
  }
}

async function checkEnvironment() {
  const errors = []
  if (!env.WB_API_KEY) errors.push("WB_API_KEY не установлен")
  if (!env.GOOGLE_CREDENTIALS) errors.push("GOOGLE_CREDENTIALS не установлен")

  if (errors.length > 0) {
    throw new Error(`Ошибки конфигурации: ${errors.join(", ")}`)
  }

  if (!env.GOOGLE_SHEET_IDS || env.GOOGLE_SHEET_IDS.length === 0) {
    console.warn("Предупреждение: GOOGLE_SHEET_IDS не установлен - обновление таблиц отключено")
  }
}


async function runInitialJob(job: { run: () => Promise<void> }, jobName: string) {
  try {
    console.log(`[Initial Run] Запуск задачи: ${jobName}...`)
    await job.run()
    console.log(`[Initial Run] Задача ${jobName} успешно завершена.`)
  } catch (error) {
    console.error(
      `[Initial Run] Ошибка при выполнении задачи ${jobName}:`,
      error instanceof Error ? error.message : error,
    )

  }
}

async function main() {
  try {
    await checkEnvironment()
    await runMigrations()
    await checkDatabaseSchema()
    await knex.raw("SELECT 1") 

    
    console.log("Выполняю первоначальную загрузку данных...")
    await runInitialJob(jobs.fetchTariffsJob, "Тарифы WB")
    await runInitialJob(jobs.updateSheetsJob, "Google Таблицы")
    console.log("Первоначальная загрузка данных завершена.")

    
    startSchedulers()

    console.log("Приложение успешно запущено")
  } catch (error) {
    console.error("Ошибка запуска приложения:", error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
