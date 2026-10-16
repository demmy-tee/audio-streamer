import logging

import aioboto3

from app.config import get_settings

logger = logging.getLogger("worker-storage")
settings = get_settings()


class WorkerStorageClient:
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

    async def download_audio_bytes(self, s3_key: str) -> bytes:
        """Downloads full audio bytes from MinIO S3 for processing."""
        async with self._get_client_context() as s3:
            response = await s3.get_object(Bucket=self.bucket_name, Key=s3_key)
            async with response["Body"] as stream:
                return await stream.read()


storage_client = WorkerStorageClient()
