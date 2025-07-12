import knex from "./postgres/knex.js"

async function waitForDatabase(maxAttempts = 30, delay = 2000): Promise<void> {
  console.log("Waiting for database connection...")

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await knex.raw("SELECT 1")
      console.log("Database connection established!")
      return
    } catch (error) {
      console.log(`Database connection attempt ${attempt}/${maxAttempts} failed`)

      if (attempt === maxAttempts) {
        console.error("Failed to connect to database after maximum attempts")
        throw new Error("Database connection timeout")
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  waitForDatabase()
    .then(() => {
      console.log("Database is ready!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Database wait failed:", error)
      process.exit(1)
    })
}

export { waitForDatabase }
