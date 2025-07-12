/**
 * Парсит строку в число, заменяя запятые на точки
 * @param value Строка для парсинга
 * @returns {number | null} Распарсенное число или null
 */
export function parseNumber(value: string): number | null {
  if (!value || value.trim() === '-' || value.trim() === '') return null;
  const parsed = parseFloat(value.replace(',', '.').trim());
  return isNaN(parsed) ? null : parsed;
}