# operator.py (запускает в службе telegram bot и создает, рестартит и тд контейнеры клиентов)

import time
import subprocess
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Client

CHECK_INTERVAL = 10  # каждые 10 секунд проверяем (можно менять)


def main_loop():
    """Основной цикл оператора."""
    while True:
        db: Session = SessionLocal()
        try:
            # 1. Ищем клиентов, у которых bot_status == 'requested'
            clients_to_launch = db.query(Client).filter(Client.bot_status == "requested").all()
            if not clients_to_launch:
                print("[Operator] No clients found with bot_status='requested'")
            else:
                for client in clients_to_launch:
                    print(f"[Operator] Found client #{client.id} with bot_status='requested'. Launching container...")

                    container_name = f"bot-client-{client.id}"
                    subprocess.run(["docker", "rm", "-f", container_name], check=False)
                    cmd = [
                        "docker", "run", "-d",
                        "--name", container_name,
                        "--network", "catalog_default",
                        "-e", f"TELEGRAM_BOT_TOKEN={client.telegram_token}",
                        "-e", f"CLIENT_ID={client.id}",
                        "-e", f"BOT_SECRET={client.bot_secret}",
                        "-e", "API_BASE_URL=http://backend:8000/api",
                        "my-bot:latest"  # <-- имя образа бота
                    ]
                    print(f"[Operator] Running command: {' '.join(cmd)}")

                    proc = subprocess.run(cmd, capture_output=True, text=True)
                    if proc.returncode == 0:
                        client.bot_status = "running"
                        print(f"[Operator] Container '{container_name}' запущен (id={proc.stdout.strip()}).")
                    else:
                        client.bot_status = "error"
                        print(f"[Operator] Ошибка запуска контейнера: {proc.stderr.strip()}")

                    db.commit()

            # 2. Ищем клиентов, у которых bot_status == 'restart_requested'
            #    Если нужно реализовать "перезапуск", убиваем старый контейнер, потом запускаем заново.
            clients_to_restart = db.query(Client).filter(Client.bot_status == "restart_requested").all()
            if not clients_to_restart:
                pass  # нет клиентов на перезапуск
            else:
                for client in clients_to_restart:
                    print(f"[Operator] Found client #{client.id} with bot_status='restart_requested'. Restarting...")

                    container_name = f"bot-client-{client.id}"
                    # Сначала удаляем старый контейнер
                    subprocess.run(["docker", "rm", "-f", container_name], check=False)

                    cmd = [
                        "docker", "run", "-d",
                        "--name", container_name,
                        "-e", f"TELEGRAM_BOT_TOKEN={client.telegram_token}",
                        "-e", f"CLIENT_ID={client.id}",
                        "-e", "API_BASE_URL=http://168.119.97.26:8000/api",
                        "my-bot:latest"
                    ]
                    print(f"[Operator] Restarting container with command: {' '.join(cmd)}")

                    proc = subprocess.run(cmd, capture_output=True, text=True)
                    if proc.returncode == 0:
                        client.bot_status = "running"
                        print(f"[Operator] Container '{container_name}' перезапущен (id={proc.stdout.strip()}).")
                    else:
                        client.bot_status = "error"
                        print(f"[Operator] Ошибка перезапуска контейнера: {proc.stderr.strip()}")

                    db.commit()

        finally:
            db.close()

        # Ждём несколько секунд, повторяем
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    print("[Operator] Start operator loop...")
    main_loop()
