# backend/seed_admin.py
"""
Script to seed the initial admin user.
Run this script directly to create the admin user: python seed_admin.py
"""
import asyncio
import logging
from config.settings import settings
from models.database import connect_to_mongo, close_mongo_connection
from models.user import UserRole, UserVerificationStatus
from repositories.user_repository import UserRepository
from utils.security import get_password_hash

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_admin():
    logger.info("Connecting to database...")
    await connect_to_mongo()
    try:
        # Fetch database object from models/database
        from models.database import database
        
        user_repo = UserRepository(database.get_database())
        email = "admin@verv.io"
        # Check if admin already exists
        if await user_repo.email_exists(email):
            logger.info(f"Admin user {email} already exists.")
            return

        logger.info(f"Creating admin user {email}...")
        
        hashed_password = get_password_hash("pwdadmin123")
        
        admin_data = {
            "email": email,
            "name": "Admin",
            "last_name": "Vervio",
            "hashed_password": hashed_password,
            "role": UserRole.ADMIN.value,
            "verification_status": UserVerificationStatus.VERIFIED.value
        }
        
        user_id = await user_repo.create(admin_data)
        logger.info(f"Successfully created admin user with ID: {user_id}")
        
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
    finally:
        logger.info("Closing database connection...")
        await close_mongo_connection()

if __name__ == "__main__":
    # Necesitamos estar seguros de que las variables de entorno se carguen (si se requiere)
    asyncio.run(seed_admin())
