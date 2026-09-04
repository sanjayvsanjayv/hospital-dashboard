"""
Database connection manager.
Primary: MongoDB (Atlas or local).
Fallback: In-memory JSON store so the app runs without any DB installed.
"""

import os
import json
import copy
from datetime import datetime, timezone

# ─────────────────────────────────────────────
# Attempt MongoDB connection
# ─────────────────────────────────────────────
_mongo_client = None
_mongo_db = None
_use_fallback = False


def _try_mongo():
    global _mongo_client, _mongo_db, _use_fallback
    uri = os.getenv("MONGODB_URI", "")
    db_name = os.getenv("DB_NAME", "hospital_dashboard")
    force_fallback = os.getenv("USE_LOCAL_FALLBACK", "false").lower() == "true"
    if force_fallback or not uri:
        _use_fallback = True
        return
    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        _mongo_client.admin.command("ping")   # quick connectivity check
        _mongo_db = _mongo_client[db_name]
        _use_fallback = False
        print("[DB] Connected to MongoDB.")
    except Exception as exc:
        print(f"[DB] MongoDB unavailable ({exc}), switching to in-memory fallback.")
        _use_fallback = True


# ─────────────────────────────────────────────
# In-memory fallback collections
# ─────────────────────────────────────────────
_store: dict = {
    "users": [],
    "patients": [],
    "tests": [],
    "alerts": [],
    "beds": [],
    "consent": [],
    "escalations": [],
    "metrics": [],
}

_id_counters: dict = {k: 1 for k in _store}


def _next_id(collection: str) -> str:
    cid = _id_counters.get(collection, 1)
    _id_counters[collection] = cid + 1
    return f"{collection[:3].upper()}-{cid:05d}"


