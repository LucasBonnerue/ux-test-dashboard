/**
 * Flakiness Visualization
 * 
 * JavaScript für die Visualisierung der Flakiness (Instabilität) von Tests.
 * Enthält Funktionen zum Laden und Darstellen von Flakiness-Daten.
 */

// Status für Daten und UI-Elemente
let flakinessReport = null;
let flakyTestsList = null;
let currentDays = 14;

// DOM-Elemente (werden initialisiert, wenn das Dokument geladen ist)
let flakinessContainer;
let flakyTestsContainer;
let flakinessChartElement;
let flakinessLoadingIndicator;
let flakinessErrorMessage;
let daysSelector;
let flakinessChart = null;

/**
 * Initialisierung beim Laden der Seite
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM-Elemente abrufen
  flakinessContainer = document.getElementById('flakiness-container');
  flakyTestsContainer = document.getElementById('flaky-tests-container');
  flakinessChartElement = document.getElementById('flakiness-chart');
  flakinessLoadingIndicator = document.getElementById('flakiness-loading');
  flakinessErrorMessage = document.getElementById('flakiness-error');
  daysSelector = document.getElementById('flakiness-days-select');
  
  // Event-Listener für Tageauswahl
  if (daysSelector) {
    daysSelector.addEventListener('change', handleDaysChange);
  }
  
  // Erste Daten laden
  loadFlakinessReport();
});

/**
 * Lädt den Flakiness-Bericht vom Server
 */
