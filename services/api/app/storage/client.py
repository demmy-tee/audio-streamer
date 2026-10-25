import hashlib
import logging
from collections.abc import AsyncGenerator
from pathlib import Path

import aioboto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger("storage-service")
settings = get_settings()


class StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket_name = settings.S3_BUCKET_NAME
        self.region = settings.S3_REGION
        self.local_storage_dir = Path(settings.LOCAL_STORAGE_DIR)
        self.local_storage_dir.mkdir(parents=True, exist_ok=True)

    def _get_client_context(self):
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        )

    async def ensure_bucket_exists(self) -> None:
        """Create bucket on startup if it does not already exist."""
        try:
            async with self._get_client_context() as s3:
                try:
                    await s3.head_bucket(Bucket=self.bucket_name)
                    logger.info(f"S3 Bucket '{self.bucket_name}' is ready.")
                except ClientError as e:
                    error_code = e.response.get("Error", {}).get("Code")
                    if error_code in ("404", "NoSuchBucket"):
                        logger.info(f"Bucket '{self.bucket_name}' not found. Creating bucket...")
                        await s3.create_bucket(Bucket=self.bucket_name)
                        logger.info(f"Bucket '{self.bucket_name}' successfully created.")
                    else:
                        logger.warning(f"Bucket check returned: {e}. Assuming bucket exists.")
        except Exception as e:
            logger.info(f"S3/MinIO not accessible ({e}). Using local file storage at {self.local_storage_dir}.")

    async def upload_audio(
        self,
        file_bytes: bytes,
        s3_key: str,
        content_type: str = "audio/wav",
    ) -> tuple[str, str]:
        """Uploads audio bytes to S3/MinIO or falls back to local disk storage."""
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()

        # Always save a local copy as reliable fallback
        local_target = self.local_storage_dir / s3_key
        local_target.parent.mkdir(parents=True, exist_ok=True)
        with open(local_target, "wb") as f:
            f.write(file_bytes)

        # Attempt S3 upload if configured
        try:
            async with self._get_client_context() as s3:
                await s3.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_bytes,
                    ContentType=content_type,
                    Metadata={"sha256": sha256_hash},
                )
                logger.info(f"Uploaded {len(file_bytes)} bytes to {self.bucket_name}/{s3_key}")
        except Exception as e:
            logger.info(f"S3 upload unavailable ({e}). Audio stored locally at {local_target}.")

        return s3_key, sha256_hash

    async def download_audio_bytes(self, s3_key: str) -> bytes:
        """Downloads audio bytes from S3 or local disk."""
        local_target = self.local_storage_dir / s3_key
        if local_target.exists():
            with open(local_target, "rb") as f:
                return f.read()

        # Check sample directories
        candidates = [
            Path("/samples/audio"),
            Path("/app/samples/audio"),
            Path(__file__).resolve().parent.parent.parent / "samples" / "audio",
            Path.cwd() / "samples" / "audio",
        ]
        target_name = s3_key.split("/")[-1]
        sample_map = {
            "sample_01.wav": "conversation_01_core.wav",
            "sample_02.wav": "conversation_02_variant.wav",
            "sample_03.wav": "conversation_03_ambiguous.wav",
        }
        fallback_name = sample_map.get(target_name, target_name)
        for c_dir in candidates:
            cand = c_dir / fallback_name
            if cand.exists():
                with open(cand, "rb") as f:
                    return f.read()

        # Try S3
        async with self._get_client_context() as s3:
            resp = await s3.get_object(Bucket=self.bucket_name, Key=s3_key)
            return await resp["Body"].read()

    async def get_audio_stream(
        self,
        s3_key: str,
        byte_range: str | None = None,
    ) -> tuple[AsyncGenerator[bytes, None], int, int, int]:
        """
        Streams audio bytes with HTTP 206 Range support.
        Checks local disk storage first (fastest & most reliable on free tier),
        then tries S3 if not found locally.
        """
        local_target = self.local_storage_dir / s3_key
        if not local_target.exists():
            # Check sample audio directory
            candidates = [
                Path("/samples/audio"),
                Path("/app/samples/audio"),
                Path(__file__).resolve().parent.parent.parent / "samples" / "audio",
                Path.cwd() / "samples" / "audio",
            ]
            target_name = s3_key.split("/")[-1]
            sample_map = {
                "sample_01.wav": "conversation_01_core.wav",
                "sample_02.wav": "conversation_02_variant.wav",
                "sample_03.wav": "conversation_03_ambiguous.wav",
            }
            fallback_name = sample_map.get(target_name, target_name)
            for c_dir in candidates:
                cand = c_dir / fallback_name
                if cand.exists():
                    local_target = cand
                    break

        if local_target.exists():
            total_size = local_target.stat().st_size
            start_byte = 0
            end_byte = total_size - 1

            if byte_range and byte_range.startswith("bytes="):
                range_spec = byte_range.replace("bytes=", "").split("-")
                if range_spec[0]:
                    start_byte = int(range_spec[0])
                if len(range_spec) > 1 and range_spec[1]:
                    end_byte = int(range_spec[1])

            start_byte = max(0, start_byte)
            end_byte = min(total_size - 1, end_byte)

            async def local_stream():
                with open(local_target, "rb") as f:
                    f.seek(start_byte)
                    bytes_left = end_byte - start_byte + 1
                    while bytes_left > 0:
                        chunk = f.read(min(64 * 1024, bytes_left))
                        if not chunk:
                            break
                        bytes_left -= len(chunk)
                        yield chunk

            return local_stream, start_byte, end_byte, total_size

        # Fallback to S3
        async with self._get_client_context() as s3:
            head = await s3.head_object(Bucket=self.bucket_name, Key=s3_key)
            total_size = head["ContentLength"]

            start_byte = 0
            end_byte = total_size - 1

            if byte_range and byte_range.startswith("bytes="):
                range_spec = byte_range.replace("bytes=", "").split("-")
                if range_spec[0]:
                    start_byte = int(range_spec[0])
                if len(range_spec) > 1 and range_spec[1]:
                    end_byte = int(range_spec[1])

            start_byte = max(0, start_byte)
            end_byte = min(total_size - 1, end_byte)

        async def stream_generator():
            async with self._get_client_context() as s3_stream_client:
                get_kwargs = {"Bucket": self.bucket_name, "Key": s3_key}
                if byte_range:
                    get_kwargs["Range"] = f"bytes={start_byte}-{end_byte}"
                response = await s3_stream_client.get_object(**get_kwargs)
                body = response["Body"]
                if hasattr(body, "content"):
                    while chunk := await body.content.read(64 * 1024):
                        yield chunk
                else:
                    data = await body.read()
                    if data:
                        yield data

        return stream_generator, start_byte, end_byte, total_size


storage_service = StorageService()
