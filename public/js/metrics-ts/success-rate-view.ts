/**
 * Success Rate Visualisierung
 *
 * TypeScript für die Visualisierung der Erfolgsraten von Tests.
 * Enthält Funktionen zum Laden und Darstellen von Erfolgsraten-Daten.
 */

// Status für Daten und UI-Elemente
let successRates: SuccessRate[] | null = null;
let trendData: SuccessTrend[] | null = null;
let currentTimeRange: {
  start: Date;
  end: Date;
} = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date(),
};

// DOM-Elemente (werden initialisiert, wenn das Dokument geladen ist)
let successRateContainer: HTMLElement | null = null;
let trendChartElement: HTMLCanvasElement | null = null;
let loadingIndicator: HTMLElement | null = null;
let errorMessage: HTMLElement | null = null;
let dateRangeSelector: HTMLSelectElement | null = null;
let successRateChart: Chart | null = null;

/**
 * Initialisierung beim Laden der Seite
 */
document.addEventListener("DOMContentLoaded", (): void => {
  // DOM-Elemente abrufen
  successRateContainer = document.getElementById("success-rate-container");
  trendChartElement = document.getElementById("success-trend-chart") as HTMLCanvasElement;
  loadingIndicator = document.getElementById("metrics-loading");
  errorMessage = document.getElementById("metrics-error");
  dateRangeSelector = document.getElementById("date-range-select") as HTMLSelectElement;

  // Event-Listener für Datumsbereichsauswahl
  if (dateRangeSelector) {
    dateRangeSelector.addEventListener("change", handleDateRangeChange);
  }

  // Erste Daten laden
  loadSuccessRates();
});

/**
 * Lädt die Erfolgsraten vom Server
 */
async function loadSuccessRates(): Promise<void> {
  showLoading(true);
  showError(false);

  try {
    // Anzahl der Tage aus dem aktuellen Zeitraum berechnen
    const days: number = Math.ceil(
      (currentTimeRange.end.getTime() - currentTimeRange.start.getTime()) / (24 * 60 * 60 * 1000),
    );
    // Verbesserte API-URL mit days Parameter
    const url: string = `/api/test-metrics/success-rates?days=${days}`;

    const response: Response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Serverfehler: ${response.status}`);
    }

    const data: SuccessRateResponse = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Unbekannter Fehler bei der Datenabfrage");
    }

    // Daten speichern und anzeigen
    successRates = data.testSuccessRates;
    displaySuccessRates(data);

    // Trenddaten laden
    loadSuccessTrends();
  } catch (error) {
    console.error("Fehler beim Laden der Erfolgsraten:", error);
    showError(
      true,
      `Fehler beim Laden der Erfolgsraten: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    );
  } finally {
    showLoading(false);
  }
}

/**
 * Lädt die Trend-Daten vom Server
 */
async function loadSuccessTrends(): Promise<void> {
  try {
    // Anzahl der Tage aus dem aktuellen Zeitraum berechnen
    const days: number = Math.ceil(
      (currentTimeRange.end.getTime() - currentTimeRange.start.getTime()) / (24 * 60 * 60 * 1000),
    );
    const url: string = `/api/test-metrics/success-trends?days=${days}`;

    const response: Response = await fetch(url);
    const data: SuccessTrendResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Fehler beim Laden der Trend-Daten");
    }

    // Daten speichern und anzeigen
    trendData = data.trends;
    
    // Rufe createTrendChart mit korrektem Typ auf, wenn Testdaten vorhanden sind
    if (successRates && successRates.length > 0) {
      // Erstelle ein Objekt mit der korrekten Struktur
      const chartData: SuccessRateResponse = {
        success: true,
        testSuccessRates: successRates.map(rate => ({
          ...rate,
          trend: rate.trend || 'stable'
        }))
      };
      createTrendChart(chartData);
    }
  } catch (error) {
    console.error("Fehler beim Laden der Trend-Daten:", error);
    // Hier nur in Konsole loggen, um UI nicht zu überladen
  }
}

/**
 * Zeigt die Erfolgsraten im Dashboard an
 */
