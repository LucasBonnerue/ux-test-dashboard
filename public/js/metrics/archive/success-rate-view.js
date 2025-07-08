/**
 * Success Rate Visualisierung
 *
 * JavaScript für die Visualisierung der Erfolgsraten von Tests.
 * Enthält Funktionen zum Laden und Darstellen von Erfolgsraten-Daten.
 */

// Status für Daten und UI-Elemente
let successRates = null;
let trendData = null;
let currentTimeRange = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date(),
};

// DOM-Elemente (werden initialisiert, wenn das Dokument geladen ist)
let successRateContainer;
let trendChartElement;
let loadingIndicator;
let errorMessage;
let dateRangeSelector;
let successRateChart = null;

/**
 * Initialisierung beim Laden der Seite
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente abrufen
  successRateContainer = document.getElementById("success-rate-container");
  trendChartElement = document.getElementById("success-trend-chart");
  loadingIndicator = document.getElementById("metrics-loading");
  errorMessage = document.getElementById("metrics-error");
  dateRangeSelector = document.getElementById("date-range-select");

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
async function loadSuccessRates() {
  showLoading(true);
  showError(false);

  try {
    // Anzahl der Tage aus dem aktuellen Zeitraum berechnen
    const days = Math.ceil(
      (currentTimeRange.end - currentTimeRange.start) / (24 * 60 * 60 * 1000),
    );
    // Verbesserte API-URL mit days Parameter
    const url = `/api/test-metrics/success-rates?days=${days}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Serverfehler: ${response.status}`);
    }

    const data = await response.json();

    // Daten speichern und anzeigen
    successRates = data.testSuccessRates;
    displaySuccessRates(successRates);

    // Trendchart mit den vorhandenen Daten erstellen
    createTrendChart(data);
  } catch (error) {
    console.error("Fehler beim Laden der Erfolgsraten:", error);
    showError(
      true,
      `Fehler beim Laden der Erfolgsraten: ${error.message || JSON.stringify(error)}`,
    );
  } finally {
    showLoading(false);
  }
}

/**
 * Lädt die Trend-Daten vom Server
 */
async function loadSuccessTrends() {
  try {
    // Anzahl der Tage aus dem aktuellen Zeitraum berechnen
    const days = Math.ceil(
      (currentTimeRange.end - currentTimeRange.start) / (24 * 60 * 60 * 1000),
    );
    const url = `/api/test-metrics/success-trends?days=${days}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Fehler beim Laden der Trend-Daten");
    }

    // Daten speichern und anzeigen
    trendData = data.trends;
    displayTrends(trendData);
  } catch (error) {
    console.error("Fehler beim Laden der Trend-Daten:", error);
    // Hier nur in Konsole loggen, um UI nicht zu überladen
  }
}

/**
 * Zeigt die Erfolgsraten im Dashboard an
 */
function displaySuccessRates(data) {
  if (!successRateContainer) return;

  // Container leeren
  successRateContainer.innerHTML = "";

  if (!data || data.length === 0) {
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

  data.forEach((rate) => {
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
  createOverallSuccessRateChart(data);
}

/**
 * Zeigt die Trend-Daten als Chart an
 */
function displayTrends(data) {
  if (!trendChartElement) return;

  // Tests nach Trend gruppieren
  const testsByTrend = {
    improving: data.testSuccessRates.filter((t) => t.trend === "improving"),
    stable: data.testSuccessRates.filter((t) => t.trend === "stable"),
    declining: data.testSuccessRates.filter((t) => t.trend === "declining"),
    unknown: data.testSuccessRates.filter((t) => t.trend === "unknown"),
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
  successRateChart = new window.Chart(ctx, {
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
            label: (context) => {
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

/**
 * Erstellt ein Chart für die Gesamterfolgsrate
 */
function createOverallSuccessRateChart(data) {
  const ctx = document.getElementById("overall-rate-chart").getContext("2d");
  new window.Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Erfolgreich", "Fehlgeschlagen"],
      datasets: [
        {
          data: [data.overallSuccessRate, 100 - data.overallSuccessRate],
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
function handleDateRangeChange(event) {
  const range = event.target.value;
  const now = new Date();
  let start;

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
function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? "block" : "none";
  }
}

/**
 * Zeigt oder versteckt die Fehlermeldung
 */
function showError(show, message = "") {
  if (errorMessage) {
    errorMessage.style.display = show ? "block" : "none";
    if (show) {
      errorMessage.textContent = message;
    }
  }
}

/**
 * Bestimmt die CSS-Klasse für eine Tabellenzeile basierend auf der Erfolgsrate
 */
function getRowClass(test) {
  if (test.successRate >= 90) return "success-high";
  if (test.successRate >= 70) return "success-medium";
  return "success-low";
}

/**
 * Gibt ein Icon für den Trend zurück
 */
function getTrendIcon(trend) {
  switch (trend) {
    case "improving":
      return '<span class="trend-icon improving">↗️</span>';
    case "declining":
      return '<span class="trend-icon declining">↘️</span>';
    case "stable":
      return '<span class="trend-icon stable">→</span>';
    default:
      return '<span class="trend-icon unknown">?</span>';
  }
}

// Export für globale Verwendung
window.SuccessRateView = {
  loadSuccessRates,
  loadSuccessTrends,
  setTimeRange: (start, end) => {
    currentTimeRange = { start, end };
    loadSuccessRates();
  },
};
