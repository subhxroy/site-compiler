import httpx
from typing import Optional
from .resources.jobs import JobsResource
from .resources.exports import ExportsResource

class SiteCompilerClient:
    def __init__(
        self,
        base_url: str = "https://sitecompiler.dev",
        api_key: Optional[str] = None,
        admin_secret: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if admin_secret:
            headers["x-sitecompiler-admin-bypass"] = admin_secret

        self._http = httpx.Client(headers=headers, timeout=timeout)
        self.jobs = JobsResource(self._http, self.base_url)
        self.exports = ExportsResource(self._http, self.base_url)

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