async function loadFlakinessReport() {
  showLoading(true);
  showError(false);
  
  try {
    // Schwellenwert aus dem UI oder Default verwenden
    const threshold = document.getElementById('flakiness-threshold') ? 
      document.getElementById('flakiness-threshold').value : 20;
    
    const url = `/api/test-metrics/flakiness?days=${currentDays}&threshold=${threshold}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Serverfehler: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Daten speichern und anzeigen
    flakinessReport = data;
    displayFlakinessReport(data);
    
    // Flaky Tests direkt aus dem Report verwenden
    displayFlakyTests(data.flakinessMeasures);
  } catch (error) {
    console.error('Fehler beim Laden des Flakiness-Berichts:', error);
    showError(true, `Fehler beim Laden des Flakiness-Berichts: ${error.message || JSON.stringify(error)}`);
  } finally {
    showLoading(false);
  }
}

/**
 * Lädt die instabilsten Tests vom Server
 */
async function loadFlakyTests() {
  try {
    const url = '/api/test-metrics/flaky-tests?limit=10';
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der instabilen Tests');
    }
    
    // Daten speichern und anzeigen
    flakyTestsList = data.flakyTests;
    displayFlakyTests(flakyTestsList);
  } catch (error) {
    console.error('Fehler beim Laden der instabilen Tests:', error);
    // Hier nur in Konsole loggen, um UI nicht zu überladen
  }
}

/**
 * Zeigt den Flakiness-Bericht an
 * @param {Object} report Der anzuzeigende Flakiness-Bericht
 */
function displayFlakinessReport(report) {
  if (!flakinessContainer || !report) return;
  
  // Container leeren
  flakinessContainer.innerHTML = '';
  
  // Gesamtbericht erstellen
  const overviewDiv = document.createElement('div');
  overviewDiv.className = 'flakiness-overview card mb-4';
  
  // Falls Daten vorhanden sind
  if (report) {
    overviewDiv.innerHTML = `
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">Flakiness Übersicht</h5>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4 text-center">
            <h2>${report.overallFlakinessScore.toFixed(1)}%</h2>
            <p class="text-muted">Gesamt-Flakiness</p>
          </div>
          <div class="col-md-4 text-center">
            <h2>${report.flakyTestsCount}</h2>
            <p class="text-muted">Instabile Tests</p>
          </div>
          <div class="col-md-4 text-center">
            <h2>${report.totalTestsAnalyzed}</h2>
            <p class="text-muted">Analysierte Tests</p>
          </div>
        </div>
        <div class="alert ${report.overallFlakinessScore > report.flakinessThreshold ? 'alert-warning' : 'alert-success'}">
          <strong>${report.overallFlakinessScore > report.flakinessThreshold ? 'Achtung:' : 'Gut:'}</strong>
          Die Gesamt-Flakiness ist ${report.overallFlakinessScore > report.flakinessThreshold ? 'über' : 'unter'} dem Schwellenwert von ${report.flakinessThreshold}%.  
        </div>
        <p class="text-muted mt-3">Zeitraum: ${new Date(report.timePeriod.start).toLocaleDateString()} bis ${new Date(report.timePeriod.end).toLocaleDateString()}</p>
      </div>
    `;
  } else {
    overviewDiv.innerHTML = `
      <div class="card-body">
        <div class="alert alert-info">Keine Flakiness-Daten verfügbar</div>
      </div>
    `;
  }
  
  flakinessContainer.appendChild(overviewDiv);
  
  // Chart für die Flakiness erstellen, wenn Daten vorhanden sind
  if (report && report.flakinessMeasures && report.flakinessMeasures.length > 0) {
    createFlakinessChart(report);
  }
}

/**
 * Zeigt die Liste der instabilsten Tests an
 * @param {Array} tests Liste der instabilsten Tests
 */
function displayFlakyTests(tests) {
  if (!flakyTestsContainer) return;
  
  // Container leeren
  flakyTestsContainer.innerHTML = '';
  
  if (!tests || tests.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'alert alert-info';
    noData.textContent = 'Keine instabilen Tests gefunden.';
    flakyTestsContainer.appendChild(noData);
    return;
  }
  
  // Überschrift und Kartencontainer
  const flakyTestsCard = document.createElement('div');
  flakyTestsCard.className = 'card mb-4';
  flakyTestsCard.innerHTML = `
    <div class="card-header bg-danger text-white">
      <h5 class="mb-0">Instabile Tests</h5>
    </div>
    <div class="card-body" id="flaky-tests-card-body">
      <!-- Hier werden die instabilen Tests eingefügt -->
    </div>
  `;
  
  flakyTestsContainer.appendChild(flakyTestsCard);
  const cardBody = document.getElementById('flaky-tests-card-body');
  
  // Instabile Tests anzeigen
  tests.forEach((test, index) => {
    const testCard = document.createElement('div');
    testCard.className = index > 0 ? 'card mb-3' : 'card';
    
    // Berechnung der Badge-Klasse basierend auf Flakiness-Score
    let badgeClass = 'bg-success';
    if (test.flakinessScore > 30) badgeClass = 'bg-danger';
    else if (test.flakinessScore > 20) badgeClass = 'bg-warning';
    
    testCard.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">${test.testName}</h6>
        <span class="badge ${badgeClass}">${test.flakinessScore.toFixed(1)}% Flakiness</span>
      </div>
      <div class="card-body">
        <div class="row mb-2">
          <div class="col-md-6">
            <p><strong>Erkannte Muster:</strong></p>
            <ul class="list-unstyled">
              ${test.detectedPatterns.map(pattern => `<li><i class="bi bi-exclamation-triangle text-warning"></i> ${pattern}</li>`).join('')}
            </ul>
          </div>
          <div class="col-md-6">
            <p><strong>Metriken:</strong></p>
            <ul class="list-unstyled">
              <li>Statusänderungen: ${test.statusChanges}</li>
              <li>Ausführungen: ${test.runCount}</li>
              <li>Laufzeitvarianz: ${test.durationVariance ? test.durationVariance.toFixed(1) + '%' : 'N/A'}</li>
            </ul>
          </div>
        </div>
        <div class="alert alert-secondary">
          <p class="mb-2"><strong>Empfehlungen:</strong></p>
          <ul>
            ${test.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    
    cardBody.appendChild(testCard);
  });
}

/**
 * Erstellt ein Chart für die Flakiness-Analyse
 * @param {Object} report Der Flakiness-Bericht mit den Daten für das Chart
 */
function createFlakinessChart(report) {
  if (!flakinessChartElement) {
    console.warn('Flakiness-Chart-Element nicht gefunden');
    return;
  }
  
  // Chart-Container erstellen
  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container mb-4';
  chartContainer.innerHTML = `
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">Flakiness nach Test</h5>
      </div>
      <div class="card-body">
        <canvas id="flakiness-chart-canvas" height="300"></canvas>
      </div>
    </div>
  `;
  
  flakinessContainer.appendChild(chartContainer);
  const canvas = document.getElementById('flakiness-chart-canvas');
  
  // Daten für das Chart aufbereiten
  const labels = report.flakinessMeasures.map(item => item.testName);
  const scores = report.flakinessMeasures.map(item => item.flakinessScore);
  
  // Farben basierend auf Flakiness-Score
  const backgroundColors = scores.map(score => {
    if (score < 20) return 'rgba(40, 167, 69, 0.7)';  // Grün für stabile Tests
    else if (score < 40) return 'rgba(255, 193, 7, 0.7)';  // Gelb für mittelmäßig stabile Tests
    else return 'rgba(220, 53, 69, 0.7)';  // Rot für instabile Tests
  });
  
  // Chart erstellen
  if (window.Chart) {
    if (flakinessChart) {
      flakinessChart.destroy();
    }
    
    flakinessChart = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Flakiness-Score (%)',
          data: scores,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1
        }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Verteilung der Instabilitätswerte'
        }
      }
    }
  });
}

/**
 * Berechnet die Verteilung der Flakiness-Werte
 */
function calculateFlakinessDistribution(measures) {
  const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  
  for (const measure of measures) {
    const index = Math.min(9, Math.floor(measure.flakinessScore / 10));
    distribution[index]++;
  }
  
  return distribution;
}

/**
 * Behandelt die Änderung der Tageanzahl
 */
function handleDaysChange(event) {
  currentDays = parseInt(event.target.value);
  loadFlakinessReport();
}

/**
 * Zeigt oder versteckt den Ladeindikator
 */
function showLoading(show) {
  if (flakinessLoadingIndicator) {
    flakinessLoadingIndicator.style.display = show ? 'block' : 'none';
  }
}

/**
 * Zeigt oder versteckt die Fehlermeldung
 */
function showError(show, message = '') {
  if (flakinessErrorMessage) {
    flakinessErrorMessage.style.display = show ? 'block' : 'none';
    if (show) {
      flakinessErrorMessage.textContent = message;
    }
  }
}

/**
 * Bestimmt die CSS-Klasse für eine Tabellenzeile basierend auf dem Flakiness-Score
 */
function getFlakinessRowClass(score) {
  if (score >= 70) return 'high-flakiness';
  if (score >= 30) return 'medium-flakiness';
  return 'low-flakiness';
}

/**
 * Gibt eine Farbe basierend auf dem Flakiness-Score zurück
 */
function getFlakinessColor(score) {
  if (score >= 70) return '#F44336';  // Rot für hohe Flakiness
  if (score >= 30) return '#FFC107';  // Gelb für mittlere Flakiness
  return '#4CAF50';  // Grün für niedrige Flakiness
}

// Export für globale Verwendung
window.FlakinessView = {
  loadFlakinessReport,
  loadFlakyTests,
  setDays: (days) => {
    currentDays = days;
    loadFlakinessReport();
  }
};