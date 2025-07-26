from pydantic import BaseModel

class PassReasonSummaryRequest(BaseModel):
    pass_reason: str

class PassReasonSummaryResponse(BaseModel):
    summary: str 