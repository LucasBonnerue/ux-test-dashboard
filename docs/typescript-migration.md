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
