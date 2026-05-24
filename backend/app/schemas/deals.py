from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class PriceHistoryEntry(BaseModel):
    date: str
    price: str
    discount_percentage: int


class DealBase(BaseModel):
    title: str
    price: str
    discount_percentage: int
    link: str
    image: str
    category: str
    platform: str
    source: Optional[str] = ""
    deal_score: Optional[float] = 0.0


class DealCreate(DealBase):
    pass


class DealResponse(DealBase):
    id: int
    last_updated: Optional[datetime] = None
    price_history: Optional[List[PriceHistoryEntry]] = []

    class Config:
        from_attributes = True


class DealsListResponse(BaseModel):
    status: str
    data: List[DealResponse]
    total: int


class ScrapeStatusResponse(BaseModel):
    status: str
    message: str
    current_category: Optional[str] = None
    updated_at: Optional[str] = None


class ScrapeAllStatusResponse(BaseModel):
    status: str
    data: Dict[str, ScrapeStatusResponse]


class CategoriesResponse(BaseModel):
    status: str
    categories: List[str]


class ComparisonResult(BaseModel):
    product_name: str
    platform: str
    price: str
    discount_percentage: int
    link: str
    image: str


class CompareResponse(BaseModel):
    status: str
    data: List[ComparisonResult]
