from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.users.customer import CustomerRepository
from app.schemas.users.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services.users.customer import CustomerService

get_customer_service = make_service_dependency(CustomerService, CustomerRepository)

router = build_crud_router(
    service_dependency=get_customer_service,
    read_schema=CustomerRead,
    create_schema=CustomerCreate,
    update_schema=CustomerUpdate,
    prefix="/customers",
    tags=["customers"],
)
