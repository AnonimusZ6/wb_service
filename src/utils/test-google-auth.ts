import { google } from "googleapis"
import env from "../config/env/env.js"
import fetch, { Headers, Request, Response } from "node-fetch"


//Проверка аутентификации гугла(не нужная фигня на проде)

if (!globalThis.fetch) {
  globalThis.fetch = fetch as any
  globalThis.Headers = Headers as any
  globalThis.Request = Request as any
  globalThis.Response = Response as any
}

async function testGoogleAuth() {
  try {
    console.log("Testing Google Sheets authentication...")

    const credentials =
      typeof env.GOOGLE_CREDENTIALS === "string" ? JSON.parse(env.GOOGLE_CREDENTIALS.trim()) : env.GOOGLE_CREDENTIALS

    console.log("Client email:", credentials.client_email)


    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n")
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      credentials,
    })


    const authClient = await auth.getClient()
    console.log("✅ Google Auth client created successfully!")

    const sheets = google.sheets({ version: "v4", auth })
    console.log("✅ Google Sheets API client created successfully!")

   
    if (env.GOOGLE_SHEET_IDS?.length > 0) {
      const testSheetId = env.GOOGLE_SHEET_IDS[0]
      try {
        const res = await sheets.spreadsheets.get({
          spreadsheetId: testSheetId,
          fields: "properties.title",
        })
        console.log(`✅ Successfully accessed sheet: ${res.data.properties?.title}`)
      } catch (error) {
        console.warn(`⚠️  Could not access test sheet ${testSheetId}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log("🎉 All Google Sheets tests passed!")
  } catch (error) {
    console.error("❌ Google Sheets authentication failed:", error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testGoogleAuth()
}

export { testGoogleAuth }
