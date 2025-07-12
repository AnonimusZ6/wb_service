import axios from 'axios';
import { parseNumber } from '../utils/helpers.js';
import env from '../config/env/env.js';

interface WBApiResponse {
  response: {
    data: {
      dtNextBox: string;
      dtTillMax: string;
      warehouseList: Array<{
        boxDeliveryAndStorageExpr: string;
        boxDeliveryBase: string;
        boxDeliveryLiter: string;
        boxStorageBase: string;
        boxStorageLiter: string;
        warehouseName: string;
      }>;
    };
  };
}

export interface ParsedTariff {
  date: Date;
  warehouse_name: string;
  box_delivery_and_storage_expr: number | null;
  box_delivery_base: number | null;
  box_delivery_liter: number | null;
  box_storage_base: number | null;
  box_storage_liter: number | null;
  dt_till_max: string | null;
  dt_next_box: string | null;
}

export class WBApiService {
  private readonly apiUrl = 'https://common-api.wildberries.ru/api/v1/tariffs/box';
  private readonly apiKey = env.WB_API_KEY;
  private readonly requestTimeout = 10000;

  /**
   * Форматирует дату в строку yyyy-mm-dd
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Получает актуальные тарифы с API Wildberries
   * @param date Дата для получения тарифов (по умолчанию текущая дата)
   * @returns {Promise<ParsedTariff[]>} Массив распарсенных тарифов
   * @throws {Error} Если не удалось получить данные
   */
  async fetchTariffs(date: Date = new Date()): Promise<ParsedTariff[]> {
    try {
      if (!this.apiKey) {
        throw new Error('API ключ Wildberries не настроен (WB_API_KEY)');
      }

      const response = await axios.get<WBApiResponse>(this.apiUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          date: this.formatDate(date)
        },
        timeout: this.requestTimeout,
      });

      const parsedData = this.parseResponse(response.data, date);

      if (env.NODE_ENV === 'development') {
        console.log(`Получено ${parsedData.length} тарифов от WB API на дату ${this.formatDate(date)}`);
      }

      return parsedData;
    } catch (error) {
      const errorMessage = this.handleApiError(error);
      console.error('Ошибка при получении тарифов WB:', errorMessage);
      throw new Error(`WB API: ${errorMessage}`);
    }
  }

  /**
   * Парсит ответ от API Wildberries
   * @param data Ответ от API
   * @param date Дата тарифов
   * @returns {ParsedTariff[]} Массив структурированных данных
   */
  private parseResponse(data: WBApiResponse, date: Date): ParsedTariff[] {
    try {
      return data.response.data.warehouseList.map((warehouse) => ({
        date: new Date(date), // Используем переданную дату
        warehouse_name: warehouse.warehouseName,
        box_delivery_and_storage_expr: this.parseWBNumber(warehouse.boxDeliveryAndStorageExpr),
        box_delivery_base: this.parseWBNumber(warehouse.boxDeliveryBase),
        box_delivery_liter: this.parseWBNumber(warehouse.boxDeliveryLiter),
        box_storage_base: this.parseWBNumber(warehouse.boxStorageBase),
        box_storage_liter: this.parseWBNumber(warehouse.boxStorageLiter),
        dt_till_max: data.response.data.dtTillMax || null,
        dt_next_box: data.response.data.dtNextBox || null,
      }));
    } catch (parseError) {
      console.error('Ошибка парсинга ответа WB API:', parseError);
      throw new Error('Неверный формат данных от WB API');
    }
  }

  /**
   * Обрабатывает числовые значения из API Wildberries
   * @param value Строковое значение числа
   * @returns {number | null} Распарсенное число или null
   */
  private parseWBNumber(value: string): number | null {
    if (!value || value === '-') return null;
    return parseNumber(value.replace(',', '.'));
  }

  /**
   * Обрабат��вает ошибки API
   * @param error Объект ошибки
   * @returns {string} Человекочитаемое сообщение об ошибке
   */
  private handleApiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.data?.message || 'Ошибка сервера'}`;
      }
      return error.message;
    }
    return error instanceof Error ? error.message : 'Неизвестная ошибка';
  }
}
