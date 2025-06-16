/**
 * Shared API Types for DocPlatform
 * These types should match the Pydantic models in the backend
 */

// Base types
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// User types
export interface User extends BaseEntity {
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
}

export interface UserCreate {
  email: string
  password: string
  full_name: string
}

export interface UserUpdate {
  email?: string
  full_name?: string
  is_active?: boolean
}

// Document types
export interface Document extends BaseEntity {
  title: string
  content: string
  file_path?: string
  file_type: string
  file_size: number
  owner_id: string
  is_template: boolean
  template_variables?: string[]
  analysis?: DocumentAnalysis
}

export interface DocumentCreate {
  title: string
  content: string
  file_type: string
  is_template?: boolean
}

export interface DocumentUpdate {
  title?: string
  content?: string
  is_template?: boolean
  template_variables?: string[]
}

export interface DocumentAnalysis {
  word_count: number
  reading_time: number
  language: string
  variables_detected?: string[]
  metadata?: Record<string, any>
}

// Template types
export interface Template extends BaseEntity {
  name: string
  description?: string
  content: string
  variables: TemplateVariable[]
  salesforce_object?: string
  owner_id: string
  is_public: boolean
  usage_count: number
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url'
  required: boolean
  default_value?: string
  description?: string
  salesforce_field?: string
}

export interface TemplateCreate {
  name: string
  description?: string
  content: string
  variables: TemplateVariable[]
  salesforce_object?: string
  is_public?: boolean
}

export interface TemplateUpdate {
  name?: string
  description?: string
  content?: string
  variables?: TemplateVariable[]
  salesforce_object?: string
  is_public?: boolean
}

// Generation types
export interface GenerationJob extends BaseEntity {
  template_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total_documents: number
  completed_documents: number
  failed_documents: number
  salesforce_query?: string
  data_source: 'manual' | 'salesforce' | 'csv'
  output_format: 'pdf' | 'docx' | 'html'
  owner_id: string
  error_message?: string
  generated_documents: GeneratedDocument[]
}

export interface GeneratedDocument {
  id: string
  job_id: string
  file_path: string
  file_name: string
  status: 'success' | 'failed'
  error_message?: string
  generated_at: string
}

export interface GenerationJobCreate {
  template_id: string
  data_source: 'manual' | 'salesforce' | 'csv'
  salesforce_query?: string
  manual_data?: Record<string, any>[]
  csv_file?: File
  output_format: 'pdf' | 'docx' | 'html'
}

// Salesforce types
export interface SalesforceConnection extends BaseEntity {
  name: string
  instance_url: string
  is_active: boolean
  last_sync?: string
  owner_id: string
}

export interface SalesforceObject {
  name: string
  label: string
  fields: SalesforceField[]
}

export interface SalesforceField {
  name: string
  label: string
  type: string
  required: boolean
  description?: string
}

export interface SalesforceMapping {
  template_variable: string
  salesforce_field: string
  transformation?: string
}

// AI types
export interface AIAnalysisRequest {
  content: string
  task: 'extract_variables' | 'improve_template' | 'generate_content'
  context?: Record<string, any>
}

export interface AIAnalysisResponse {
  task: string
  result: any
  confidence: number
  suggestions?: string[]
}

// API Response types
export interface APIResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ErrorResponse {
  detail: string
  type: string
  code?: string
  field?: string
}

// WebSocket types
export interface WebSocketMessage {
  type: 'job_progress' | 'job_completed' | 'job_failed' | 'notification'
  data: any
  timestamp: string
}

export interface JobProgressMessage {
  job_id: string
  progress: number
  status: string
  completed_documents: number
  total_documents: number
  message?: string
}

// File upload types
export interface FileUploadResponse {
  file_id: string
  file_name: string
  file_size: number
  file_type: string
  upload_url?: string
}

// Settings types
export interface AppSettings {
  app_name: string
  version: string
  environment: string
  features: {
    salesforce_integration: boolean
    ai_analysis: boolean
    bulk_generation: boolean
  }
  limits: {
    max_file_size: number
    max_concurrent_jobs: number
    max_documents_per_job: number
  }
}

// Health check types
export interface HealthCheck {
  status: string
  version: string
  environment: string
  checks: {
    database: boolean
    redis: boolean
    storage: boolean
    external_services: {
      openai: boolean
      salesforce: boolean
    }
  }
} 