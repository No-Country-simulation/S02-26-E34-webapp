# backend/models/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings
from typing import AsyncGenerator

# MongoDB client
client: AsyncIOMotorClient = None

def get_database() -> AsyncIOMotorClient:
    """Get MongoDB database instance"""
    return client[settings.MONGODB_DATABASE]

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()