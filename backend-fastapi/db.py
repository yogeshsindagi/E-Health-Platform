import os
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()  # load .env file

uri = os.getenv("MONGO_URI")

client = MongoClient(uri, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("MongoDB connected successfully!")
except Exception as e:
    print("MongoDB connection error:", e)

db = client["ehealth"]

##------------------- Hospitals -------------------##

hospitals_col = db["hospitals"]

##------------------- User -------------------##

users_col = db["users"]

##------------------ Data --------------------##

ehr_col = db["ehr_records"]
prescriptions_col = db["prescriptions"]
appointments_col = db["appointments"]
