import { google, type sheets_v4 } from "googleapis"
import env from "../config/env/env.js"
import type { TariffRecord } from "../postgres/knex.js"
import fetch, { Headers, Request, Response } from "node-fetch"
import FormData from "form-data";

// Полифиллы для Google APIs
if (!globalThis.fetch) {
  globalThis.fetch = fetch as any
  globalThis.Headers = Headers as any
  globalThis.Request = Request as any
  globalThis.Response = Response as any
}

if (!globalThis.FormData) {
  globalThis.FormData = FormData as any;
}

// Полифилл для Blob
if (!globalThis.Blob) {
  globalThis.Blob = class Blob {
    constructor(parts: any[], options?: any) {

      return Buffer.concat(parts.map((p) => Buffer.from(p))) as any
    }
  } as any
}

export class GoogleSheetsService {
  private readonly sheets: sheets_v4.Sheets

  constructor() {
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        credentials: this.getCredentials(),
      })

      this.sheets = google.sheets({
        version: "v4",
        auth,
      })

      console.log("Google Sheets service initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Google Sheets service:", error)
      throw error
    }
  }

  private getCredentials() {
    try {
      let credentials

      if (typeof env.GOOGLE_CREDENTIALS === "string") {
        credentials = JSON.parse(env.GOOGLE_CREDENTIALS.trim())
      } else {
        credentials = env.GOOGLE_CREDENTIALS
      }

      if (!credentials.private_key || !credentials.client_email) {
        throw new Error("Missing required fields: private_key or client_email")
      }


      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n")
      }

      console.log("Google credentials loaded successfully")
      console.log("Service account email:", credentials.client_email)

      return credentials
    } catch (error) {
      console.error("Google Sheets credentials error:", error)
      throw new Error("Invalid Google credentials configuration")
    }
  }

  async updateSheets(tariffs: TariffRecord[]): Promise<{ success: boolean; sheetId: string; error?: string }[]> {
    if (!tariffs?.length) {
      console.warn("No tariffs data to update sheets")
      return []
    }

    const results = []
    const values = this.prepareSheetData(tariffs)

    console.log("Prepared data for Google Sheets:", {
      rows: values.length,
      columns: values[0]?.length || 0,
      sample: values.slice(0, 2),
    })

    for (const sheetId of env.GOOGLE_SHEET_IDS) {
      try {
        console.log(`Processing sheet: ${sheetId}`)

        // Проверяем доступ к таблице
        await this.verifySheetAccess(sheetId)


        await this.updateSheet(sheetId, values)

        results.push({ success: true, sheetId })
        console.log(`✅ Sheet ${sheetId} updated successfully`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          success: false,
          sheetId,
          error: errorMsg,
        })
        console.error(`❌ Failed to update sheet ${sheetId}:`, errorMsg)

        // Добавляем подробную диагностику
        if (errorMsg.includes("403") || errorMsg.includes("permission")) {
          console.error(`🔐 Permission issue for sheet ${sheetId}:`)
          console.error(`   Make sure the sheet is shared with: test-task@test-project-465514.iam.gserviceaccount.com`)
          console.error(`   Required permissions: Editor access`)
        }
      }
    }

    return results
  }

  private async verifySheetAccess(sheetId: string): Promise<void> {
    try {
      const res = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: "properties.title",
      })
      console.log(`✅ Access verified to sheet: "${res.data.properties?.title}" (${sheetId})`)
    } catch (error: any) {
      console.error(`❌ Access denied to sheet ${sheetId}`)
      console.error(`Error details:`, error.message || error)

      if (error.code === 404) {
        throw new Error(`Sheet not found: ${sheetId}. Please check the sheet ID.`)
      } else if (error.code === 403) {
        throw new Error(`Permission denied: Sheet ${sheetId} is not shared with the service account.`)
      } else {
        throw new Error(`Cannot access sheet ${sheetId}: ${error.message || error}`)
      }
    }
  }

  private async updateSheet(sheetId: string, values: unknown[][]): Promise<void> {
    try {
      // Сначала очищаем данные
      console.log(`Clearing existing data in sheet ${sheetId}...`)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "A1:Z1000", // Расширенный диапазон для очистки
      })

      // Затем вставляем новые данные
      console.log(`Inserting new data into sheet ${sheetId}...`)
      const res = await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "A1", // Начинаем с A1
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      })

      console.log(`✅ Sheet ${sheetId} updated:`, {
        updatedCells: res.data.updatedCells,
        updatedRange: res.data.updatedRange,
      })
    } catch (error: any) {
      console.error(`❌ Failed to update sheet ${sheetId}:`, error.message || error)
      throw error
    }
  }

  private prepareSheetData(tariffs: TariffRecord[]): unknown[][] {
    const headers = [
      "Склад",
      "Доставка (выр)",
      "Доставка (база)",
      "Доставка (литр)",
      "Хранение (база)",
      "Хранение (литр)",
      "Действует до",
    ]

    const rows = tariffs.map((t) => [
      t.warehouse_name || "N/A",
      t.box_delivery_and_storage_expr?.toString() || "N/A",
      t.box_delivery_base?.toString() || "N/A",
      t.box_delivery_liter?.toString() || "N/A",
      t.box_storage_base?.toString() || "N/A",
      t.box_storage_liter?.toString() || "N/A",
      t.dt_till_max ? new Date(t.dt_till_max).toISOString().split("T")[0] : "N/A",
    ])

    return [headers, ...rows]
  }
}
