# backend/database_init.py
from models.database import connect_to_mongo, get_database
from models.video import VideoDocument
import asyncio

async def init_database():
    """
    Inicializa la base de datos MongoDB
    """
    print("Conectando a MongoDB...")
    await connect_to_mongo()
    
    db = get_database()
    
    # Create indexes for better performance
    await db.videos.create_index("original_filename")
    await db.videos.create_index("title")
    await db.videos.create_index("status")
    await db.videos.create_index("_id")
    
    print("Índices creados correctamente.")
    print("Base de datos MongoDB inicializada correctamente.")

if __name__ == "__main__":
    asyncio.run(init_database())