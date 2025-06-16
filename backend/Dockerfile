# Multi-stage Dockerfile for DocPlatform Backend

# Base stage with Python and system dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-tk \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 --no-create-home appuser

# Set work directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Development stage
FROM base as development

# Install development dependencies
RUN pip install --upgrade pip && \
    pip install -e ".[dev]"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p storage/documents storage/templates logs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Command for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production builder stage
FROM base as builder

# Install production dependencies
RUN pip install --upgrade pip && \
    pip install build

# Copy source code
COPY . .

# Build the package
RUN python -m build --wheel

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies (minimal for production)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libffi8 \
    libjpeg62-turbo \
    libpng16-16 \
    libfreetype6 \
    liblcms2-2 \
    libwebp7 \
    libharfbuzz0b \
    libfribidi0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 --no-create-home appuser

# Set work directory
WORKDIR /app

# Copy built wheel from builder stage
COPY --from=builder /app/dist/*.whl ./

# Install the application
RUN pip install --upgrade pip && \
    pip install *.whl && \
    rm -f *.whl

# Copy application code
COPY --chown=appuser:appgroup . .

# Create necessary directories
RUN mkdir -p storage/documents storage/templates logs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command for production
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]

# Testing stage (for CI/CD)
FROM development as testing

# Install test dependencies
RUN pip install pytest pytest-cov pytest-asyncio httpx

# Copy test files
COPY tests/ tests/

# Run tests
CMD ["pytest", "tests/", "-v", "--cov=app", "--cov-report=term-missing"] 