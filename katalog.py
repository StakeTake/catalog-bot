# katalog.py служит в 1ю очередь для создания image который создается с помощью файла, затем оператор.py этими image создает ботов как я понимаю)
import logging
import os
import requests

from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes

logging.basicConfig(level=logging.INFO)

# Загружаем .env
load_dotenv()

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api")
CLIENT_ID = os.environ.get("CLIENT_ID")
BOT_SECRET = os.environ.get("BOT_SECRET")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик команды /start:
    1. Загружаем список категорий (public/categories/?client_id=...)
    2. Показываем кнопки с категориями.
    """
    try:
        url = f"{API_BASE_URL}/public/categories/?client_id={CLIENT_ID}&secret={BOT_SECRET}"
        response = requests.get(url)
        response.raise_for_status()
        categories = response.json()
    except Exception as e:
        logging.error("Ошибка при получении категорий: %s", e)
        await update.message.reply_text("Ошибка загрузки данных (категорий).")
        return

    if not categories:
        await update.message.reply_text("Категории не найдены.")
        return

    # Формируем inline-кнопки для категорий
    keyboard = []
    for cat in categories:
        keyboard.append([
            InlineKeyboardButton(cat["name"], callback_data=f"category_{cat['id']}")
        ])

    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Выберите категорию:", reply_markup=reply_markup)

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик нажатия inline-кнопок.
    """
    query = update.callback_query
    await query.answer()
    data = query.data

    # Нажали на "category_{cat_id}"
    if data.startswith("category_"):
        cat_id = data.split("_")[1]
        try:
            url = f"{API_BASE_URL}/public/products/?client_id={CLIENT_ID}&secret={BOT_SECRET}&category_id={cat_id}"
            response = requests.get(url)
            response.raise_for_status()
            products = response.json()
        except Exception as e:
            logging.error("Ошибка при получении продуктов: %s", e)
            await query.edit_message_text("Ошибка загрузки продуктов.")
            return

        if not products:
            await query.edit_message_text("В этой категории нет товаров.")
            return

        keyboard = []
        for prod in products:
            keyboard.append([
                InlineKeyboardButton(prod["title"], callback_data=f"product_{prod['id']}")
            ])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text("Выберите продукт:", reply_markup=reply_markup)

    # Нажали на "product_{prod_id}"
    elif data.startswith("product_"):
        prod_id = data.split("_")[1]

        # 1) Получаем список методов оплаты /payment/
        #    (Можно брать без авторизации? Или мы сказали, что BOT_SECRET = Bearer?)
        #    Сейчас используем авторизацию через BOT_SECRET:
        payment_list_url = f"{API_BASE_URL}/payment/"
        headers = {"Authorization": f"Bearer {BOT_SECRET}"}

        try:
            resp = requests.get(payment_list_url, headers=headers)
            resp.raise_for_status()
            payment_configs = resp.json()  # список провайдеров
        except Exception as e:
            logging.error("Ошибка при получении списка провайдеров: %s", e)
            await query.edit_message_text("Ошибка при загрузке методов оплаты.")
            return

        # Если нет ни одного метода оплаты у клиента:
        if not payment_configs:
            await query.edit_message_text("Нет доступных способов оплаты.")
            return

        # Если только один способ оплаты — сразу создаём оплату
        if len(payment_configs) == 1:
            provider_name = payment_configs[0]["provider_name"]
            await create_payment_and_show_link(query, prod_id, provider_name)
            return
        else:
            # Иначе предлагаем кнопки для выбора провайдера
            keyboard = []
            for cfg in payment_configs:
                provider_name = cfg["provider_name"]
                btn_text = f"Оплата через {provider_name.title()}"
                callback = f"pay_{prod_id}_{provider_name}"
                keyboard.append([InlineKeyboardButton(btn_text, callback_data=callback)])

            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text("Выберите способ оплаты:", reply_markup=reply_markup)

    # Нажали на "pay_{prod_id}_{provider_name}"
    elif data.startswith("pay_"):
        # Пример: "pay_123_coinpayments"
        parts = data.split("_", 2)  # pay, prod_id, provider
        if len(parts) < 3:
            await query.edit_message_text("Некорректные данные callback.")
            return

        _, prod_id, provider_name = parts
        await create_payment_and_show_link(query, prod_id, provider_name)

    else:
        # Неизвестная callback_data
        await query.edit_message_text("Неизвестная команда.")

async def create_payment_and_show_link(query, product_id, provider_name):
    """
    Общая функция для создания оплаты через API и отправки ссылки пользователю.
    """
    try:
        url = f"{API_BASE_URL}/payment/create_payment/"
        headers = {"Authorization": f"Bearer {BOT_SECRET}"}
        # Параметры для POST
        params = {"product_id": int(product_id), "provider_name": provider_name}

        response = requests.post(url, headers=headers, json=params)
        response.raise_for_status()
        resp_data = response.json()
        payment_url = resp_data["payment_url"]
        order_id = resp_data["order_id"]

        # Формируем сообщение
        text = f"Заказ #{order_id} создан. Оплатите по ссылке:\n{payment_url}"
        # Можно прикрепить Inline-кнопку "Оплатить"
        keyboard = [[InlineKeyboardButton("Оплатить", url=payment_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup)

    except Exception as e:
        logging.error("Ошибка при создании оплаты: %s", e)
        await query.edit_message_text("Ошибка при создании оплаты.")

def main():
    if not TELEGRAM_BOT_TOKEN:
        logging.error("Не найден TELEGRAM_BOT_TOKEN в окружении!")
        exit(1)

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button))

    logging.info("Бот запущен. Ожидаем команды в Telegram.")
    app.run_polling()

if __name__ == '__main__':
    main()
