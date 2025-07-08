/**
 * Ergebnisanzeige für Playwright-Tests
 *
 * Dieses Modul bietet UI-Komponenten für die Anzeige, den Vergleich
 * und die Verwaltung von gespeicherten Playwright-Testergebnissen
 */

import {
  loadTestResults,
  loadTestResult,
  deleteTestResult,
  compareTestResults,
  formatTimestamp,
  formatDuration,
  TestResultSummary,
  TestResultComparison,
} from "./playwright-results";

import { PlaywrightTestResultFile } from "../types/playwright-results";

// DOM-Elemente im Ergebnis-Tab
let resultsListElement: HTMLElement | null = null;
let resultDetailElement: HTMLElement | null = null;
let resultComparisonElement: HTMLElement | null = null;
let statusElement: HTMLElement | null = null;

// Aktuell geladene Daten
let loadedResults: TestResultSummary[] = [];
let selectedResult: PlaywrightTestResultFile | null = null;
let comparisonResult: TestResultComparison | null = null;

/**
 * Initialisiert die Ergebnisanzeige
 */
export function initResultsView(): void {
  resultsListElement = document.getElementById("playwright-results-list");
  resultDetailElement = document.getElementById("playwright-result-detail");
  resultComparisonElement = document.getElementById(
    "playwright-result-comparison",
  );
  statusElement = document.getElementById("playwright-status");

  // Ergebnisliste laden
  loadResultsList();

  // Event-Listener für Tab-Wechsel hinzufügen
  const resultTab = document.getElementById("results-tab");
  if (resultTab) {
    resultTab.addEventListener("click", () => {
      // Ergebnisliste beim Wechsel zum Tab aktualisieren
      loadResultsList();
    });
  }
}

/**
 * Lädt die Liste der gespeicherten Testergebnisse und zeigt sie an
 */
