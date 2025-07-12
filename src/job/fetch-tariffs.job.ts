import { WBApiService } from '../services/wb-api.service.js';
import { DatabaseService } from '../services/database.service.js';
import env from '../config/env/env.js';

export class FetchTariffsJob {
    private readonly wbApiService = new WBApiService();
    private readonly databaseService = new DatabaseService();
    private readonly maxRetries = 3;
    private readonly retryDelay = 5000; // 5 seconds

    async run(): Promise<void> {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < this.maxRetries) {
            attempt++;
            try {
                console.log(`[${new Date().toISOString()}] Попытка ${attempt}/${this.maxRetries}: Получение тарифов WB...`);
                
                const tariffs = await this.wbApiService.fetchTariffs();
                
                if (!tariffs?.length) {
                    console.warn('Получен пустой список тарифов от WB API');
                    return;
                }

                if (env.NODE_ENV === 'development') {
                    console.log('Пример тарифа:', {
                        date: tariffs[0].date,
                        warehouse: tariffs[0].warehouse_name,
                        delivery: tariffs[0].box_delivery_and_storage_expr
                    });
                }

                await this.databaseService.saveTariffs(tariffs);
                
                console.log(`[${new Date().toISOString()}] Успешно сохранено ${tariffs.length} тарифов`);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(`Ошибка в попытке ${attempt}:`, lastError.message);
                
                if (attempt < this.maxRetries) {
                    console.log(`Повторная попытка через ${this.retryDelay/1000} секунд...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        console.error(`[${new Date().toISOString()}] Все попытки завершились ошибкой`);
        throw lastError ?? new Error('Неизвестная ошибка в FetchTariffsJob');
    }

    /**
     * Метод для ручного запуска из командной строки
     */
    async runAsScript(): Promise<void> {
        try {
            await this.run();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    }
}

// Если наш файл запущен напрямую (не через импорт)
if (import.meta.url === `file://${process.argv[1]}`) {
    await new FetchTariffsJob().runAsScript();
}