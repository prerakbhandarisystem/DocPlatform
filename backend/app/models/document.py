from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    filename = Column(String(255), nullable=False)
    filetype = Column(String(150), nullable=False)
    filesize = Column(Integer, nullable=False)
    file_data = Column(MEDIUMBLOB, nullable=False)
    google_drive_id = Column(String(100), nullable=True)  # New field for Google Drive file ID
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False) 