function displaySuccessRates(data: SuccessRateResponse): void {
  if (!successRateContainer) return;

  // Container leeren
  successRateContainer.innerHTML = "";

  if (!data.testSuccessRates || data.testSuccessRates.length === 0) {
    const noData = document.createElement("div");
    noData.className = "alert alert-info";
    noData.textContent = "Keine Erfolgsratendaten verfügbar.";
    successRateContainer.appendChild(noData);
    return;
  }

  // Tabelle erstellen
  const table = document.createElement("table");
  table.className = "table table-striped table-hover";

  // Tabellenkopf
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Test</th>
      <th>Erfolgsrate</th>
      <th>Letzter Lauf</th>
      <th>Trend</th>
    </tr>
  `;

  // Tabelleninhalt
  const tbody = document.createElement("tbody");

  data.testSuccessRates.forEach((rate: SuccessRate) => {
    const row = document.createElement("tr");

    // Status-Klasse basierend auf Erfolgsrate
    if (rate.successRate < 70) {
      row.className = "table-danger";
    } else if (rate.successRate < 90) {
      row.className = "table-warning";
    } else {
      row.className = "table-success";
    }

    // Fortschrittsbalken für Erfolgsrate
    const progressBar = `
      <div class="progress">
        <div 
          class="progress-bar ${getProgressBarClass(rate.successRate)}" 
          role="progressbar" 
          style="width: ${rate.successRate}%" 
          aria-valuenow="${rate.successRate}" 
          aria-valuemin="0" 
          aria-valuemax="100">
          ${rate.successRate}%
        </div>
      </div>
    `;

    // Trend-Indikator
    const trendIndicator = getTrendIndicator(rate.trend);

    // Formatierte Datumsangabe für den letzten Lauf
    let lastRunDate = "Keine Daten";
    if (rate.lastRun && rate.lastRun.timestamp) {
      lastRunDate = new Date(rate.lastRun.timestamp).toLocaleString();
    }

    row.innerHTML = `
      <td>${rate.testName}</td>
      <td>${progressBar}</td>
      <td>${lastRunDate}</td>
      <td>${trendIndicator}</td>
    `;

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  successRateContainer.appendChild(table);
  
  if (data.hasOwnProperty('overallSuccessRate')) {
    createOverallSuccessRateChart(data);
  }
}

/**
 * Erstellt ein Chart für die Trend-Daten
 */
function createTrendChart(data: SuccessRateResponse): void {
  if (!trendChartElement) return;

  // Tests nach Trend gruppieren
  const testsByTrend = {
    improving: data.testSuccessRates.filter((t) => t.trend === "up"),
    stable: data.testSuccessRates.filter((t) => t.trend === "stable"),
    declining: data.testSuccessRates.filter((t) => t.trend === "down"),
    unknown: data.testSuccessRates.filter((t) => t.trend !== "up" && t.trend !== "stable" && t.trend !== "down"),
  };

  // Chart-Daten erstellen
  const chartData = {
    labels: ["Verbessernd", "Stabil", "Verschlechternd", "Unbekannt"],
    datasets: [
      {
        data: [
          testsByTrend.improving.length,
          testsByTrend.stable.length,
          testsByTrend.declining.length,
          testsByTrend.unknown.length,
        ],
        backgroundColor: [
          "#4CAF50", // Grün für Verbesserung
          "#2196F3", // Blau für Stabil
          "#F44336", // Rot für Verschlechterung
          "#9E9E9E", // Grau für Unbekannt
        ],
      },
    ],
  };

  // Chart erstellen
  if (successRateChart) {
    successRateChart.destroy();
  }

  const ctx = trendChartElement.getContext("2d");
  if (ctx) {
    successRateChart = new Chart(ctx, {
      type: "pie",
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Test-Trends",
            font: {
              size: 16,
            },
          },
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = chartData.datasets[0].data.reduce(
                  (a, b) => a + b,
                  0,
                );
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} Tests (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
}

/**
 * Erstellt ein Chart für die Gesamterfolgsrate
 */
function createOverallSuccessRateChart(data: any): void {
  const chartElement = document.getElementById("overall-rate-chart") as HTMLCanvasElement;
  if (!chartElement) return;
  
  const ctx = chartElement.getContext("2d");
  if (!ctx) return;
  
  // Sicherstellen, dass overallSuccessRate vorhanden und eine Zahl ist
  const overallRate = typeof data.overallSuccessRate === 'number' ? data.overallSuccessRate : 0;
  
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Erfolgreich", "Fehlgeschlagen"],
      datasets: [
        {
          data: [overallRate, 100 - overallRate],
          backgroundColor: [
            "#4CAF50", // Grün für erfolgreich
            "#F44336", // Rot für fehlgeschlagen
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

/**
 * Behandelt die Änderung des Datumsbereichs
 */
function handleDateRangeChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const range = target.value;
  const now = new Date();
  let start: Date;

  switch (range) {
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      start = new Date(0); // Alle Daten
      break;
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  currentTimeRange = {
    start,
    end: now,
  };

  loadSuccessRates();
}

/**
 * Zeigt oder versteckt den Ladeindikator
 */
function showLoading(show: boolean): void {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? "block" : "none";
  }
}

/**
 * Zeigt oder versteckt die Fehlermeldung
 */
function showError(show: boolean, message: string = ""): void {
  if (errorMessage) {
    errorMessage.style.display = show ? "block" : "none";
    if (show) {
      errorMessage.textContent = message;
    }
  }
}

/**
 * Bestimmt die CSS-Klasse für den Fortschrittsbalken basierend auf der Erfolgsrate
 */
function getProgressBarClass(rate: number): string {
  if (rate >= 90) return "bg-success";
  if (rate >= 70) return "bg-warning";
  return "bg-danger";
}

/**
 * Bestimmt die CSS-Klasse für eine Tabellenzeile basierend auf der Erfolgsrate
 */
function getRowClass(test: SuccessRate): string {
  if (test.successRate >= 90) return "success-high";
  if (test.successRate >= 70) return "success-medium";
  return "success-low";
}

/**
 * Gibt ein Icon für den Trend zurück
 */
function getTrendIndicator(trend: string): string {
  switch (trend) {
    case "up":
      return '<span class="trend-icon improving">↗️</span>';
    case "down":
      return '<span class="trend-icon declining">↘️</span>';
    case "stable":
      return '<span class="trend-icon stable">→</span>';
    default:
      return '<span class="trend-icon unknown">?</span>';
  }
}

// Export für globale Verwendung
interface SuccessRateViewInterface {
  loadSuccessRates: () => Promise<void>;
  loadSuccessTrends: () => Promise<void>;
  setTimeRange: (start: Date, end: Date) => void;
}

declare global {
  interface Window {
    SuccessRateView: SuccessRateViewInterface;
  }
}

window.SuccessRateView = {
  loadSuccessRates,
  loadSuccessTrends,
  setTimeRange: (start: Date, end: Date): void => {
    currentTimeRange = { start, end };
    loadSuccessRates();
  },
};
