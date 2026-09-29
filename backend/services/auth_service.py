"""Small MongoDB-backed administrator authentication service."""
import base64
import hashlib
import hmac
import os
import secrets

from pymongo import MongoClient
from pymongo.errors import PyMongoError


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_b64, digest_b64 = encoded.split("$", 2)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


class AuthService:
    def __init__(self) -> None:
        self.client = MongoClient(os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017"), serverSelectionTimeoutMS=2500)
        self.users = self.client[os.getenv("MONGODB_DB", "stormsense")]["users"]

    def ensure_admin(self) -> bool:
        """Create the configured demonstration administrator once, if MongoDB is reachable."""
        try:
            self.client.admin.command("ping")
            username = os.getenv("ADMIN_USERNAME", "admin")
            email = os.getenv("ADMIN_EMAIL", "admin123@gmail.com").lower()
            password = os.getenv("ADMIN_PASSWORD", "admin123")
            self.users.update_one(
                {"username": username},
                {"$setOnInsert": {"username": username, "email": email, "password_hash": _hash_password(password), "role": "administrator"}},
                upsert=True,
            )
            self.users.create_index("email", unique=True)
            return True
        except PyMongoError:
            return False

    def authenticate(self, identity: str, password: str) -> dict | None:
        try:
            self.ensure_admin()
            user = self.users.find_one({"$or": [{"username": identity}, {"email": identity.lower()}]})
            if not user or not _verify_password(password, user.get("password_hash", "")):
                return None
            return {"username": user["username"], "email": user["email"], "role": user.get("role", "administrator")}
        except PyMongoError as exc:
            raise ConnectionError("MongoDB is unavailable") from exc
