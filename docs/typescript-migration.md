# TypeScript-Migration: Best Practices und Richtlinien

## Allgemeine Grundsätze

1. **Inkrementelle Migration**: Datei für Datei migrieren, nicht alles auf einmal
2. **Tests als Sicherheitsnetz**: Nach jeder Migration Tests ausführen
3. **Von unten nach oben**: Zuerst Utilities, dann APIs, zuletzt Frontend

## Checkliste für die Migration einer Datei

1. [ ] JS-Datei zu TS umbenennen (manuell oder mit `npm run js-to-ts`)
2. [ ] Import-Pfade anpassen (`.js`-Endung zu relativen Pfaden hinzufügen)
3. [ ] Typen für Funktionsparameter und Rückgabewerte hinzufügen
4. [ ] Klassen und Interfaces für Objekte definieren
5. [ ] TypeScript-Fehler beheben (zunächst mit `any`, später verfeinern)
6. [ ] Tests ausführen und sicherstellen, dass sie bestehen
7. [ ] Linting-Probleme beheben (`npm run lint:fix`)
8. [ ] Code-Qualität verbessern (z.B. unnötige `any`-Typen entfernen)

## Umgang mit häufigen Problemen

### 1. CommonJS vs. ESM-Imports

```typescript
// CommonJS (alte Syntax)
const express = require('express');

// TypeScript ESM (neue Syntax)
import express from 'express';
```

### 2. Dynamische Objekte typisieren

```typescript
// Vor der Migration
const config = {
  port: 3000,
  logLevel: 'info'
};

// Nach der Migration
interface Config {
  port: number;
  logLevel: string;
  [key: string]: any; // Für dynamische Eigenschaften
}

const config: Config = {
  port: 3000,
  logLevel: 'info'
};
```

### 3. Express Request/Response erweitern

```typescript
// Typen für erweiterte Express-Objekte
declare global {
  namespace Express {
    interface Request {
      customField?: string;
    }
  }
}
```

## Typensicherheit schrittweise erhöhen

1. Beginne mit `noImplicitAny: false` für einfachere Migration
2. Aktiviere später `noImplicitAny: true` für bessere Typensicherheit
3. Aktiviere weitere strenge Optionen nach erfolgreicher Migration

## Express-spezifische Migrations-Tipps

### Request und Response Typen

```typescript
import { Request, Response, NextFunction } from 'express';

// Vor der Migration
app.get('/api/data', (req, res) => {
  // ...
});

// Nach der Migration
app.get('/api/data', (req: Request, res: Response) => {
  // ...
});
```

### Express Router mit Typen

```typescript
import { Router } from 'express';

const router = Router();

router.get('/path', (req: Request, res: Response) => {
  // ...
});

export default router;
```

### Middleware mit Typen

```typescript
const middleware = (req: Request, res: Response, next: NextFunction) => {
  // Middleware-Logik
  next();
};
```

## TypeScript-Besonderheiten für unser Dashboard-Projekt

### 1. Mock-Daten typisieren

```typescript
interface TestResult {
  testId: string;
  testName: string;
  successRate: number;
  totalRuns: number;
  // weitere Eigenschaften
}

const mockData: TestResult[] = [
  // ...
];
```

### 2. Module Augmentation für erweiterte APIs

```typescript
// types/express/index.d.ts
import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      // Custom properties used in our routes
      testData?: any;
      userId?: string;
    }
  }
}
```

### 3. Utility-Funktionen mit Generics

```typescript
// Vorher
function filterByProperty(array, property, value) {
  return array.filter(item => item[property] === value);
}

// Nachher mit TypeScript
function filterByProperty<T>(array: T[], property: keyof T, value: any): T[] {
  return array.filter(item => item[property] === value);
}
```

## Event-basierte Modulkommunikation

Ein zentraler Aspekt unserer TypeScript-Migration ist die Einführung eines typisierten Event-Systems für die Modulkommunikation im Frontend. Dieses System ersetzt die frühere direkte Verwendung von globalen `window`-Objekten.

### 1. Typisierte CustomEvents definieren

```typescript
// Event-Typen als String-Literale definieren
type DashboardEventType = 'data:loading' | 'data:loaded' | 'data:error' | 'module:error';
type ModuleEventType = 'success-rate:loading' | 'success-rate:loaded' | 'success-rate:error';

// Event-Detail-Interfaces für typisierte Payloads
interface DashboardEventDetail {
  source: string;         // Quellmodul des Events
  message?: string;      // Optionale Nachricht
  data?: unknown;        // Optionale Daten
  error?: Error | unknown; // Optionaler Fehler
}

interface ModuleEventDetail extends DashboardEventDetail {
  // Modulspezifische Zusatzdaten
  metricData?: MetricData;
}
```

### 2. Event-Dispatching mit Typsicherheit

```typescript
// Typsichere Event-Dispatch-Funktion
function dispatchModuleEvent(eventType: ModuleEventType, detail: Partial<ModuleEventDetail>): void {
  // Modulspezifisches Event senden
  const event = new CustomEvent(eventType, {
    bubbles: true,
    cancelable: true,
    detail: { source: 'ModuleName', ...detail }
  });
  document.dispatchEvent(event);
  
  // Auf Dashboard-Event mappen
  let dashboardEventType: DashboardEventType | undefined;
  
  // Event-Typ-Mapping für konsistentes Dashboard-Event-System
  if (eventType.endsWith(':loading')) dashboardEventType = 'data:loading';
  else if (eventType.endsWith(':loaded')) dashboardEventType = 'data:loaded';
  else if (eventType.endsWith(':error')) dashboardEventType = 'data:error';
  
  // Dashboard-Event senden, wenn Mapping existiert
  if (dashboardEventType) {
    const dashboardEvent = new CustomEvent(dashboardEventType, {
      bubbles: true,
      cancelable: true,
      detail: { source: 'ModuleName', ...detail }
    });
    document.dispatchEvent(dashboardEvent);
  }
}
```

### 3. Event-Listener mit TypeScript

```typescript
// Event-Listener mit korrekter Typisierung
document.addEventListener('data:loading', (event: Event) => {
  // Event in typisiertes CustomEvent umwandeln
  const customEvent = event as CustomEvent<DashboardEventDetail>;
  
  // Auf Details mit Typsicherheit zugreifen
  const { source, message } = customEvent.detail;
  
  // Logik basierend auf Event-Quelle
  if (source === 'ModuleName') {
    // Modul-spezifische Logik
    showLoadingIndicator();
  }
});
```

### 4. Asynchrone Operationen mit Events

```typescript
// Asynchrone Funktion mit Event-basiertem Status
async function loadData(): Promise<void> {
  try {
    // Lade-Event senden
    dispatchModuleEvent('module:loading', { message: 'Daten werden geladen...' });
    
    // Daten asynchron laden
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Erfolgs-Event senden
    dispatchModuleEvent('module:loaded', { data });
  } catch (error) {
    // Fehler-Event senden
    dispatchModuleEvent('module:error', { 
      error, 
      message: 'Fehler beim Laden der Daten' 
    });
  }
}
```

### 5. Best Practices für das Event-System

1. **Einheitliche Namenskonvention**: `modulname:aktion` (z.B. `logs:loading`, `success-rate:error`)
2. **Zentrales Event-Mapping**: Module-Events auf Dashboard-Events mappen
3. **Typsicherheit**: Interfaces für alle Event-Details verwenden
4. **Konsistente Struktur**: Source, Message, Data und Error in allen Events gleich strukturieren
5. **Bubbling**: Events mit `bubbles: true` für App-weite Kommunikation nutzen
