# CLARITY - Backend Dockerfile
# Flask Python application with Snowflake Cortex AI integration

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for cryptography and Snowflake connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for keys (will be mounted or copied at runtime)
RUN mkdir -p /app/keys

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Expose port 8082 (matching existing Flask configuration)
EXPOSE 8082

# Health check - verify the Flask server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8082/')"

# Run the Flask application
CMD ["python", "app.py"]
