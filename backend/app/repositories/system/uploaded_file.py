from app.models.system.uploaded_file import UploadedFile
from app.repositories.base import BaseRepository


class UploadedFileRepository(BaseRepository[UploadedFile]):
    model = UploadedFile
