from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = "$2b$12$l3h0h4uuShCKSOLkzc7IC.pNumVejetjkFrGL4Nr0i99AGifl5KKi"  # хэш из базы данных
result = pwd_context.verify("secret123", hashed)
print(result)  # Выведет True, если пароль совпадает, иначе False.
