
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

async def check_video(video_id_str):
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DATABASE", "videodb")
    
    print(f"Connecting to {mongodb_url}...")
    client = AsyncIOMotorClient(mongodb_url)
    db = client[mongodb_db]
    
    video = await db.videos.find_one({"_id": ObjectId(video_id_str)})
    if video:
        print(f"Video found:")
        print(video)
    else:
        print(f"Video {video_id_str} NOT found.")
        # Try finding by string ID just in case
        video_str = await db.videos.find_one({"_id": video_id_str})
        if video_str:
            print(f"Video found by STRING ID:")
            print(video_str)
        else:
            # Let's see some videos
            print("Listing last 5 videos:")
            async for v in db.videos.find().sort("_id", -1).limit(5):
                print(f"ID: {v['_id']} (Type: {type(v['_id'])}) - Status: {v.get('status')}")
    
    client.close()

if __name__ == "__main__":
    import sys
    vid = sys.argv[1] if len(sys.argv) > 1 else "698e26557e3a5a9b54a8337f"
    asyncio.run(check_video(vid))
