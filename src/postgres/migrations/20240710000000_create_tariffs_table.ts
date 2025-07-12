import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('tariffs', (table) => {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.string('warehouse_name').notNullable();
        table.decimal('box_delivery_and_storage_expr', 10, 2).nullable();
        table.decimal('box_delivery_base', 10, 2).nullable();
        table.decimal('box_delivery_liter', 10, 2).nullable();
        table.decimal('box_storage_base', 10, 2).nullable();
        table.decimal('box_storage_liter', 10, 2).nullable();
        table.string('dt_till_max').nullable();
        table.string('dt_next_box').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        
        table.unique(['date', 'warehouse_name']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('tariffs');
}