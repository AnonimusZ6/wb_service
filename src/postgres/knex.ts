import _knex from "knex";
import knexConfig from "../config/knex/knexfile.js";
import env from "../config/env/env.js";

const knex = _knex(knexConfig);

// =============================================
// Типы данных и интерфейсы
// =============================================

export interface TariffRecord {
    id?: number;
    date: Date;
    warehouse_name: string;
    box_delivery_and_storage_expr: number | null;
    box_delivery_base: number | null;
    box_delivery_liter: number | null;
    box_storage_base: number | null;
    box_storage_liter: number | null;
    dt_till_max: string | null;
    dt_next_box: string | null;
    created_at: Date;
    updated_at: Date;
}

interface SpreadsheetRecord {
    spreadsheet_id: string;
}

// =============================================
// Репозиторий для работы с тарифами Wildberries
// =============================================

export const TariffsRepository = {
    async batchUpsert(
        tariffs: Omit<TariffRecord, 'id'|'created_at'|'updated_at'>[],
        batchSize = 100
    ): Promise<void> {
        if (!tariffs.length) {
            if (env.NODE_ENV === 'development') {
                console.log('Нет тарифов для обновления');
            }
            return;
        }

        await knex.transaction(async (trx) => {
            for (let i = 0; i < tariffs.length; i += batchSize) {
                const batch = tariffs.slice(i, i + batchSize);
                
                await trx('tariffs')
                    .insert(batch.map(t => ({
                        ...t,
                        created_at: knex.fn.now(),
                        updated_at: knex.fn.now()
                    })))
                    .onConflict(['date', 'warehouse_name'])
                    .merge({
                        box_delivery_and_storage_expr: knex.raw('EXCLUDED.box_delivery_and_storage_expr'),
                        box_delivery_base: knex.raw('EXCLUDED.box_delivery_base'),
                        box_delivery_liter: knex.raw('EXCLUDED.box_delivery_liter'),
                        box_storage_base: knex.raw('EXCLUDED.box_storage_base'),
                        box_storage_liter: knex.raw('EXCLUDED.box_storage_liter'),
                        dt_till_max: knex.raw('EXCLUDED.dt_till_max'),
                        dt_next_box: knex.raw('EXCLUDED.dt_next_box'),
                        updated_at: knex.fn.now()
                    });

                if (env.NODE_ENV === 'development') {
                    console.log(`Обработано ${Math.min(i + batchSize, tariffs.length)}/${tariffs.length} тарифов`);
                }
            }
        });
    },

    async getLatest(daysBack = 1): Promise<TariffRecord[]> {
        const date = new Date();
        date.setDate(date.getDate() - daysBack);
        date.setHours(0, 0, 0, 0);

        return knex('tariffs')
            .where('date', '>=', date)
            .orderBy([
                { column: 'box_delivery_and_storage_expr', order: 'asc' },
                { column: 'warehouse_name', order: 'asc' }
            ]);
    },

    async getWarehouseHistory(
        warehouseName: string, 
        daysPeriod = 7
    ): Promise<TariffRecord[]> {
        const date = new Date();
        date.setDate(date.getDate() - daysPeriod);
        
        return knex('tariffs')
            .where('warehouse_name', warehouseName)
            .where('date', '>=', date)
            .orderBy('date', 'desc');
    }
};

// =============================================
// Репозиторий для работы с Google таблицами
// =============================================

export const SpreadsheetsRepository = {
    async add(spreadsheetId: string): Promise<void> {
        await knex('spreadsheets')
            .insert({ spreadsheet_id: spreadsheetId })
            .onConflict('spreadsheet_id')
            .ignore();
    },

    async list(): Promise<SpreadsheetRecord[]> {
        return knex('spreadsheets').select('*');
    },

    async remove(spreadsheetId: string): Promise<number> {
        return knex('spreadsheets')
            .where('spreadsheet_id', spreadsheetId)
            .delete();
    }
};

// =============================================
// Вспомогательные функции
// =============================================

function logMigration(action: string, [batch, migrations]: [number, string[]]): void {
    if (!migrations.length) {
        console.log(action === 'down' 
            ? 'Нет миграций для отката' 
            : 'Все миграции уже применены');
        return;
    }

    console.log(`Пакет ${batch}: ${action === 'down' ? 'откачены' : 'применены'}:`);
    migrations.forEach(m => console.log(`- ${m}`));
}

function logMigrationStatus(completed: {name: string}[], pending: {file: string}[]): void {
    console.log('Завершенные миграции:', completed.length);
    completed.forEach(m => console.log(`- ${m.name}`));
    
    console.log('\nОжидающие миграции:', pending.length);
    pending.forEach(m => console.log(`- ${m.file}`));
}

// =============================================
// Экспорт
// =============================================

export const db = knex;

export const migrate = {
    async latest(): Promise<void> {
        const result = await knex.migrate.latest();
        logMigration('up', result);
    },
    async rollback(): Promise<void> {
        const result = await knex.migrate.rollback();
        logMigration('down', result);
    },
    async down(name?: string): Promise<void> {
        const result = await knex.migrate.down({ name });
        logMigration('down', result);
    },
    async up(name?: string): Promise<void> {
        const result = await knex.migrate.up({ name });
        logMigration('up', result);
    },
    async list(): Promise<void> {
        const list = await knex.migrate.list();
        logMigrationStatus(list[0], list[1]);
    },
    async make(name: string): Promise<string> {
        if (!name?.trim()) {
            throw new Error('Необходимо указать название миграции');
        }
        return knex.migrate.make(name, { extension: 'js' });
    }
};

export const seed = {
    async run(): Promise<void> {
        const [seeds] = await knex.seed.run();
        console.log(`Выполнено ${seeds.length} сидов:`);
        seeds.forEach(s => console.log(`- ${s.split('/').pop()}`));
    },
    async make(name: string): Promise<string> {
        if (!name?.trim()) {
            throw new Error('Необходимо указать название сида');
        }
        return knex.seed.make(name);
    }
};

export { knex };
export default knex;