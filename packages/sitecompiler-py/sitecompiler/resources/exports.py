import httpx
from ..exceptions import SiteCompilerError, PaymentRequiredError

class ExportsResource:
    def __init__(self, client: httpx.Client, base_url: str):
        self._client = client
        self._base_url = base_url

    def download_zip(self, job_id: str) -> bytes:
        res = self._client.get(f"{self._base_url}/api/job/{job_id}/download")
        if res.status_code == 403:
            raise PaymentRequiredError("Export pending payment approval", 403)
        if not res.is_success:
            raise SiteCompilerError(f"Failed to download zip: {res.text}", res.status_code)
        return res.content

    def get_site_model(self, job_id: str) -> dict:
        res = self._client.get(f"{self._base_url}/api/job/{job_id}/model")
        if not res.is_success:
            raise SiteCompilerError(f"Failed to fetch model: {res.text}", res.status_code)
        return res.json()
