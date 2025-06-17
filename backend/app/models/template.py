from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Template(Base):
    """Main template model for storing template metadata."""
    __tablename__ = "templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(String(100), nullable=False)  # Contract, Agreement, Policy, etc.
    salesforce_object = Column(String(100), nullable=False)  # Main SF object (Account, Contact, etc.)
    created_by = Column(String(100), nullable=True)  # User who created the template
    is_active = Column(Boolean, default=True, nullable=False)
    tags = Column(JSON, nullable=True)  # Array of tags for categorization
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")
    clauses = relationship("Clause", back_populates="template", cascade="all, delete-orphan")

class TemplateVersion(Base):
    """Template version model for storing different versions of templates."""
    __tablename__ = "template_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    template_id = Column(String(36), ForeignKey("templates.id"), nullable=False)
    version_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    content = Column(Text, nullable=False)  # Template content with merge fields
    merge_fields = Column(JSON, nullable=False)  # Array of merge fields used
    ai_analysis = Column(JSON, nullable=True)  # AI analysis results
    is_current = Column(Boolean, default=True, nullable=False)  # Is this the current version?
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    template = relationship("Template", back_populates="versions")

class Clause(Base):
    """Clause model for storing identified clauses in templates."""
    __tablename__ = "clauses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    template_id = Column(String(36), ForeignKey("templates.id"), nullable=False)
    title = Column(String(255), nullable=False)  # Clause title/name
    content = Column(Text, nullable=False)  # Clause content
    clause_type = Column(String(100), nullable=False)  # Payment, Termination, Liability, etc.
    position = Column(Integer, nullable=False)  # Order in document
    is_mandatory = Column(Boolean, default=False, nullable=False)  # Is this clause required?
    merge_fields = Column(JSON, nullable=True)  # Merge fields specific to this clause
    ai_confidence = Column(String(20), nullable=True)  # AI confidence level (high, medium, low)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    template = relationship("Template", back_populates="clauses")

class GeneratedDocument(Base):
    """Model for tracking generated documents from templates."""
    __tablename__ = "generated_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    template_id = Column(String(36), ForeignKey("templates.id"), nullable=False)
    template_version_id = Column(String(36), ForeignKey("template_versions.id"), nullable=False)
    salesforce_record_id = Column(String(100), nullable=True)  # SF record used for generation
    merge_data = Column(JSON, nullable=False)  # Data used for merge fields
    generated_content = Column(Text, nullable=False)  # Final generated document
    generated_by = Column(String(100), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Add relationships if needed
    template = relationship("Template")
    template_version = relationship("TemplateVersion") 