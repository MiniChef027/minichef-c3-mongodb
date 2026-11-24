from pymongo import MongoClient


class MongoConnection:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "minichef_db"):
        self.uri = uri
        self.db_name = db_name
        self.client = None
        self.db = None

    def connect(self):
        self.client = MongoClient(self.uri)
        self.db = self.client[self.db_name]
        return self.db

    def close(self):
        if self.client is not None:
            self.client.close()
            self.client = None
            self.db = None