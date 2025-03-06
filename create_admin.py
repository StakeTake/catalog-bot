
# create_admin.py (это отдельно для создания пользователей)
from app import models, auth, database
from app.database import SessionLocal, engine, Base, get_db
import secrets

Base.metadata.create_all(bind=engine)

def create_admin(username, password, client_name):
    db = SessionLocal()
    try:
        client = db.query(models.Client).filter_by(name=client_name).first()
        if not client:
            client = models.Client(name=client_name)
            # Генерируем и присваиваем секрет для бота
            client.bot_secret = secrets.token_urlsafe(32)
            db.add(client)
            db.commit()
            db.refresh(client)
        
        hashed_password = auth.get_password_hash(password)
        # При создании admin передаём дополнительное поле telegram_id
        admin = models.AdminUser(
            username=username,
            hashed_password=hashed_password,
            client_id=client.id,
            telegram_id=620753358  # Добавляем значение telegram_id
        )
        db.add(admin)
        db.commit()
        print(f"Created admin user '{username}' for client '{client_name}' with telegram_id 620753358")
    finally:
        db.close()

if __name__ == "__main__":
    # Здесь вставляем ваши данные
    create_admin("root2", "root2", "seconddClient")
