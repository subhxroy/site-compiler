from typing import List, Optional, Literal
from pydantic import BaseModel, Field

ExportFormat = Literal["html", "react", "nextjs", "astro", "svelte", "vue", "remix"]
JobStatus = Literal[
    "pending",
    "crawling",
    "parsing",
    "validating",
    "detecting",
    "generating",
    "validating-output",
    "zipping",
    "completed",
    "failed",
    "cancelled",
]

class Job(BaseModel):
    id: str
    url: str
    format: ExportFormat = "nextjs"
    status: JobStatus
    progress_message: Optional[str] = Field(default=None, alias="progressMessage")
    logs: List[str] = []
    download_url: Optional[str] = Field(default=None, alias="downloadUrl")
    zip_size_kb: Optional[int] = Field(default=None, alias="zipSizeKb")
    page_count: Optional[int] = Field(default=1, alias="pageCount")
    amount: Optional[int] = None
    payment_submitted: Optional[bool] = Field(default=False, alias="paymentSubmitted")
    payment_approved: Optional[bool] = Field(default=False, alias="paymentApproved")
    has_model: Optional[bool] = Field(default=False, alias="hasModel")
    error: Optional[str] = None
    created_at: Optional[int] = Field(default=None, alias="createdAt")
    completed_at: Optional[int] = Field(default=None, alias="completedAt")

    class Config:
        populate_by_name = True
