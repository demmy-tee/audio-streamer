import hashlib
import logging
from typing import AsyncGenerator, Optional, Tuple
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

    async def upload_audio(
        self,
        file_bytes: bytes,
        s3_key: str,
        content_type: str = "audio/wav",
    ) -> Tuple[str, str]:
        """Uploads audio bytes to S3/MinIO and returns (s3_key, sha256_hash)."""
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()

        async with self._get_client_context() as s3:
            await s3.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type,
                Metadata={"sha256": sha256_hash},
            )
            logger.info(f"Uploaded {len(file_bytes)} bytes to {self.bucket_name}/{s3_key}")

        return s3_key, sha256_hash

    async def get_audio_stream(
        self,
        s3_key: str,
        byte_range: Optional[str] = None,
    ) -> Tuple[AsyncGenerator[bytes, None], int, int, int]:
        """
        Streams audio bytes with HTTP 206 Range support.
        Returns: (byte_generator, start_byte, end_byte, total_file_size)
        """
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

            get_kwargs = {"Bucket": self.bucket_name, "Key": s3_key}
            if byte_range:
                get_kwargs["Range"] = f"bytes={start_byte}-{end_byte}"

            response = await s3.get_object(**get_kwargs)

            async def stream_generator():
                async with response["Body"] as stream:
                    while chunk := await stream.read(64 * 1024):  # 64 KB chunks
                        yield chunk

            return stream_generator(), start_byte, end_byte, total_size


storage_service = StorageService()
