# AI Template Converter Feature

## 🚀 Overview

The AI Template Converter is a powerful feature that uses **Google's Gemini AI** to automatically analyze documents and convert them into reusable Salesforce templates with intelligent merge field mapping. This feature represents the core innovation of the DocPlatform, combining artificial intelligence with business document automation.

## ✨ Key Features

### 1. **AI-Powered Document Analysis**
- **Document Type Recognition**: Automatically identifies contracts, invoices, proposals, policies, etc.
- **Clause Extraction**: Identifies and categorizes legal/business clauses
- **Structure Analysis**: Analyzes headers, footers, sections, and document organization
- **Confidence Scoring**: Provides AI confidence levels for all analysis results

### 2. **Intelligent Merge Field Mapping**
- **Salesforce Object Integration**: Maps document fields to appropriate Salesforce objects (Account, Contact, Opportunity, etc.)
- **Smart Field Suggestions**: AI suggests optimal merge field placements
- **Format Preservation**: Maintains document structure while inserting merge fields
- **Multiple Object Support**: Handles complex documents with relationships across multiple Salesforce objects

### 3. **Template Management System**
- **Version Control**: Tracks template versions with full revision history
- **Clause Database**: Stores and manages identified clauses for reuse
- **Template Metadata**: Rich metadata including complexity scoring and AI analysis results
- **Active Template Management**: Enable/disable templates as needed

### 4. **Document Generation**
- **Data-Driven Generation**: Generate documents using Salesforce record data or custom merge data
- **Batch Processing**: Support for generating multiple documents
- **Template Validation**: Ensures all merge fields have corresponding data
- **Output Formats**: Support for various document formats

## 🏗️ System Architecture

### Backend Components

#### **Database Models**
```python
# Core Models
- Template: Main template metadata and settings
- TemplateVersion: Version control for template content
- Clause: Individual clauses extracted from documents  
- GeneratedDocument: Tracking of generated documents
```

#### **AI Services**
```python
# Gemini AI Integration
- GeminiService: Document analysis and template conversion
- DocumentService: Text extraction from various file formats
- TemplateService: Template management and generation
```

#### **API Endpoints**
```
POST /api/templates/analyze/{document_id}    # AI document analysis
POST /api/templates/convert                  # Convert to template
GET  /api/templates/                        # List templates
GET  /api/templates/{template_id}           # Get template details
POST /api/templates/{template_id}/generate  # Generate document
DELETE /api/templates/{template_id}         # Delete template
```

### Frontend Components

#### **TemplateConverter Component**
- **Multi-step Wizard**: Analysis → Configuration → Completion
- **Real-time Progress**: Visual progress indicators and loading states
- **Form Validation**: Comprehensive validation for template configuration
- **Preview System**: Live preview of generated templates

#### **Integration Points**
- **DocumentViewer**: Seamless integration with document viewing
- **SalesforcePanel**: Connected to Salesforce metadata and objects
- **AIAssistantPanel**: AI-powered assistance throughout the process

## 🔧 Implementation Details

### Phase 1: Document Analysis
```typescript
// Frontend initiates analysis
const analysis = await fetch(`/api/templates/analyze/${documentId}`)

// Backend extracts text and sends to Gemini
const analysisResult = await gemini_service.analyze_document(document_text)
```

**AI Analysis Output:**
```json
{
  "document_type": "Contract",
  "confidence": "high",
  "primary_salesforce_object": "Account",
  "suggested_merge_fields": [
    {
      "field_name": "Name",
      "display_name": "Company Name", 
      "salesforce_object": "Account",
      "merge_syntax": "{{Account.Name}}"
    }
  ],
  "identified_clauses": [
    {
      "title": "Payment Terms",
      "content": "Payment is due within 30 days...",
      "type": "Payment",
      "is_mandatory": true,
      "confidence": "high"
    }
  ],
  "recommendations": [
    "Consider adding termination clauses",
    "Standardize payment terms format"
  ]
}
```

### Phase 2: Template Conversion
```typescript
// User configures template settings
const conversionRequest = {
  document_id: documentId,
  analysis_results: analysis,
  template_name: "Service Agreement Template",
  salesforce_object: "Account",
  description: "Standard service agreement template"
}

// AI converts document to template
const template = await gemini_service.convert_to_template(...)
```

**Template Output:**
```json
{
  "template_content": "SERVICE AGREEMENT\n\nThis agreement is between {{Account.Name}} and {{Company.Name}}...",
  "merge_fields_used": [
    {
      "merge_field": "{{Account.Name}}",
      "original_value": "Client Name",
      "field_type": "text",
      "description": "Client company name"
    }
  ],
  "template_metadata": {
    "total_merge_fields": 12,
    "primary_object": "Account", 
    "related_objects": ["Contact", "Opportunity"],
    "template_complexity": "medium"
  }
}
```

### Phase 3: Database Storage
```python
# Create template record
template = Template(
    name=template_name,
    document_type=analysis.document_type,
    salesforce_object=salesforce_object,
    is_active=True
)

# Create version record  
version = TemplateVersion(
    template_id=template.id,
    version_number=1,
    content=conversion.template_content,
    merge_fields=conversion.merge_fields_used,
    is_current=True
)

# Create clause records
for clause_data in analysis.identified_clauses:
    clause = Clause(
        template_id=template.id,
        title=clause_data.title,
        content=clause_data.content,
        clause_type=clause_data.type,
        is_mandatory=clause_data.is_mandatory
    )
```

