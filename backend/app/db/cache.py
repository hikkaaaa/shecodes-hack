import hashlib
import json
from typing import Dict, Any, Optional

class CacheManager:
    """ Mock In-Memory Redis Implementation """
    _store: Dict[str, Any] = {}

    @classmethod
    def get_key(cls, files: Dict[str, str], intent: str) -> str:
        # Sort files to ensure stable hash
        payload_str = json.dumps({"files": files, "intent": intent}, sort_keys=True)
        return hashlib.sha256(payload_str.encode()).hexdigest()

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        return cls._store.get(key)

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = 3600):
        # We ignore TTL for this memory mock but in prod would clear it
        cls._store[key] = value

    @classmethod
    def clear(cls):
        cls._store.clear()
