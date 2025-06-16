#!/bin/bash

# DocPlatform Development Setup Script
# This script sets up the development environment for DocPlatform

set -e

echo "🚀 Setting up DocPlatform Development Environment"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cat > .env << EOF
# DocPlatform Environment Configuration
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=dev-secret-key-$(openssl rand -hex 32)
APP_NAME=DocPlatform
VERSION=1.0.0

# Server Configuration
HOST=0.0.0.0
PORT=8000
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql+asyncpg://docplatform:dev_password@postgres:5432/docplatform
POSTGRES_PASSWORD=dev_password

# Redis Configuration
REDIS_URL=redis://:dev_password@redis:6379/0
REDIS_PASSWORD=dev_password

# Celery Configuration
CELERY_BROKER_URL=redis://:dev_password@redis:6379/1
CELERY_RESULT_BACKEND=redis://:dev_password@redis:6379/2

# Google OAuth Configuration (required for authentication)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# OpenAI Configuration (optional for development)
OPENAI_API_KEY=

# Salesforce Configuration (optional for development)
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
SALESFORCE_SECURITY_TOKEN=

# AWS Configuration (optional for development)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=docplatform-documents-dev

# Frontend Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Docker Configuration
BUILD_TARGET=development
EOF
    echo "✅ .env file created successfully"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/storage/documents
mkdir -p backend/storage/templates
mkdir -p backend/logs
mkdir -p infrastructure/postgres/init
mkdir -p infrastructure/redis
mkdir -p infrastructure/nginx
mkdir -p infrastructure/monitoring
mkdir -p docs

echo "✅ Directories created successfully"

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

echo "✅ Docker images built successfully"

# Start the services
echo "🚀 Starting services..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout 60s bash -c 'until docker-compose exec postgres pg_isready -U docplatform -d docplatform; do sleep 2; done'

echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose run --rm backend python -m alembic upgrade head

echo "✅ Database migrations completed"

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "🎉 DocPlatform development environment is ready!"
echo ""
echo "📋 Services:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Database:  postgresql://docplatform:dev_password@localhost:5432/docplatform"
echo "   Redis:     redis://localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Shell access:  docker-compose exec backend bash"
echo ""
echo "📖 For more information, see README.md" 