class _FallbackCollection:
    """Minimal MongoDB-Collection-like interface backed by a list."""

    def __init__(self, name: str):
        self._name = name

    @property
    def _data(self):
        return _store[self._name]

    # ── helpers ──────────────────────────────
    @staticmethod
    def _match(doc: dict, filt: dict) -> bool:
        for k, v in filt.items():
            if k == "$or":
                if not any(_FallbackCollection._match(doc, sub) for sub in v):
                    return False
            elif k == "$and":
                if not all(_FallbackCollection._match(doc, sub) for sub in v):
                    return False
            elif isinstance(v, dict):
                doc_val = doc.get(k)
                for op, operand in v.items():
                    if op == "$in" and doc_val not in operand:
                        return False
                    elif op == "$gt" and not (doc_val is not None and doc_val > operand):
                        return False
                    elif op == "$gte" and not (doc_val is not None and doc_val >= operand):
                        return False
                    elif op == "$lt" and not (doc_val is not None and doc_val < operand):
                        return False
                    elif op == "$lte" and not (doc_val is not None and doc_val <= operand):
                        return False
                    elif op == "$ne" and doc_val == operand:
                        return False
                    elif op == "$exists":
                        if operand and k not in doc:
                            return False
                        if not operand and k in doc:
                            return False
                    elif op == "$regex":
                        import re
                        if not re.search(operand, str(doc_val or ""), re.IGNORECASE):
                            return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    # ── CRUD ─────────────────────────────────
    def find_one(self, filt=None, *args, **kwargs):
        filt = filt or {}
        for doc in self._data:
            if self._match(doc, filt):
                return copy.deepcopy(doc)
        return None

    def find(self, filt=None, *args, **kwargs):
        filt = filt or {}
        return [copy.deepcopy(d) for d in self._data if self._match(d, filt)]

    def insert_one(self, doc: dict):
        d = copy.deepcopy(doc)
        if "_id" not in d:
            d["_id"] = _next_id(self._name)
        self._data.append(d)

        class _Res:
            inserted_id = d["_id"]
        return _Res()

    def insert_many(self, docs: list):
        ids = []
        for doc in docs:
            res = self.insert_one(doc)
            ids.append(res.inserted_id)

        class _Res:
            inserted_ids = ids
        return _Res()

    def update_one(self, filt: dict, update: dict, upsert=False):
        for i, doc in enumerate(self._data):
            if self._match(doc, filt):
                if "$set" in update:
                    self._data[i].update(update["$set"])
                if "$push" in update:
                    for k, v in update["$push"].items():
                        self._data[i].setdefault(k, []).append(v)
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        self._data[i][k] = self._data[i].get(k, 0) + v

                class _Res:
                    matched_count = 1
                    modified_count = 1
                return _Res()
        if upsert:
            new_doc = {}
            if "$set" in update:
                new_doc.update(update["$set"])
            new_doc.update(filt)
            self.insert_one(new_doc)

        class _Res:
            matched_count = 0
            modified_count = 0
        return _Res()

    def update_many(self, filt: dict, update: dict):
        count = 0
        for i, doc in enumerate(self._data):
            if self._match(doc, filt):
                if "$set" in update:
                    self._data[i].update(update["$set"])
                count += 1

        class _Res:
            modified_count = count
        return _Res()

    def delete_one(self, filt: dict):
        for i, doc in enumerate(self._data):
            if self._match(doc, filt):
                self._data.pop(i)

                class _Res:
                    deleted_count = 1
                return _Res()

        class _Res:
            deleted_count = 0
        return _Res()

    def delete_many(self, filt: dict):
        before = len(self._data)
        self._data[:] = [d for d in self._data if not self._match(d, filt)]

        class _Res:
            deleted_count = before - len(_store[self._name])
        return _Res()

    def count_documents(self, filt=None):
        filt = filt or {}
        return sum(1 for d in self._data if self._match(d, filt))

    def distinct(self, field, filt=None):
        filt = filt or {}
        vals = set()
        for d in self._data:
            if self._match(d, filt) and field in d:
                vals.add(d[field])
        return list(vals)

    def aggregate(self, pipeline):
        # Very minimal: supports $group with $sum/$avg/$first, $match, $sort, $limit
        docs = [copy.deepcopy(d) for d in self._data]
        for stage in pipeline:
            if "$match" in stage:
                docs = [d for d in docs if self._match(d, stage["$match"])]
            elif "$sort" in stage:
                for k, v in reversed(list(stage["$sort"].items())):
                    docs.sort(key=lambda d: d.get(k, 0), reverse=(v == -1))
            elif "$limit" in stage:
                docs = docs[:stage["$limit"]]
            elif "$group" in stage:
                from collections import defaultdict
                groups = defaultdict(list)
                id_expr = stage["$group"]["_id"]
                for d in docs:
                    gkey = d.get(id_expr.lstrip("$")) if isinstance(id_expr, str) else str(id_expr)
                    groups[gkey].append(d)
                result = []
                for gkey, gdocs in groups.items():
                    row = {"_id": gkey}
                    for field, expr in stage["$group"].items():
                        if field == "_id":
                            continue
                        if isinstance(expr, dict):
                            if "$sum" in expr:
                                val = expr["$sum"]
                                row[field] = sum(d.get(val.lstrip("$"), 0) if isinstance(val, str) else val for d in gdocs)
                            elif "$avg" in expr:
                                vals = [d.get(expr["$avg"].lstrip("$"), 0) for d in gdocs]
                                row[field] = sum(vals) / len(vals) if vals else 0
                            elif "$first" in expr:
                                row[field] = gdocs[0].get(expr["$first"].lstrip("$")) if gdocs else None
                            elif "$count" in expr:
                                row[field] = len(gdocs)
                    result.append(row)
                docs = result
        return docs

    def create_index(self, *args, **kwargs):
        pass  # no-op for fallback


class _FallbackDB:
    def __getattr__(self, name):
        if name not in _store:
            _store[name] = []
            _id_counters[name] = 1
        return _FallbackCollection(name)

    def __getitem__(self, name):
        return self.__getattr__(name)

    def list_collection_names(self):
        return list(_store.keys())


_fallback_db = _FallbackDB()


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────
def get_db():
    global _use_fallback
    if _use_fallback:
        return _fallback_db
    if _mongo_db is None:
        _try_mongo()
    return _mongo_db if not _use_fallback else _fallback_db


def is_fallback() -> bool:
    return _use_fallback


def init_db():
    _try_mongo()
    return get_db()
