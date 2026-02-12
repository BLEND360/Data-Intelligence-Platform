#!/bin/bash

# ============================================================================
# Build and Push Script for CLARITY Data Intelligence Platform
# ============================================================================
# This script builds all Docker images (backend, frontend, proxy) and pushes them
# to the Snowflake container registry.
#
# Prerequisites:
# - Docker installed and running
# - Snowflake CLI installed (snow CLI)
# - Authenticated with Snowflake (snow connection test)
# - Environment variables set (see below)
#
# Usage:
#   ./build-and-push.sh
#
# Required Environment Variables:
#   DOCKER_REPO_URL   - Snowflake registry URL (from SHOW IMAGE REPOSITORIES)
#
# Optional Environment Variables:
#   ENV               - Environment suffix (default: 'dev')
#   TAG               - Docker image tag (default: 'latest')
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Validate Prerequisites
# ============================================================================

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}CLARITY - Build and Push to Snowflake Registry${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if required environment variables are set
if [ -z "$DOCKER_REPO_URL" ]; then
    echo -e "${RED}Error: DOCKER_REPO_URL environment variable is not set.${NC}"
    echo "Get it from Snowflake: SHOW IMAGE REPOSITORIES LIKE 'CLARITY%';"
    echo "Example: export DOCKER_REPO_URL='orgname-account.registry.snowflakecomputing.com/CLARITY_DB/RETAIL/CLARITY_REPOSITORY_DEV'"
    exit 1
fi
echo -e "${GREEN}✓ DOCKER_REPO_URL is set: $DOCKER_REPO_URL${NC}"

# Set default values
export ENV=${ENV:-dev}
export TAG=${TAG:-latest}

echo -e "${GREEN}✓ Environment: $ENV${NC}"
echo -e "${GREEN}✓ Image tag: $TAG${NC}"
echo ""

# Store the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ============================================================================
# Build Backend Image
# ============================================================================

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}Building Backend Image${NC}"
echo -e "${GREEN}====================================================================${NC}"

IMAGE_NAME=clarity-backend

echo "Building backend Docker image..."
docker build \
  --rm \
  --platform linux/amd64 \
  --tag ${IMAGE_NAME}:${TAG} \
  --file "${SCRIPT_DIR}/backend/Dockerfile" \
  "${SCRIPT_DIR}/backend"

echo -e "${GREEN}✓ Backend image built successfully${NC}"

# Tag for Snowflake registry
echo "Tagging backend image for Snowflake registry..."
docker tag ${IMAGE_NAME}:${TAG} ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Backend image tagged${NC}"

# Push to Snowflake registry
echo "Pushing backend image to Snowflake registry..."
docker push ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Backend image pushed successfully${NC}"
echo ""

# ============================================================================
# Build Frontend Image
# ============================================================================

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}Building Frontend Image${NC}"
echo -e "${GREEN}====================================================================${NC}"

IMAGE_NAME=clarity-frontend

echo "Building frontend Docker image..."
docker build \
  --rm \
  --platform linux/amd64 \
  --tag ${IMAGE_NAME}:${TAG} \
  --file "${SCRIPT_DIR}/frontend/Dockerfile" \
  "${SCRIPT_DIR}/frontend"

echo -e "${GREEN}✓ Frontend image built successfully${NC}"

# Tag for Snowflake registry
echo "Tagging frontend image for Snowflake registry..."
docker tag ${IMAGE_NAME}:${TAG} ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Frontend image tagged${NC}"

# Push to Snowflake registry
echo "Pushing frontend image to Snowflake registry..."
docker push ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Frontend image pushed successfully${NC}"
echo ""

# ============================================================================
# Build Proxy Image
# ============================================================================

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}Building Proxy Image${NC}"
echo -e "${GREEN}====================================================================${NC}"

IMAGE_NAME=clarity-proxy

echo "Building proxy Docker image..."
docker build \
  --rm \
  --platform linux/amd64 \
  --tag ${IMAGE_NAME}:${TAG} \
  --build-arg FRONTEND_SERVICE=localhost:8080 \
  --build-arg BACKEND_SERVICE=localhost:8082 \
  --file "${SCRIPT_DIR}/proxy/Dockerfile" \
  "${SCRIPT_DIR}/proxy"

echo -e "${GREEN}✓ Proxy image built successfully${NC}"

# Tag for Snowflake registry
echo "Tagging proxy image for Snowflake registry..."
docker tag ${IMAGE_NAME}:${TAG} ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Proxy image tagged${NC}"

# Push to Snowflake registry
echo "Pushing proxy image to Snowflake registry..."
docker push ${DOCKER_REPO_URL}/${IMAGE_NAME}:${TAG}
echo -e "${GREEN}✓ Proxy image pushed successfully${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}Build and Push Complete!${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
echo "Images pushed to registry:"
echo "  - ${DOCKER_REPO_URL}/clarity-backend:${TAG}"
echo "  - ${DOCKER_REPO_URL}/clarity-frontend:${TAG}"
echo "  - ${DOCKER_REPO_URL}/clarity-proxy:${TAG}"
echo ""
echo "Next steps:"
echo "  1. Update the Snowpark service using the spec.yaml file:"
echo "     snow spcs service upgrade CLARITY_SERVICE_DEV --spec-path infrastructure/spec.yaml"
echo ""
echo "  2. Check service status:"
echo "     snow spcs service status CLARITY_SERVICE_DEV"
echo ""
echo "  3. Get service endpoint:"
echo "     snow spcs service list-endpoints CLARITY_SERVICE_DEV"
echo ""
echo -e "${GREEN}✓ All done!${NC}"
