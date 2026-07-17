"""S3-compatible object storage for the raw cache tier (blueprint §3.3).

Works against MinIO locally and S3/GCS/R2 in prod via the endpoint config.
Keys are conventionally ``{source_id}/{content_hash}[.ext]`` so duplicate
content collapses automatically.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from common.config import get_settings


@dataclass(frozen=True)
class StoredObject:
    key: str
    last_modified: object | None = None
    size: int | None = None


@lru_cache(maxsize=1)
def _client():  # noqa: ANN202 - boto3 client type is dynamic
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.object_storage_endpoint_url,
        aws_access_key_id=settings.object_storage_access_key,
        aws_secret_access_key=settings.object_storage_secret_key,
        region_name=settings.object_storage_region,
        config=Config(signature_version="s3v4"),
    )


def _bucket() -> str:
    return get_settings().object_storage_bucket


def ensure_bucket() -> None:
    client = _client()
    bucket = _bucket()
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)


def put_object(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    _client().put_object(Bucket=_bucket(), Key=key, Body=data, ContentType=content_type)
    return key


def get_object(key: str) -> bytes:
    resp = _client().get_object(Bucket=_bucket(), Key=key)
    return resp["Body"].read()


def exists(key: str) -> bool:
    try:
        _client().head_object(Bucket=_bucket(), Key=key)
        return True
    except ClientError:
        return False


def latest_by_prefix(prefix: str) -> StoredObject | None:
    """Return the most recently modified object under ``prefix`` (or None)."""
    resp = _client().list_objects_v2(Bucket=_bucket(), Prefix=prefix)
    contents = resp.get("Contents") or []
    if not contents:
        return None
    latest = max(contents, key=lambda o: o["LastModified"])
    return StoredObject(
        key=latest["Key"], last_modified=latest["LastModified"], size=latest.get("Size")
    )
