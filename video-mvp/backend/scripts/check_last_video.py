
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

async def check_db():
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DATABASE", "video_vvc")
    
    print(f"Connecting to {mongodb_url}...")
    client = AsyncIOMotorClient(mongodb_url)
    db = client[mongodb_db]
    
    last_video = await db.videos.find_one(sort=[("_id", -1)])
    if last_video:
        print(f"Last video found:")
        print(f"ID: {last_video['_id']} (Type: {type(last_video['_id'])})")
        print(f"Filename: {last_video.get('filename')}")
        print(f"Status: {last_video.get('status')}")
    else:
        print("No videos found in database.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_db())
