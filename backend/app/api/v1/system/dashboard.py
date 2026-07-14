from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.permissions import require_permission
from app.schemas.system.dashboard import AnalyticsSummary, DashboardSalesSeries, DashboardSummary
from app.services.system.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_service(session: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(session)


@router.get(
    "/summary",
    response_model=DashboardSummary,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.dashboard.summary"),
    dependencies=[Depends(require_permission("reports.read"))],
)
async def dashboard_summary(
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    return await service.get_summary()


@router.get(
    "/sales-series",
    response_model=DashboardSalesSeries,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.dashboard.sales_series"),
    dependencies=[Depends(require_permission("reports.read"))],
)
async def dashboard_sales_series(
    days: int = Query(30, ge=1, le=365, description=translate("swagger.filters.days")),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSalesSeries:
    return await service.get_sales_series(days)


@router.get(
    "/analytics",
    response_model=AnalyticsSummary,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.dashboard.analytics"),
    dependencies=[Depends(require_permission("reports.read"))],
)
async def dashboard_analytics(
    service: DashboardService = Depends(get_dashboard_service),
) -> AnalyticsSummary:
    return await service.get_analytics_summary()
