import { DatabaseService } from "../services/database.service.js"
import { GoogleSheetsService } from "../services/google-sheets.service.js"
import env from "../config/env/env.js"

export class UpdateSheetsJob {
  private readonly dbService = new DatabaseService()
  private sheetsService: GoogleSheetsService | null = null

  constructor() {
    
    if (env.GOOGLE_SHEET_IDS?.length > 0) { 
      try {
        this.sheetsService = new GoogleSheetsService()
      } catch (error) {
        console.error("Failed to initialize Google Sheets service:", error)
        this.sheetsService = null
      }
    }
  }

  async run(): Promise<void> {
    try {
      console.log("Starting sheets update...")

    
      if (!this.sheetsService) {
        console.warn("Google Sheets service not available - skipping sheets update")
        return
      }

      if (!env.GOOGLE_SHEET_IDS?.length) {
        console.warn("No sheet IDs configured (GOOGLE_SHEET_IDS is empty)")
        return
      }


      const tariffs = await this.dbService.getLatestTariffs()
      console.log(`Retrieved ${tariffs.length} tariffs from database`)

      if (!tariffs.length) {
        console.warn("No tariffs found in database")
        return
      }

      // Обновляем таблицы
      const results = await this.sheetsService.updateSheets(tariffs)
      const successCount = results.filter((r) => r.success).length

      if (successCount === env.GOOGLE_SHEET_IDS.length) {
        console.log(`Successfully updated all ${successCount} sheets`)
      } else {
        console.warn(`Updated only ${successCount}/${env.GOOGLE_SHEET_IDS.length} sheets`)
        results
          .filter((r) => !r.success)
          .forEach((failed) => {
            const errorMsg = "error" in failed ? failed.error : "Unknown error"
            console.error(`Failed to update sheet ${failed.sheetId}: ${errorMsg}`)
          })
      }
    } catch (error) {
      console.error("Critical error in UpdateSheetsJob:", error)
      throw error
    }
  }
}
