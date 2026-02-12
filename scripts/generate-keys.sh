#!/bin/bash

# ============================================================================
# RSA Key Generation Script for CLARITY
# ============================================================================
# This script generates an RSA key pair for Snowflake authentication.
#
# Usage:
#   ./scripts/generate-keys.sh
#
# Output:
#   - keys/private_key.pem - Private key (keep secret, use as GitHub secret)
#   - keys/public_key.pem  - Public key (add to Snowflake user)
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$PROJECT_ROOT/keys"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  CLARITY - RSA Key Generation${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if keys directory exists
if [ -d "$KEYS_DIR" ] && [ -f "$KEYS_DIR/private_key.pem" ]; then
    echo -e "${YELLOW}Warning: Keys already exist in $KEYS_DIR${NC}"
    echo ""
    read -p "Overwrite existing keys? (y/n): " OVERWRITE
    if [[ "$OVERWRITE" != "y" && "$OVERWRITE" != "Y" ]]; then
        echo "Key generation cancelled."
        exit 0
    fi
fi

# Create keys directory
mkdir -p "$KEYS_DIR"

echo "Generating RSA key pair..."
echo ""

# Generate private key (2048 bit, unencrypted)
openssl genrsa -out "$KEYS_DIR/private_key.pem" 2048

# Extract public key
openssl rsa -in "$KEYS_DIR/private_key.pem" -pubout -out "$KEYS_DIR/public_key.pem"

# Set secure permissions on private key
chmod 600 "$KEYS_DIR/private_key.pem"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Keys Generated Successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Files created:"
echo "  - $KEYS_DIR/private_key.pem (private key - KEEP SECRET)"
echo "  - $KEYS_DIR/public_key.pem (public key)"
echo ""

# Display public key for easy copy-paste
echo -e "${GREEN}Public Key (for Snowflake setup.sql):${NC}"
echo "============================================"
# Remove header, footer, and newlines for Snowflake
cat "$KEYS_DIR/public_key.pem" | grep -v "PUBLIC KEY" | tr -d '\n'
echo ""
echo ""
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Copy the public key above"
echo "  2. Replace YOUR_PUBLIC_KEY_HERE in infrastructure/setup.sql"
echo "  3. Run setup.sql in Snowflake Worksheets"
echo "  4. Add private_key.pem content as GitHub secret SNOWFLAKE_PRIVATE_KEY_RAW"
echo ""
echo -e "${YELLOW}IMPORTANT: Never commit private_key.pem to git!${NC}"
echo ""
