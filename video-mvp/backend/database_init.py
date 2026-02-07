# backend/database_init.py
from models.database import engine, Base
from models.video import VideoDB

def init_database():
    """
    Inicializa la base de datos creando todas las tablas
    """
    print("Inicializando base de datos...")
    Base.metadata.create_all(bind=engine)
    print("Base de datos inicializada correctamente.")

if __name__ == "__main__":
    init_database()