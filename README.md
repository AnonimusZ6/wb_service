# Сервис для работы с тарифами Wildberries и Google Таблицами

## Описание Проекта

Этот проект представляет собой Node.js сервис, разработанный для автоматизации двух ключевых задач:

1.  **Регулярное получение информации о тарифах Wildberries (WB)**: Сервис подключается к API Wildberries, получает актуальные данные о тарифах на доставку и хранение коробов, и сохраняет их в базе данных PostgreSQL. Данные обновляются ежедневно, при этом существующие записи обновляются, а новые добавляются.
2.  **Регулярное обновление Google Таблиц**: Полученные и сохраненные в базе данных актуальные тарифы автоматически экспортируются в указанные Google Таблицы, обеспечивая доступность свежих данных для анализа или других целей.

Проект использует Docker Compose для развертывания базы данных PostgreSQL и самого Node.js приложения, а также node-cron для планирования задач.

## Задачи Сервиса

*   **Ежедневное получение тарифов WB**: Автоматически запрашивает тарифы с WB API и сохраняет их в БД.
*   **Ежедневное обновление Google Таблиц**: Экспортирует последние тарифы из БД в Google Таблицы.
*   **Первоначальный запуск**: При старте приложения обе задачи выполняются один раз для инициализации данных, после чего запускается регулярное расписание.

## Технологии

*   **Node.js**
*   **TypeScript**
*   **PostgreSQL**
*   **Knex.js** (ORM для работы с БД)
*   **Docker & Docker Compose**
*   **node-cron** (для планирования задач)
*   **Google APIs Node.js Client** (для работы с Google Sheets)
*   **Axios** (для HTTP-запросов к WB API)

## Начало Работы

Для запуска проекта вам потребуется установленный [Docker](https://www.docker.com/get-started/) и [Docker Compose](https://docs.docker.com/compose/install/).


### 1. Клонирование Репозитория

```bash
git clone https://github.com/AnonimusZ6/wb_service.git
```

### 2. Настройка Переменных Окружения (`.env`)

Переименуйте файл `.env.example` в `.env` в корневой директории проекта (рядом с `compose.yaml`). Этот файл будет содержать все необходимые конфигурационные данные, **без этого Docker Compose не запустится**.

Все значения должны быть указаны без кавычек, если это не часть JSON-строки.

```
# Конфигурация Базы Данных PostgreSQL
# =============================================================================
# Хост PostgreSQL. В Docker Compose используйте 'postgres' как имя сервиса.
POSTGRES_HOST=postgres
# Порт PostgreSQL.
POSTGRES_PORT=5432
# Имя базы данных.
POSTGRES_DB=postgres
# Имя пользователя базы данных.
POSTGRES_USER=postgres
# Пароль пользователя базы данных.
POSTGRES_PASSWORD=postgres

# Конфигурация Приложения
# =============================================================================
# Порт, на котором будет работать приложение.
APP_PORT=3000
# Режим окружения: 'development', 'production' или 'test'.
# Влияет на логирование и поведение Knex.js.
NODE_ENV=development


# Ключ API Wildberries
# =============================================================================
# Ваш API ключ для доступа к тарифам Wildberries.
# Получить его можно в личном кабинете продавца WB.
WB_API_KEY=ВАШ_WB_API_КЛЮЧ_ЗДЕСЬ


# Учетные Данные Google Sheets API
# =============================================================================
# JSON-строка с учетными данными сервисного аккаунта Google.
#
# Как получить:
# 1. Перейдите в Google Cloud Console: https://console.cloud.google.com/
# 2. Создайте новый проект или выберите существующий.
# 3. Включите Google Sheets API для вашего проекта (API & Services -> Enabled APIs & Services).
# 4. Создайте сервисный аккаунт (IAM & Admin -> Service Accounts).
# 5. Создайте новый ключ для сервисного аккаунта в формате JSON (Keys -> Add Key -> Create new key -> JSON).
# 6. Скачайте JSON-файл.
# 7. Откройте скачанный JSON-файл и скопируйте его содержимое.
# 8. Преобразуйте скопированный JSON в одну строку, заменив все символы новой строки (`\n`) на `\\n`.
#    Или используйте онлайн-инструмент для форматирования JSON в одну строку с экранированием.
#    Затем вставьте полученную строку сюда.
#
# Пример правильного формата (замените на ваш реальный JSON):
# GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_CONTENT\\n-----END PRIVATE KEY-----\\n","client_email":"your-service-account-email@your-project-id.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40your-project-id.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
GOOGLE_CREDENTIALS=ВАШ_GOOGLE_КРЕДЕНЦИАЛЫ_В_ОДНОЙ_СТРОКЕ_С_ЭКРАНИРОВАННЫМИ_ПЕРЕНОСАМИ_СТРОК

# ID Google Таблиц
# =============================================================================
# Список ID Google Таблиц, которые будут обновляться.
# Разделяйте ID запятыми без пробелов.
# Чтобы найти ID таблицы, откройте её в браузере. ID находится в URL:
# https://docs.google.com/spreadsheets/d/ВАШ_ID_ТАБЛИЦЫ/edit
#
# Убедитесь, что сервисный аккаунт (client_email из GOOGLE_CREDENTIALS)
# имеет права РЕДАКТОРА на эти таблицы.
GOOGLE_SHEET_IDS=ID_ТАБЛИЦЫ_1,ID_ТАБЛИЦЫ_2,ID_ТАБЛИЦЫ_3

# Расписание Cron Задач
# =============================================================================
# Cron-выражение для обновления тарифов WB.
# По умолчанию: "0 * * * *" (каждый час в 0 минут).
# Пример для каждых 10 секунд: "*/10 * * * * *" (обратите внимание на 6-й символ для секунд)
TARIFFS_UPDATE_CRON=0 * * * *

# Cron-выражение для обновления Google Таблиц.
# По умолчанию: "0 * * * *" (каждый час в 0 минут).
# Пример для каждых 15 секунд: "*/15 * * * * *"
SHEETS_UPDATE_CRON=0 * * * *
```

### 3. Запуск Docker Compose
```bash
docker compose up
```


### 4. Результат запуска скрипта
![GoogleSheets](https://github.com/user-attachments/assets/e8294d13-8d24-4a20-880c-8b4fe154becd)
*Изображение Google sheets с тарифами вб*
