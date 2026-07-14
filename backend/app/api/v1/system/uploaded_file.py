import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, File, Query, UploadFile, status

from app.api.v1.crud_router import build_crud_router
from app.core.config import settings
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.dependencies.permissions import require_permission
from app.exceptions.base import BadRequestError
from app.models.users.admin_user import AdminUser
from app.repositories.system.uploaded_file import UploadedFileRepository
from app.schemas.system.uploaded_file import UploadedFileCreate, UploadedFileRead
from app.services.system.uploaded_file import UploadedFileService

get_uploaded_file_service = make_service_dependency(UploadedFileService, UploadedFileRepository)

# Images (product galleries), PDF (documents/manuals/certificates), and
# MP4 (product videos) — the file kinds the admin panel uploads today.
# MAX_UPLOAD_SIZE_MB (10 by default) applies to all of these alike; a real
# deployment serving many/large product videos would want a bigger limit
# or a dedicated video pipeline rather than raising this ad hoc.
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".mp4"}


def uploaded_file_filters(
    entity_type: str | None = Query(None, description=translate("swagger.filters.entity_type")),
) -> dict[str, Any]:
    return {"entity_type": entity_type}


router = build_crud_router(
    service_dependency=get_uploaded_file_service,
    read_schema=UploadedFileRead,
    create_schema=UploadedFileCreate,
    filter_dependency=uploaded_file_filters,
    prefix="/uploaded-files",
    tags=["uploaded-files"],
)


@router.post(
    "/upload",
    response_model=UploadedFileRead,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.uploaded_files.upload"),
    dependencies=[Depends(require_permission("uploaded-files.create"))],
)
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str | None = Query(None, description=translate("swagger.filters.entity_type")),
    entity_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.entity_id")),
    current_user: AdminUser = Depends(require_permission("uploaded-files.create")),
    service: UploadedFileService = Depends(get_uploaded_file_service),
) -> Any:
    """Real binary upload — stores the file on local disk under
    `settings.UPLOAD_DIR` (served back at `/media/<name>`, see app/main.py)
    and records it as an UploadedFile row. Distinct from the generic
    `POST /uploaded-files`, which only accepts a `file_path` string (for
    entries whose file already lives somewhere else)."""
    original_name = file.filename or "upload"
    extension = Path(original_name).suffix.lower()
    if extension not in _ALLOWED_EXTENSIONS:
        raise BadRequestError(key="errors.upload_unsupported_type")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise BadRequestError(
            key="errors.upload_too_large", params={"max_mb": settings.MAX_UPLOAD_SIZE_MB}
        )

    # A random name, never the client-supplied one, is what actually lands
    # on disk — sidesteps both path traversal and same-name collisions.
    stored_name = f"{uuid.uuid4().hex}{extension}"
    (Path(settings.UPLOAD_DIR) / stored_name).write_bytes(content)

    return await service.create(
        UploadedFileCreate(
            uploaded_by_id=current_user.id,
            file_name=original_name,
            file_path=f"/media/{stored_name}",
            mime_type=file.content_type,
            size_bytes=len(content),
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )
