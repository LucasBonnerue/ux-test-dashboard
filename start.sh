#!/bin/bash

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${YELLOW}     UX-TEST-DASHBOARD STARTER      ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

# Aktuelles Arbeitsverzeichnis überprüfen
DASHBOARD_DIR="$(pwd)"
ECHO_PREFIX="[UX-Dashboard]" 

echo -e "${ECHO_PREFIX} Arbeitsverzeichnis: ${DASHBOARD_DIR}"

# Prüfen, ob wir im richtigen Verzeichnis sind
if [[ ! -f "./server.ts" && ! -d "./dist/dashboard" && ! -f "./server-complete.js" ]]; then
  echo -e "${RED}${ECHO_PREFIX} FEHLER: Weder server.ts, server-complete.js, noch dist/dashboard/server.js gefunden!${NC}"
  echo -e "${RED}${ECHO_PREFIX} Bitte zum Verzeichnis mit den Server-Dateien navigieren.${NC}"
  exit 1
fi

# Prüfen ob ts-node installiert ist und ggf. installieren
echo -e "${YELLOW}${ECHO_PREFIX} [1/3]${NC} Prüfe ts-node Installation..."
if ! command -v ts-node &> /dev/null; then
  echo -e "${ECHO_PREFIX} ts-node nicht gefunden. Installiere über npm..."
  npm install -g ts-node
  if [ $? -ne 0 ]; then
    echo -e "${RED}${ECHO_PREFIX} FEHLER: ts-node Installation fehlgeschlagen.${NC}"
    echo -e "${YELLOW}${ECHO_PREFIX} Versuche kompilierte Version zu starten...${NC}"
    USE_COMPILED=true
  else
    echo -e "${GREEN}${ECHO_PREFIX} ✓ ts-node erfolgreich installiert${NC}"
    USE_COMPILED=false
  fi
else
  echo -e "${GREEN}${ECHO_PREFIX} ✓ ts-node bereits installiert${NC}"
  USE_COMPILED=false
fi

# Abhängigkeiten prüfen
echo -e "${YELLOW}${ECHO_PREFIX} [2/3]${NC} Abhängigkeiten prüfen..."
required_packages=("express" "playwright" "bootstrap" "typescript")

for package in "${required_packages[@]}"; do
  if ! npm list --depth=0 2>/dev/null | grep -q $package; then
    echo -e "${ECHO_PREFIX} Paket $package nicht gefunden. Installiere..."
    npm install --save $package
    if [ $? -ne 0 ]; then
      echo -e "${RED}${ECHO_PREFIX} FEHLER: $package Installation fehlgeschlagen.${NC}"
    else 
      echo -e "${GREEN}${ECHO_PREFIX} ✓ $package installiert${NC}"
    fi
  else
    echo -e "${GREEN}${ECHO_PREFIX} ✓ $package bereits installiert${NC}"
  fi
done

# Freien Port finden und setzen
echo -e "${YELLOW}${ECHO_PREFIX} [3/3]${NC} Dashboard-Server starten..."

# Versuche verschiedene Ports (5000, 5001, 5002, ...)
PORT=5000
while [[ $(lsof -i :$PORT | wc -l) -gt 0 ]]; do
  PORT=$((PORT+1))
  if [[ $PORT -gt 5010 ]]; then
    echo -e "${RED}${ECHO_PREFIX} Konnte keinen freien Port finden. Bitte schließen Sie andere Server.${NC}"
    exit 1
  fi
done

echo "[UX-Dashboard] Server wird auf Port $PORT gestartet..."
echo -e "${GREEN}${ECHO_PREFIX} Dashboard verfügbar unter: http://localhost:$PORT${NC}"
echo -e "${ECHO_PREFIX} Drücke CTRL+C zum Beenden"

# PORT als Umgebungsvariable exportieren
export PORT=$PORT

# Je nach Verfügbarkeit die TypeScript- oder JavaScript-Version starten
if [ -f "./server-complete.js" ]; then
  echo -e "${YELLOW}${ECHO_PREFIX} Starte aktive Version (server-complete.js)...${NC}"
  node ./server-complete.js
elif [ "$USE_COMPILED" = true ] || [ ! -f "./server.ts" ]; then
  echo -e "${YELLOW}${ECHO_PREFIX} Starte kompilierte Version (server.js)...${NC}"
  # Prüfen, ob der kompilierte Server im dist-Verzeichnis existiert
  if [ -f "./dist/dashboard/server.js" ]; then
    node ./dist/dashboard/server.js
  else
    echo -e "${RED}${ECHO_PREFIX} FEHLER: Kompilierte Version nicht gefunden!${NC}"
    echo -e "${RED}${ECHO_PREFIX} Überprüfe ob der Build-Prozess ausgeführt wurde.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}${ECHO_PREFIX} Starte TypeScript-Version direkt (server.ts)...${NC}"
  # Starte server.ts direkt mit ts-node
  ts-node --transpile-only ./server.ts
fi
