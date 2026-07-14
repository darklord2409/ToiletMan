from app.models.system.uploaded_file import UploadedFile
from app.schemas.system.uploaded_file import UploadedFileCreate
from app.services.base import BaseService


class UploadedFileService(BaseService[UploadedFile, UploadedFileCreate, UploadedFileCreate]):
    entity_name = "Uploaded file"
    resource = "uploaded-files"
    search_fields = ["file_name"]
