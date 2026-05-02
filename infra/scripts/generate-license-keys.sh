#!/bin/bash
# Script para generar claves RSA de licenciamiento ParkFlow
# Uso: ./generate-license-keys.sh

set -e

OUTPUT_DIR="${1:-infra/keys}"
KEY_SIZE="${2:-2048}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}ParkFlow License Key Generator${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Crear directorio si no existe
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✓ Created directory: $OUTPUT_DIR${NC}"

PRIVATE_KEY_FILE="$OUTPUT_DIR/parkflow_license_private.pem"
PUBLIC_KEY_FILE="$OUTPUT_DIR/parkflow_license_public.pem"

echo -e "${YELLOW}Generating RSA ${KEY_SIZE}-bit key pair...${NC}"

# Verificar que openssl está instalado
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: OpenSSL is not installed${NC}"
    exit 1
fi

# Generar clave privada
openssl genrsa -out "$PRIVATE_KEY_FILE" "$KEY_SIZE" 2>/dev/null
echo -e "${GREEN}✓ Private key generated: $PRIVATE_KEY_FILE${NC}"

# Extraer clave pública
openssl rsa -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE" 2>/dev/null
echo -e "${GREEN}✓ Public key generated: $PUBLIC_KEY_FILE${NC}"

# Convertir a base64
echo ""
echo -e "${YELLOW}Converting to base64 for environment variables...${NC}"

PRIVATE_KEY_BASE64=$(base64 -w 0 "$PRIVATE_KEY_FILE")
PUBLIC_KEY_BASE64=$(base64 -w 0 "$PUBLIC_KEY_FILE")

# Guardar en archivo .env.local
ENV_FILE=".env.local"
cat > "$ENV_FILE" << EOF
# ParkFlow License Keys - Generated $(date '+%Y-%m-%d %H:%M:%S')
PARKFLOW_LICENSE_PRIVATE_KEY=$PRIVATE_KEY_BASE64
PARKFLOW_LICENSE_PUBLIC_KEY=$PUBLIC_KEY_BASE64
EOF

echo -e "${GREEN}✓ Environment variables saved to: $ENV_FILE${NC}"

# Mostrar instrucciones
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Setup Instructions:${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}1. Copy the following to your backend .env file:${NC}"
echo ""
echo -e "${GRAY}PARKFLOW_LICENSE_PRIVATE_KEY=${PRIVATE_KEY_BASE64:0:50}...${NC}"
echo -e "${GRAY}PARKFLOW_LICENSE_PUBLIC_KEY=${PUBLIC_KEY_BASE64:0:50}...${NC}"
echo ""
echo -e "${YELLOW}2. Or load automatically from .env.local:${NC}"
echo -e "   ${WHITE}export \$(cat .env.local | xargs)${NC}"
echo ""
echo -e "${YELLOW}3. Key files location:${NC}"
echo -e "   ${WHITE}Private: $PRIVATE_KEY_FILE${NC}"
echo -e "   ${WHITE}Public:  $PUBLIC_KEY_FILE${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Keep the private key secret!${NC}"
echo -e "${RED}   Never commit infra/keys/ to git.${NC}"
echo ""

# Verificar que se pueda usar para firmar
echo -e "${YELLOW}Testing signing capability...${NC}"
TEST_FILE="$OUTPUT_DIR/test.txt"
echo "test-data" > "$TEST_FILE"

SIGNATURE_FILE="$OUTPUT_DIR/test.sig"
if openssl dgst -sha256 -sign "$PRIVATE_KEY_FILE" -out "$SIGNATURE_FILE" "$TEST_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Signing test passed${NC}"

    # Verificar firma
    if openssl dgst -sha256 -verify "$PUBLIC_KEY_FILE" -signature "$SIGNATURE_FILE" "$TEST_FILE" 2>&1 | grep -q "Verified OK"; then
        echo -e "${GREEN}✓ Signature verification test passed${NC}"
    else
        echo -e "${YELLOW}⚠ Signature verification test failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Signing test failed${NC}"
fi

# Limpiar archivos de prueba
rm -f "$TEST_FILE" "$SIGNATURE_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Key generation completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
