# sitecompiler-py

Official Python client library for the **SiteCompiler** Website Compilation API.

## Installation

```bash
pip install sitecompiler-py
```

## Usage

```python
from sitecompiler import SiteCompilerClient

client = SiteCompilerClient(base_url="https://site-compiler.onrender.com")

# 1. Create a job
job = client.jobs.create(
    url="https://example.com",
    format="nextjs"
)
print(f"Job queued: {job.id}")

# 2. Poll until complete
completed = client.jobs.poll_until_complete(
    job.id,
    on_progress=lambda j: print(f"[{j.status}] {j.progress_message}")
)

# 3. Download ZIP
zip_bytes = client.exports.download_zip(job.id)
with open(f"{job.id}.zip", "wb") as f:
    f.write(zip_bytes)
```