async function loadResultsList(): Promise<void> {
  if (!resultsListElement) return;

  updateStatus("Lade Testergebnisse...");

  try {
    loadedResults = await loadTestResults();

    if (loadedResults.length === 0) {
      resultsListElement.innerHTML =
        '<div class="alert alert-info">Keine gespeicherten Testergebnisse vorhanden</div>';
      updateStatus("Keine Testergebnisse gefunden");
      return;
    }

    // Tabelle erstellen
    let html = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Datum/Zeit</th>
            <th>Name</th>
            <th>Status</th>
            <th>Tests</th>
            <th>Dauer</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    loadedResults.forEach((result) => {
      const successBadge = result.success
        ? '<span class="badge bg-success">Erfolg</span>'
        : '<span class="badge bg-danger">Fehler</span>';

      const passedRate =
        result.testCount > 0
          ? Math.round((result.metrics.passed / result.testCount) * 100)
          : 0;

      html += `
        <tr data-run-id="${result.runId}">
          <td>${formatTimestamp(result.timestamp)}</td>
          <td>${result.runName}</td>
          <td>${successBadge}</td>
          <td>
            <span class="badge bg-success">${result.metrics.passed} bestanden</span>
            <span class="badge bg-danger">${result.metrics.failed} fehlgeschlagen</span>
            <span class="badge bg-secondary">${result.metrics.skipped} übersprungen</span>
          </td>
          <td>${formatDuration(result.metrics.totalDuration)}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-primary btn-show-details" data-run-id="${result.runId}">Details</button>
              <button class="btn btn-danger btn-delete-result" data-run-id="${result.runId}">Löschen</button>
              <button class="btn btn-info btn-compare-select" data-run-id="${result.runId}">Vergleichen</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    resultsListElement.innerHTML = html;

    // Event-Listener für Aktionsbuttons hinzufügen
    addResultsListEventListeners();

    updateStatus(`${loadedResults.length} Testergebnisse geladen`);
  } catch (error) {
    resultsListElement.innerHTML = `
      <div class="alert alert-danger">
        Fehler beim Laden der Testergebnisse: ${error instanceof Error ? error.message : String(error)}
      </div>
    `;
    updateStatus("Fehler beim Laden der Testergebnisse");
  }
}

/**
 * Fügt Event-Listener für die Aktionsbuttons in der Ergebnisliste hinzu
 */
function addResultsListEventListeners(): void {
  if (!resultsListElement) return;

  // Event-Listener für Detail-Buttons
  const detailButtons =
    resultsListElement.querySelectorAll(".btn-show-details");
  detailButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const runId = (event.currentTarget as HTMLElement).getAttribute(
        "data-run-id",
      );
      if (runId) {
        await showResultDetails(runId);
      }
    });
  });

  // Event-Listener für Löschen-Buttons
  const deleteButtons =
    resultsListElement.querySelectorAll(".btn-delete-result");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const runId = (event.currentTarget as HTMLElement).getAttribute(
        "data-run-id",
      );
      if (runId && confirm("Testergebnis wirklich löschen?")) {
        await deleteResult(runId);
      }
    });
  });

  // Event-Listener für Vergleichen-Buttons
  const compareButtons = resultsListElement.querySelectorAll(
    ".btn-compare-select",
  );
  compareButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const runId = (event.currentTarget as HTMLElement).getAttribute(
        "data-run-id",
      );
      if (runId) {
        showComparisonSelection(runId);
      }
    });
  });
}

/**
 * Zeigt die Details eines Testergebnisses an
 */
async function showResultDetails(runId: string): Promise<void> {
  if (!resultDetailElement) return;

  updateStatus(`Lade Details für Test ${runId}...`);
  resultDetailElement.innerHTML =
    '<div class="spinner-border" role="status"><span class="visually-hidden">Lade...</span></div>';

  try {
    selectedResult = await loadTestResult(runId);

    if (!selectedResult) {
      resultDetailElement.innerHTML =
        '<div class="alert alert-warning">Testergebnis nicht gefunden</div>';
      updateStatus("Testergebnis nicht gefunden");
      return;
    }

    // Detailansicht erstellen
    let html = `
      <div class="card mb-3">
        <div class="card-header">
          <h5>${selectedResult.runName}</h5>
          <div class="small text-muted">
            Ausgeführt am ${formatTimestamp(selectedResult.timestamp)}
          </div>
        </div>
        <div class="card-body">
          <h6>Zusammenfassung</h6>
          <div class="row">
            <div class="col-md-6">
              <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Status
                  <span class="badge ${selectedResult.success ? "bg-success" : "bg-danger"} rounded-pill">
                    ${selectedResult.success ? "Erfolg" : "Fehler"}
                  </span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Bestanden
                  <span class="badge bg-success rounded-pill">${selectedResult.metrics.passed}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Fehlgeschlagen
                  <span class="badge bg-danger rounded-pill">${selectedResult.metrics.failed}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Übersprungen
                  <span class="badge bg-secondary rounded-pill">${selectedResult.metrics.skipped}</span>
                </li>
              </ul>
            </div>
            <div class="col-md-6">
              <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Gesamtdauer
                  <span>${formatDuration(selectedResult.metrics.totalDuration)}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Durchschnittliche Dauer
                  <span>${formatDuration(selectedResult.metrics.averageDuration)}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Run-ID
                  <span class="text-monospace small">${selectedResult.runId}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <h6>Konfiguration</h6>
          <pre class="bg-light p-2"><code>${JSON.stringify(selectedResult.config, null, 2)}</code></pre>
          
          <h6>Einzelne Testergebnisse</h6>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Datei</th>
                <th>Status</th>
                <th>Dauer</th>
              </tr>
            </thead>
            <tbody>
    `;

    selectedResult.testResults.forEach((test) => {
      const statusClass =
        test.status === "passed"
          ? "success"
          : test.status === "failed"
            ? "danger"
            : "secondary";

      const statusBadge = `<span class="badge bg-${statusClass}">${test.status}</span>`;

      html += `
        <tr>
          <td>${test.filename}</td>
          <td>${statusBadge}</td>
          <td>${formatDuration(test.duration)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary btn-back-to-list">Zurück zur Übersicht</button>
        </div>
      </div>
    `;

    resultDetailElement.innerHTML = html;

    // Event-Listener für den Zurück-Button
    const backButton = resultDetailElement.querySelector(".btn-back-to-list");
    if (backButton) {
      backButton.addEventListener("click", () => {
        showResultsList();
      });
    }

    // Detail-Ansicht anzeigen
    showResultDetailView();

    updateStatus(`Details für Test ${runId} geladen`);
  } catch (error) {
    resultDetailElement.innerHTML = `
      <div class="alert alert-danger">
        Fehler beim Laden der Testergebnis-Details: ${error instanceof Error ? error.message : String(error)}
      </div>
      <button class="btn btn-secondary btn-back-to-list">Zurück zur Übersicht</button>
    `;

    const backButton = resultDetailElement.querySelector(".btn-back-to-list");
    if (backButton) {
      backButton.addEventListener("click", () => {
        showResultsList();
      });
    }

    showResultDetailView();
    updateStatus("Fehler beim Laden der Testergebnis-Details");
  }
}

/**
 * Zeigt die Auswahl für den Vergleich von Testergebnissen
 */
function showComparisonSelection(baseRunId: string): void {
  if (!resultDetailElement) return;

  const baseResult = loadedResults.find((result) => result.runId === baseRunId);
  if (!baseResult) {
    updateStatus("Basis-Testergebnis nicht gefunden");
    return;
  }

  // Vergleichsauswahl anzeigen
  let html = `
    <div class="card mb-3">
      <div class="card-header">
        <h5>Testergebnisse vergleichen</h5>
      </div>
      <div class="card-body">
        <div class="mb-3">
          <label>Basis-Testergebnis:</label>
          <div class="alert alert-info">
            <strong>${baseResult.runName}</strong><br>
            Ausgeführt am ${formatTimestamp(baseResult.timestamp)}
          </div>
        </div>
        
        <div class="mb-3">
          <label for="compare-target">Vergleichen mit:</label>
          <select id="compare-target" class="form-select">
            <option value="">-- Testergebnis auswählen --</option>
  `;

  loadedResults.forEach((result) => {
    // Nicht mit sich selbst vergleichen
    if (result.runId === baseRunId) return;

    html += `
      <option value="${result.runId}">${result.runName} (${formatTimestamp(result.timestamp)})</option>
    `;
  });

  html += `
          </select>
        </div>
      </div>
      <div class="card-footer">
        <button id="btn-run-comparison" class="btn btn-primary" disabled>Vergleichen</button>
        <button class="btn btn-secondary btn-back-to-list">Abbrechen</button>
      </div>
    </div>
  `;

  resultDetailElement.innerHTML = html;

  // Event-Listener für den Vergleichen-Button
  const runComparisonButton = document.getElementById(
    "btn-run-comparison",
  ) as HTMLButtonElement;
  const compareTargetSelect = document.getElementById(
    "compare-target",
  ) as HTMLSelectElement;

  if (compareTargetSelect) {
    compareTargetSelect.addEventListener("change", () => {
      if (runComparisonButton) {
        runComparisonButton.disabled = !compareTargetSelect.value;
      }
    });
  }

  if (runComparisonButton) {
    runComparisonButton.addEventListener("click", async () => {
      const targetRunId = compareTargetSelect?.value;
      if (targetRunId) {
        await runComparison(baseRunId, targetRunId);
      }
    });
  }

  // Event-Listener für den Zurück-Button
  const backButton = resultDetailElement.querySelector(".btn-back-to-list");
  if (backButton) {
    backButton.addEventListener("click", () => {
      showResultsList();
    });
  }

  // Detail-Ansicht anzeigen
  showResultDetailView();

  updateStatus("Bitte Testergebnis zum Vergleichen auswählen");
}

/**
 * Führt einen Vergleich zwischen zwei Testergebnissen durch
 */
async function runComparison(runId1: string, runId2: string): Promise<void> {
  if (!resultComparisonElement) return;

  updateStatus("Vergleiche Testergebnisse...");
  resultComparisonElement.innerHTML =
    '<div class="spinner-border" role="status"><span class="visually-hidden">Vergleiche...</span></div>';

  try {
    comparisonResult = await compareTestResults(runId1, runId2);

    if (!comparisonResult) {
      resultComparisonElement.innerHTML =
        '<div class="alert alert-warning">Vergleich nicht möglich</div>';
      updateStatus("Vergleich nicht möglich");
      return;
    }

    // Vergleichsansicht erstellen
    let html = `
      <div class="card mb-3">
        <div class="card-header">
          <h5>Vergleich der Testergebnisse</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="card">
                <div class="card-header bg-light">Basis</div>
                <div class="card-body">
                  <h6>${comparisonResult.baseline.runName}</h6>
                  <div class="small text-muted">
                    Ausgeführt am ${formatTimestamp(comparisonResult.baseline.timestamp)}
                  </div>
                  <ul class="list-group mt-2">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Bestanden
                      <span class="badge bg-success rounded-pill">${comparisonResult.baseline.metrics.passed}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Fehlgeschlagen
                      <span class="badge bg-danger rounded-pill">${comparisonResult.baseline.metrics.failed}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Übersprungen
                      <span class="badge bg-secondary rounded-pill">${comparisonResult.baseline.metrics.skipped}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Gesamtdauer
                      <span>${formatDuration(comparisonResult.baseline.metrics.totalDuration)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-header bg-light">Aktuell</div>
                <div class="card-body">
                  <h6>${comparisonResult.current.runName}</h6>
                  <div class="small text-muted">
                    Ausgeführt am ${formatTimestamp(comparisonResult.current.timestamp)}
                  </div>
                  <ul class="list-group mt-2">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Bestanden
                      <span class="badge bg-success rounded-pill">${comparisonResult.current.metrics.passed}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Fehlgeschlagen
                      <span class="badge bg-danger rounded-pill">${comparisonResult.current.metrics.failed}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Übersprungen
                      <span class="badge bg-secondary rounded-pill">${comparisonResult.current.metrics.skipped}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Gesamtdauer
                      <span>${formatDuration(comparisonResult.current.metrics.totalDuration)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card mt-3">
            <div class="card-header bg-light">Änderungen</div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <h6>Metriken</h6>
                  <ul class="list-group">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Bestanden
                      <span class="badge ${comparisonResult.changes.passed >= 0 ? "bg-success" : "bg-danger"} rounded-pill">
                        ${comparisonResult.changes.passed >= 0 ? "+" : ""}${comparisonResult.changes.passed}
                      </span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Fehlgeschlagen
                      <span class="badge ${comparisonResult.changes.failed <= 0 ? "bg-success" : "bg-danger"} rounded-pill">
                        ${comparisonResult.changes.failed >= 0 ? "+" : ""}${comparisonResult.changes.failed}
                      </span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Übersprungen
                      <span class="badge bg-secondary rounded-pill">
                        ${comparisonResult.changes.skipped >= 0 ? "+" : ""}${comparisonResult.changes.skipped}
                      </span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Gesamtdauer
                      <span class="${comparisonResult.changes.totalDuration <= 0 ? "text-success" : "text-danger"}">
                        ${comparisonResult.changes.totalDuration >= 0 ? "+" : ""}${formatDuration(comparisonResult.changes.totalDuration)}
                      </span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Durchschnittliche Dauer
                      <span class="${comparisonResult.changes.averageDuration <= 0 ? "text-success" : "text-danger"}">
                        ${comparisonResult.changes.averageDuration >= 0 ? "+" : ""}${formatDuration(comparisonResult.changes.averageDuration)}
                      </span>
                    </li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <h6>Status-Änderungen</h6>
                  <div class="table-responsive">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Vorher</th>
                          <th>Nachher</th>
                          <th>Dauer</th>
                        </tr>
                      </thead>
                      <tbody>
    `;

    // Nur Tests mit Status- oder signifikanten Daueränderungen anzeigen
    const significantChanges = comparisonResult.testChanges.filter(
      (change) => change.statusChanged || Math.abs(change.durationChange) > 100,
    );

    if (significantChanges.length === 0) {
      html += `
        <tr>
          <td colspan="4" class="text-center">Keine signifikanten Statusänderungen</td>
        </tr>
      `;
    } else {
      significantChanges.forEach((change) => {
        const prevStatusClass = getStatusClass(change.previousStatus);
        const currStatusClass = getStatusClass(change.currentStatus);

        html += `
          <tr>
            <td>${change.filename}</td>
            <td><span class="badge bg-${prevStatusClass}">${change.previousStatus}</span></td>
            <td><span class="badge bg-${currStatusClass}">${change.currentStatus}</span></td>
            <td>
              <span class="${change.durationChange <= 0 ? "text-success" : "text-danger"}">
                ${change.durationChange >= 0 ? "+" : ""}${formatDuration(change.durationChange)}
              </span>
            </td>
          </tr>
        `;
      });
    }

    html += `
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary btn-back-to-list">Zurück zur Übersicht</button>
        </div>
      </div>
    `;

    resultComparisonElement.innerHTML = html;

    // Event-Listener für den Zurück-Button
    const backButton =
      resultComparisonElement.querySelector(".btn-back-to-list");
    if (backButton) {
      backButton.addEventListener("click", () => {
        showResultsList();
      });
    }

    // Vergleichsansicht anzeigen
    showComparisonView();

    updateStatus("Vergleich abgeschlossen");
  } catch (error) {
    resultComparisonElement.innerHTML = `
      <div class="alert alert-danger">
        Fehler beim Vergleichen der Testergebnisse: ${error instanceof Error ? error.message : String(error)}
      </div>
      <button class="btn btn-secondary btn-back-to-list">Zurück zur Übersicht</button>
    `;

    const backButton =
      resultComparisonElement.querySelector(".btn-back-to-list");
    if (backButton) {
      backButton.addEventListener("click", () => {
        showResultsList();
      });
    }

    showComparisonView();
    updateStatus("Fehler beim Vergleichen der Testergebnisse");
  }
}

/**
 * Gibt die CSS-Klasse für einen Status zurück
 */
function getStatusClass(status: string): string {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    case "skipped":
      return "secondary";
    case "new":
      return "primary";
    case "removed":
      return "warning";
    default:
      return "secondary";
  }
}

/**
 * Löscht ein Testergebnis
 */
async function deleteResult(runId: string): Promise<void> {
  updateStatus(`Lösche Testergebnis ${runId}...`);

  try {
    const success = await deleteTestResult(runId);

    if (success) {
      updateStatus("Testergebnis erfolgreich gelöscht");
      // Liste neu laden
      await loadResultsList();
    } else {
      updateStatus("Testergebnis konnte nicht gelöscht werden");
    }
  } catch (error) {
    updateStatus(
      `Fehler beim Löschen: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Zeigt die Listenansicht an und blendet Details/Vergleiche aus
 */
function showResultsList(): void {
  if (!resultsListElement || !resultDetailElement || !resultComparisonElement)
    return;

  resultsListElement.style.display = "block";
  resultDetailElement.style.display = "none";
  resultComparisonElement.style.display = "none";

  // Liste ggf. neu laden
  loadResultsList();
}

/**
 * Zeigt die Detailansicht an und blendet Liste/Vergleiche aus
 */
function showResultDetailView(): void {
  if (!resultsListElement || !resultDetailElement || !resultComparisonElement)
    return;

  resultsListElement.style.display = "none";
  resultDetailElement.style.display = "block";
  resultComparisonElement.style.display = "none";
}

/**
 * Zeigt die Vergleichsansicht an und blendet Liste/Details aus
 */
function showComparisonView(): void {
  if (!resultsListElement || !resultDetailElement || !resultComparisonElement)
    return;

  resultsListElement.style.display = "none";
  resultDetailElement.style.display = "none";
  resultComparisonElement.style.display = "block";
}

/**
 * Aktualisiert die Statusanzeige
 */
function updateStatus(message: string): void {
  if (!statusElement) return;

  statusElement.textContent = message;
}