## 🎯 Usage Workflow

### For Users:
1. **Upload Document**: Upload any business document to the platform
2. **Open Template Converter**: Click the template conversion button in DocumentViewer  
3. **AI Analysis**: AI automatically analyzes document structure and content
4. **Review Results**: Review AI-identified document type, merge fields, and clauses
5. **Configure Template**: Set template name, Salesforce object, and description
6. **Generate Template**: AI converts document to template with merge fields
7. **Save & Use**: Template is saved and ready for document generation

### For Developers:
1. **Extend Document Support**: Add new document format parsers in DocumentService
2. **Enhance AI Prompts**: Improve Gemini prompts for better analysis accuracy
3. **Add Salesforce Objects**: Extend Salesforce integration for more object types
4. **Custom Merge Fields**: Implement custom merge field formats and validation

## 🔐 Configuration Requirements

### Environment Variables
```bash
# Required for AI functionality
GEMINI_API_KEY=your_gemini_api_key_here

# Backend database connection
DATABASE_URL=sqlite:///./storage/docplatform.db

# Frontend-backend communication  
BACKEND_URL=http://localhost:8000
```

### Gemini AI Setup
1. **Google Cloud Account**: Create account at https://cloud.google.com
2. **Enable Generative AI API**: Enable in Google Cloud Console
3. **Create API Key**: Generate API key for Gemini Pro
4. **Set Rate Limits**: Configure appropriate rate limits for your usage

### Salesforce Integration
- **Connected App**: OAuth 2.0 app in Salesforce
- **Object Permissions**: Read access to metadata and standard objects
- **Field Mapping**: Configure field mappings for your org's custom fields

## 🚀 Advanced Features

### Template Versioning
- **Automatic Versioning**: New versions created for template updates
- **Version Comparison**: Compare different template versions
- **Rollback Support**: Revert to previous template versions
- **Change Tracking**: Track what changed between versions

### Clause Management
- **Clause Library**: Reusable library of standard clauses
- **Smart Suggestions**: AI suggests relevant clauses for document types
- **Legal Compliance**: Track mandatory vs optional clauses
- **Custom Clauses**: Add organization-specific clause templates

### Document Generation
- **Salesforce Integration**: Generate documents directly from Salesforce records
- **Batch Generation**: Generate multiple documents at once
- **Custom Data Sources**: Support for external data sources beyond Salesforce
- **Output Formats**: PDF, Word, HTML output support

### AI Enhancement Options
- **Confidence Thresholds**: Configure minimum confidence levels
- **Custom Prompts**: Customize AI prompts for industry-specific documents  
- **Training Data**: Use organization's documents to improve accuracy
- **Feedback Loop**: User feedback improves AI recommendations

## 📊 Performance & Scalability

### Processing Capabilities
- **Document Size**: Supports documents up to 10MB
- **Concurrent Processing**: Handles multiple analysis requests simultaneously
- **Template Storage**: Efficient database design for thousands of templates
- **Generation Speed**: Fast document generation with caching

### Monitoring & Analytics
- **Usage Tracking**: Track template usage and generation metrics
- **AI Performance**: Monitor AI analysis accuracy and response times
- **Error Handling**: Comprehensive error logging and recovery
- **Health Checks**: API health monitoring and status reporting

## 🔮 Future Enhancements

### Planned Features
1. **Multi-language Support**: AI analysis in multiple languages
2. **Advanced OCR**: Extract text from scanned documents and images
3. **Real-time Collaboration**: Multiple users editing templates simultaneously  
4. **Integration Hub**: Connect with more CRM and ERP systems
5. **Mobile App**: Native mobile app for document generation
6. **API Marketplace**: Third-party integrations and extensions

### AI Improvements
1. **Custom Models**: Train custom AI models on organization data
2. **Predictive Analytics**: Predict optimal merge field placements
3. **Smart Validation**: AI-powered template validation and testing
4. **Auto-correction**: Automatically fix common template issues

## 📚 API Documentation

### Template Analysis
```typescript
POST /api/templates/analyze/{document_id}

Response: {
  document_type: string
  confidence: "high" | "medium" | "low" 
  primary_salesforce_object: string
  suggested_merge_fields: MergeField[]
  identified_clauses: Clause[]
  document_structure: DocumentStructure
  recommendations: string[]
}
```

### Template Conversion  
```typescript
POST /api/templates/convert

Body: {
  document_id: string
  analysis_results: AnalysisResult
  template_name: string
  description?: string
  salesforce_object: string
}

Response: {
  success: boolean
  template_id: string
  conversion_result: ConversionResult
  clauses_created: number
}
```

### Document Generation
```typescript
POST /api/templates/{template_id}/generate

Body: {
  template_id: string
  salesforce_record_id?: string  
  merge_data: Record<string, any>
}

Response: {
  success: boolean
  generated_document_id: string
  content: string
  merge_data_used: Record<string, any>
}
```

---

## 🎉 Getting Started

1. **Set up Gemini API**: Get your API key from Google Cloud Console
2. **Configure Environment**: Add `GEMINI_API_KEY` to your environment variables
3. **Upload a Document**: Upload a contract, invoice, or proposal  
4. **Try the Converter**: Click the template conversion button
5. **Review AI Analysis**: See what the AI identified in your document
6. **Create Your Template**: Configure and save your first AI-generated template
7. **Generate Documents**: Use your template to generate new documents with live data

The AI Template Converter transforms how businesses handle document automation, making it intelligent, efficient, and incredibly powerful! 🚀 