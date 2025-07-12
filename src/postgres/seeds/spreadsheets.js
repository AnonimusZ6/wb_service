/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    // Проверяем существование таблицы
    const hasTable = await knex.schema.hasTable('spreadsheets');
    if (!hasTable) {
        console.log('Table "spreadsheets" does not exist, skipping seed');
        return;
    }

    try {
        await knex("spreadsheets")
            .insert([{ spreadsheet_id: "some_spreadsheet" }])
            .onConflict(["spreadsheet_id"])
            .ignore();
        console.log('Seed for "spreadsheets" completed successfully');
    } catch (error) {
        console.error('Error seeding "spreadsheets":', error);
    }
}