import time
import httpx
from typing import Optional, Callable
from ..models import Job, ExportFormat
from ..exceptions import SiteCompilerError, JobNotFoundError, TimeoutError

class JobsResource:
    def __init__(self, client: httpx.Client, base_url: str):
        self._client = client
        self._base_url = base_url

    def create(self, url: str, format: ExportFormat = "nextjs", idempotency_key: Optional[str] = None) -> Job:
        headers = {}
        if idempotency_key:
            headers["x-idempotency-key"] = idempotency_key

        res = self._client.post(
            f"{self._base_url}/api/export",
            json={"url": url, "format": format},
            headers=headers,
        )
        if not res.is_success:
            raise SiteCompilerError(f"Failed to create job: {res.text}", res.status_code)

        data = res.json()
        job_id = data.get("jobId") or data.get("id")
        return self.get(job_id)

    def get(self, job_id: str) -> Job:
        res = self._client.get(f"{self._base_url}/api/job/{job_id}/status")
        if res.status_code == 404:
            raise JobNotFoundError(f"Job {job_id} not found", 404)
        if not res.is_success:
            raise SiteCompilerError(f"Failed to fetch job status: {res.text}", res.status_code)
        return Job(**res.json())

    def cancel(self, job_id: str) -> Job:
        res = self._client.post(f"{self._base_url}/api/job/{job_id}/cancel")
        if not res.is_success:
            raise SiteCompilerError(f"Failed to cancel job: {res.text}", res.status_code)
        return Job(**res.json())

    def poll_until_complete(
        self,
        job_id: str,
        interval_seconds: float = 2.0,
        timeout_seconds: float = 900.0,
        on_progress: Optional[Callable[[Job], None]] = None,
    ) -> Job:
        start_time = time.time()
        while time.time() - start_time < timeout_seconds:
            job = self.get(job_id)
            if on_progress:
                on_progress(job)

            if job.status in ["completed", "failed", "cancelled"]:
                return job

            time.sleep(interval_seconds)

        raise TimeoutError(f"Job {job_id} did not complete within {timeout_seconds} seconds")
