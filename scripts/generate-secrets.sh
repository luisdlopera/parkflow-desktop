#!/bin/bash
#
# ParkFlow Secrets Generation Script
#
# This script generates cryptographically secure secrets for ParkFlow deployment.
# Use this for PRODUCTION environments to ensure strong, unique secrets.
#
# Usage:
#   ./scripts/generate-secrets.sh              # Generate all secrets
#   ./scripts/generate-secrets.sh --jwt-only   # Generate only JWT secret
#   ./scripts/generate-secrets.sh --api-key    # Generate only API key
#
# Output: Prints secrets in .env format (ready to paste into .env.production)
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate JWT Secret (Base64 encoded 32-byte random)
generate_jwt_secret() {
    echo -e "${BLUE}Generating JWT Secret...${NC}"
    local secret=$(openssl rand -base64 32)
    echo -e "${GREEN}PARKFLOW_JWT_SECRET_BASE64=${secret}${NC}"
    echo ""
}

# Function to generate API Key (hex 32 bytes = 64 hex chars)
generate_api_key() {
    echo -e "${BLUE}Generating API Key...${NC}"
    local key=$(openssl rand -hex 32)
    echo -e "${GREEN}PARKFLOW_API_KEY=${key}${NC}"
    echo ""
}

# Function to generate Admin Password (prompt user for input)
generate_admin_password() {
    echo -e "${BLUE}Generating Admin Password...${NC}"
    echo -e "${YELLOW}Enter a strong password for admin user (min 12 chars, uppercase, lowercase, numbers, special):${NC}"
    read -s -p "Password: " password1
    echo ""
    read -s -p "Confirm Password: " password2
    echo ""

    if [ "$password1" != "$password2" ]; then
        echo -e "${YELLOW}Passwords do not match. Please try again.${NC}"
        generate_admin_password
        return
    fi

    if [ ${#password1} -lt 12 ]; then
        echo -e "${YELLOW}Password is too short (min 12 chars). Please try again.${NC}"
        generate_admin_password
        return
    fi

    echo -e "${GREEN}PARKFLOW_SEED_ADMIN_PASSWORD=${password1}${NC}"
    echo ""
}

# Main logic
echo ""
echo -e "${BLUE}=== ParkFlow Secrets Generator ===${NC}"
echo ""

if [ "$1" == "--jwt-only" ]; then
    generate_jwt_secret
elif [ "$1" == "--api-key" ]; then
    generate_api_key
elif [ "$1" == "--admin-password" ]; then
    generate_admin_password
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./scripts/generate-secrets.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no args)        Generate all secrets (JWT, API Key, Admin Password)"
    echo "  --jwt-only       Generate only JWT Secret"
    echo "  --api-key        Generate only API Key"
    echo "  --admin-password Generate only Admin Password (interactive)"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Example:"
    echo "  ./scripts/generate-secrets.sh > /tmp/secrets.env"
    echo "  cat /tmp/secrets.env >> .env.production"
    echo ""
else
    # Generate all
    generate_jwt_secret
    generate_api_key
    generate_admin_password

    echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
    echo "  1. Copy the secrets above to your .env.production file"
    echo "  2. NEVER commit secrets to git"
    echo "  3. Rotate secrets regularly in production"
    echo "  4. Use strong password for admin account"
    echo ""
fi
