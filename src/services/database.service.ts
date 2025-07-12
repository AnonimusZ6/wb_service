import { db, TariffRecord } from '../postgres/knex.js';
import { ParsedTariff } from '../services/wb-api.service.js';
import env from '../config/env/env.js';
import { performance } from 'perf_hooks';

export class DatabaseService {
    private readonly CHUNK_SIZE = 100;
    private readonly QUERY_TIMEOUT = 10000;

    /**
     * Проверяет существование таблицы tariffs
     * @throws {Error} Если таблица не существует
     */
    private async ensureTariffsTableExists(): Promise<void> {
        try {
            const startTime = performance.now();
            const tableExists = await db.schema.hasTable('tariffs');
            const duration = performance.now() - startTime;

            if (!tableExists) {
                throw new Error('Таблица tariffs не существует. Проверьте выполненные миграции.');
            }

            if (env.NODE_ENV === 'development') {
                console.log(`Проверка существования таблицы tariffs выполнена за ${duration.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error('Ошибка проверки существования таблицы tariffs:', error);
            throw new Error('Не удалось проверить существование таблицы tariffs');
        }
    }

    /**
     * Сохраняет или обновляет тарифы в базе данных с обработкой больших объемов данных
     * @param tariffs Массив тарифов для сохранения
     * @throws {Error} Если произошла ошибка при сохранении
     */
    async saveTariffs(tariffs: ParsedTariff[]): Promise<void> {
        if (!tariffs.length) {
            console.log('Нет данных для сохранения');
            return;
        }

        const startTime = performance.now();
        try {
            await this.ensureTariffsTableExists();

            // Статистика по складам
            const warehouseStats = new Map<string, number>();
            tariffs.forEach(t => {
                warehouseStats.set(t.warehouse_name, (warehouseStats.get(t.warehouse_name) || 0) + 1);
            });

            await db.transaction(async (trx) => {
                const totalChunks = Math.ceil(tariffs.length / this.CHUNK_SIZE);
                
                for (let i = 0; i < tariffs.length; i += this.CHUNK_SIZE) {
                    const chunk = tariffs.slice(i, i + this.CHUNK_SIZE);
                    const chunkNumber = Math.ceil(i / this.CHUNK_SIZE) + 1;
                    
                    const chunkStartTime = performance.now();
                    await trx('tariffs')
                        .insert(chunk.map(tariff => ({
                            ...tariff,
                            created_at: db.fn.now(),
                            updated_at: db.fn.now(),
                        })))
                        .onConflict(['date', 'warehouse_name'])
                        .merge({
                            box_delivery_and_storage_expr: db.raw('EXCLUDED.box_delivery_and_storage_expr'),
                            box_delivery_base: db.raw('EXCLUDED.box_delivery_base'),
                            box_delivery_liter: db.raw('EXCLUDED.box_delivery_liter'),
                            box_storage_base: db.raw('EXCLUDED.box_storage_base'),
                            box_storage_liter: db.raw('EXCLUDED.box_storage_liter'),
                            dt_till_max: db.raw('EXCLUDED.dt_till_max'),
                            dt_next_box: db.raw('EXCLUDED.dt_next_box'),
                            updated_at: db.fn.now(),
                        })
                        .timeout(this.QUERY_TIMEOUT);

                    const chunkDuration = performance.now() - chunkStartTime;
                    console.log(`[${chunkNumber}/${totalChunks}] Сохранено ${chunk.length} тарифов за ${chunkDuration.toFixed(2)}ms`);
                }
            });

            const duration = performance.now() - startTime;
            console.log(`Успешно сохранено ${tariffs.length} тарифов за ${duration.toFixed(2)}ms`);

            if (env.NODE_ENV === 'development') {
                console.log('Статистика по складам:');
                warehouseStats.forEach((count, warehouse) => {
                    console.log(`- ${warehouse}: ${count} тарифов`);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения тарифов:', error instanceof Error ? error.message : error);
            throw new Error('Не удалось сохранить тарифы в базу данных');
        }
    }

    /**
     * Получает актуальные тарифы (начиная с текущей даты) с кэшированием
     * @returns {Promise<TariffRecord[]>} Массив актуальных тарифов
     * @throws {Error} Если произошла ошибка при получении данных
     */
    async getLatestTariffs(): Promise<TariffRecord[]> {
        const startTime = performance.now();
        try {
            await this.ensureTariffsTableExists();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tariffs = await db('tariffs')
                .where('date', '>=', today)
                .orderBy([
                    { column: 'date', order: 'asc' },
                    { column: 'warehouse_name', order: 'asc' }
                ])
                .timeout(this.QUERY_TIMEOUT);

            const duration = performance.now() - startTime;
            console.log(`Получено ${tariffs.length} актуальных тарифов за ${duration.toFixed(2)}ms`);

            return tariffs;
        } catch (error) {
            console.error('Ошибка получения тарифов:', error instanceof Error ? error.message : error);
            throw new Error('Не удалось получить тарифы из базы данных');
        }
    }

    /**
     * Получает тарифы за указанный период с пагинацией
     * @param from Начальная дата периода
     * @param to Конечная дата периода (опционально)
     * @param limit Ограничение количества записей (опционально)
     * @param offset Смещение (опционально)
     * @returns {Promise<TariffRecord[]>} Массив тарифов за период
     * @throws {Error} Если произошла ошибка при получении данных
     */
    async getTariffsByPeriod(
        from: Date,
        to?: Date,
        limit?: number,
        offset?: number
    ): Promise<TariffRecord[]> {
        try {
            await this.ensureTariffsTableExists();

            const query = db('tariffs')
                .where('date', '>=', from)
                .orderBy([
                    { column: 'date', order: 'asc' },
                    { column: 'warehouse_name', order: 'asc' }
                ])
                .timeout(this.QUERY_TIMEOUT);

            if (to) {
                query.where('date', '<=', to);
            }
            if (limit) {
                query.limit(limit);
            }
            if (offset) {
                query.offset(offset);
            }

            return await query;
        } catch (error) {
            console.error('Ошибка получения тарифов за период:', error instanceof Error ? error.message : error);
            throw new Error('Не удалось получить тарифы за указанный период');
        }
    }

    /**
     * Проверяет наличие хотя бы одного тарифа в базе
     * @returns {Promise<boolean>} true если есть хотя бы один тариф
     */
    async hasAnyTariffs(): Promise<boolean> {
        try {
            await this.ensureTariffsTableExists();
            const result = await db('tariffs')
                .select('id')
                .limit(1)
                .first()
                .timeout(this.QUERY_TIMEOUT);
            return !!result;
        } catch (error) {
            console.error('Ошибка проверки наличия тарифов:', error);
            return false;
        }
    }

    /**
     * Получает уникальные даты, для которых есть тарифы в базе
     * @returns {Promise<Date[]>} Массив уникальных дат
     */
    async getAvailableDates(): Promise<Date[]> {
        try {
            const dates = await db('tariffs')
                .distinct('date')
                .orderBy('date', 'desc')
                .timeout(this.QUERY_TIMEOUT);
            return dates.map(d => d.date);
        } catch (error) {
            console.error('Ошибка получения списка дат:', error);
            return [];
        }
    }

    /**
     * Получает список уникальных складов
     * @returns {Promise<string[]>} Массив названий складов
     */
    async getWarehouseList(): Promise<string[]> {
        try {
            const warehouses = await db('tariffs')
                .distinct('warehouse_name')
                .orderBy('warehouse_name', 'asc')
                .timeout(this.QUERY_TIMEOUT);
            return warehouses.map(w => w.warehouse_name);
        } catch (error) {
            console.error('Ошибка получения списка складов:', error);
            return [];
        }
    }
}