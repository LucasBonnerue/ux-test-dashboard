/**
 * TypeScript-Migration des Test-Analyse-Moduls
 * Konvertiert aus eingebettetem JS-Code in index.html
 */

// Typdefinitionen für die Test-Analyse
interface TestMetadata {
  name: string;
  description?: string;
  testType?: string;
  functionalAreas?: string[];
  selectors?: TestSelector[];
  assertions?: any[];
  coverage?: {
    area?: string[];
  };
}

interface TestSelector {
  type: 'testId' | 'role' | 'text' | 'css' | 'xpath';
  value: string;
}

interface QualityMetric {
  value: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  recommendation?: string;
}

interface QualityMetrics {
  [key: string]: QualityMetric;
}

interface CoverageMatrix {
  [area: string]: {
    [testType: string]: string[];
  };
}

interface FormattedMatrix {
  areas: string[];
  testTypes: string[];
  coverage: {
    [area: string]: {
      [testType: string]: number;
    };
  };
}

interface AnalysisData {
  testMetadata?: TestMetadata[];
  coverageMatrix?: CoverageMatrix;
  qualityMetrics?: QualityMetrics;
}

interface ComplexityDistribution {
  labels: string[];
  counts: number[];
}

interface SelectorTypeDistribution {
  labels: string[];
  counts: number[];
}

// Erweiterung des globalen Window-Objekts für Chart.js
declare global {
  interface Window {
    Chart: typeof Chart;
  }
}

// DOM-Elemente
let analysisSpinner: HTMLElement | null;
let analysisStatus: HTMLElement | null;
let metadataTableBody: HTMLElement | null;
let coverageMatrixBody: HTMLElement | null;
let coverageGaps: HTMLElement | null;
let qualityMetricsBody: HTMLElement | null;
let complexityChart: Chart | null = null;
let selectorChart: Chart | null = null;

// Event-Listener bei DOM-Bereitschaft
document.addEventListener('DOMContentLoaded', function() {
  // Test-Analyse Funktionalität - Initialisierung der globalen Variablen
  const runAnalysisBtn = document.getElementById('run-analysis-btn');
  analysisSpinner = document.getElementById('analysis-spinner');
  analysisStatus = document.getElementById('analysis-status');
  metadataTableBody = document.getElementById('metadata-table-body');
  coverageMatrixBody = document.getElementById('coverage-matrix-body');
  coverageGaps = document.getElementById('coverage-gaps');
  qualityMetricsBody = document.getElementById('quality-metrics-body');
  const metadataSearch = document.getElementById('metadata-search') as HTMLInputElement;
  const metadataFilterBtn = document.getElementById('metadata-filter-btn');
  
  // Filter-Buttons für Test-Metadaten
  const filterTypeButtons = document.querySelectorAll('[data-filter-type]');
  
  // Debug-Ausgabe zur Überprüfung der Elemente
  console.log('DOM-Elemente geladen:', {
    metadataTableBody: !!metadataTableBody,
    coverageMatrixBody: !!coverageMatrixBody,
    coverageGaps: !!coverageGaps,
    qualityMetricsBody: !!qualityMetricsBody,
    filterButtons: filterTypeButtons.length
  });
  
  // Diagramm-Initialisierung erfolgt global
  
  // Lade gespeicherte Analyseergebnisse beim Start, falls vorhanden
  loadAnalysisResults();
  
  // Event-Handler für den Analyse-Button
  if (runAnalysisBtn) {
    runAnalysisBtn.addEventListener('click', function() {
      runTestAnalysis();
    });
  }
  
  // Filter-Buttons für die Test-Typen
  if (filterTypeButtons) {
    filterTypeButtons.forEach(button => {
      button.addEventListener('click', function(this: Element) {
        // Aktiven Button markieren
        filterTypeButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        const filterType = (this as HTMLElement).dataset.filterType;
        filterTestMetadata(filterType || 'all', metadataSearch.value);
      });
    });
  }
  
  // Suche in den Test-Metadaten
  if (metadataSearch && metadataFilterBtn) {
    metadataFilterBtn.addEventListener('click', function() {
      const activeFilter = document.querySelector('[data-filter-type].active') as HTMLElement;
      const filterType = activeFilter ? activeFilter.dataset.filterType : 'all';
      filterTestMetadata(filterType || 'all', metadataSearch.value);
    });
    
    metadataSearch.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        const activeFilter = document.querySelector('[data-filter-type].active') as HTMLElement;
        const filterType = activeFilter ? activeFilter.dataset.filterType : 'all';
        filterTestMetadata(filterType || 'all', metadataSearch.value);
      }
    });
  }
});

/**
 * Test-Analyse ausführen
 */
function runTestAnalysis(): void {
  // UI-Status aktualisieren
  showAnalysisLoading(true);
  updateAnalysisStatus('info', 'Test-Analyse wird ausgeführt...');
  
  console.log('Test-Analyse API-Aufruf gestartet...');
  
  // API-Aufruf zur Analyse der Tests
  fetch('/api/test-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Leeres Objekt, kann später mit Optionen erweitert werden
  })
  .then(response => {
    console.log('API-Antwort erhalten:', response.status, response.statusText);
    if (!response.ok) {
      throw new Error('Fehler bei der Analyse: ' + response.statusText);
    }
    return response.json();
  })
  .then((data: AnalysisData) => {
    // Debug-Informationen
    console.log('API-Daten erhalten:', data);
    console.log('Test-Metadaten vorhanden:', Array.isArray(data.testMetadata), 
              'Anzahl Tests:', data.testMetadata ? data.testMetadata.length : 0);
    console.log('Coverage-Matrix vorhanden:', !!data.coverageMatrix, 
              'Anzahl Bereiche:', data.coverageMatrix?.areas?.length || 0);
    
    // Analyseergebnisse anzeigen
    updateAnalysisStatus('success', 'Analyse abgeschlossen!');
    
    if (!data.testMetadata || !Array.isArray(data.testMetadata)) {
      console.error('Ungültiges Format der Testmetadaten:', data.testMetadata);
      updateAnalysisStatus('warning', 'Keine gültigen Testdaten erhalten');
      return;
    }
    
    try {
      displayTestMetadata(data.testMetadata || []);
      displayCoverageMatrix(data.coverageMatrix || {});
      displayQualityMetrics(data);
      initCharts(data);
      
      // Erfolgs-Nachricht mit Details
      const testCount = data.testMetadata.length;
      if (analysisStatus) {
        analysisStatus.innerHTML = 
          `<div class="alert alert-success">
            <strong>Analyse abgeschlossen!</strong> 
            ${testCount} Tests gefunden und analysiert.
          </div>`;
      }
    } catch (displayError: any) {
      console.error('Fehler beim Anzeigen der Daten:', displayError);
      updateAnalysisStatus('warning', `Fehler bei der Datenanzeige: ${displayError.message}`);
    }
  })
  .catch((error: Error) => {
    console.error('Fehler bei der Test-Analyse:', error);
    updateAnalysisStatus('danger', `Fehler bei der Analyse: ${error.message}`);
  })
  .finally(() => {
    // Lade-Status zurücksetzen
    showAnalysisLoading(false);
  });
}

/**
 * Gespeicherte Analyseergebnisse laden
 */
function loadAnalysisResults(): void {
  fetch('/api/test-analysis/results')
  .then(response => {
    if (!response.ok) {
      throw new Error('Keine gespeicherten Ergebnisse verfügbar');
    }
    return response.json();
  })
  .then((data: AnalysisData) => {
    if (data && data.testMetadata && data.testMetadata.length > 0) {
      updateAnalysisStatus('info', 'Letzte Analyseergebnisse geladen');
      displayTestMetadata(data.testMetadata || []);
      displayCoverageMatrix(data.coverageMatrix || {});
      displayQualityMetrics(data);
      initCharts(data);
    }
  })
  .catch(error => {
    console.log('Keine gespeicherten Analyseergebnisse:', error.message);
    // Kein Error-Status nötig, da es normal ist, keine Ergebnisse zu haben
  });
}

/**
 * Test-Metadaten in der Tabelle anzeigen
 */
function displayTestMetadata(metadata: TestMetadata[]): void {
  if (!metadataTableBody) return;
  
  if (!metadata || metadata.length === 0) {
    metadataTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Keine Test-Metadaten verfügbar</td></tr>`;
    return;
  }
  
  metadataTableBody.innerHTML = '';
  
  metadata.forEach(test => {
    const complexity = calculateComplexity(test);
    const row = document.createElement('tr');
    row.dataset.testType = test.testType || 'unknown';
    row.dataset.testName = test.name || '';
    
    row.innerHTML = `
      <td>${test.name || 'Unbenannt'}</td>
      <td>${test.description || '-'}</td>
      <td>${formatFunctionalAreas(test.functionalAreas || [])}</td>
      <td>${test.selectors ? test.selectors.length : 0}</td>
      <td>${test.assertions ? test.assertions.length : 0}</td>
      <td>${formatComplexity(complexity)}</td>
      <td>
        <button class="btn btn-sm btn-outline-info view-test-btn" data-test-name="${test.name}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
          </svg>
        </button>
      </td>
    `;
    
    metadataTableBody!.appendChild(row);
  });
  
  // Event-Handler für Detail-Buttons
  const viewTestButtons = document.querySelectorAll('.view-test-btn');
  viewTestButtons.forEach(button => {
    button.addEventListener('click', function(this: HTMLElement) {
      const testName = this.dataset.testName;
      // Hier könnte ein Modal oder ein Detail-Bereich mit zusätzlichen Testinformationen angezeigt werden
      alert(`Detailansicht für Test: ${testName} (Wird in einem zukünftigen Update implementiert)`); 
    });
  });
}

/**
 * Konvertiert die Matrixdaten vom Backend in ein für das Frontend verwendbares Format
 */
function convertMatrixFormat(matrix: CoverageMatrix): FormattedMatrix | null {
  if (!matrix) return null;
  
  // Extrahiere alle Bereiche (Zeilen) und Testtypen (Spalten) aus den Matrixschlüsseln
  const areas = Object.keys(matrix);
  if (areas.length === 0) return null;
  
  // Sammle alle Testtypen aus allen Bereichen
  const testTypes = new Set<string>();
  areas.forEach(area => {
    Object.keys(matrix[area]).forEach(type => testTypes.add(type));
  });
  
  // Erstelle die Abdeckungsdaten - zähle Tests pro Bereich/Typ
  const coverage: { [area: string]: { [testType: string]: number } } = {};
  areas.forEach(area => {
    coverage[area] = {};
    Array.from(testTypes).forEach(type => {
      const tests = matrix[area][type];
      coverage[area][type] = tests ? tests.length : 0;
    });
  });
  
  return {
    areas: areas,
    testTypes: Array.from(testTypes),
    coverage: coverage
  };
}

/**
 * Identifiziert Lücken in der Testabdeckung
 */
function identifyCoverageGaps(formattedMatrix: FormattedMatrix): string[] {
  if (!formattedMatrix) return [];
  
  const gaps: string[] = [];
  
  // Suche nach Bereichen ohne Tests
  formattedMatrix.areas.forEach(area => {
    let hasTests = false;
    
    formattedMatrix.testTypes.forEach(type => {
      if (formattedMatrix.coverage[area][type] > 0) {
        hasTests = true;
      }
    });
    
    if (!hasTests) {
      gaps.push(`Funktionsbereich "${area}" hat keine Tests`);
    }
  });
  
  // Suche nach Testtypen, die in Bereichen fehlen
  formattedMatrix.areas.forEach(area => {
    formattedMatrix.testTypes.forEach(type => {
      if (formattedMatrix.coverage[area][type] === 0) {
        gaps.push(`Keine Tests vom Typ "${type}" für Bereich "${area}"`);
      }
    });
  });
  
  return gaps.slice(0, 10); // Begrenze auf die 10 wichtigsten Lücken
}

/**
 * Abdeckungsmatrix anzeigen
 */
function displayCoverageMatrix(rawMatrix: CoverageMatrix): void {
  if (!coverageMatrixBody || !rawMatrix) {
    console.error('Fehler: coverageMatrixBody nicht gefunden oder Matrix leer');
    return;
  }
  
  // Konvertiere in das für das Frontend benötigte Format
  const formattedMatrix = convertMatrixFormat(rawMatrix);
  
  if (!formattedMatrix) {
    console.error('Fehler: Matrix konnte nicht formatiert werden');
    coverageMatrixBody.innerHTML = '<tr><td colspan="10" class="text-center">Keine gültigen Matrixdaten verfügbar</td></tr>';
    return;
  }
  
  console.log('Formatierte Matrix:', formattedMatrix);
  
  coverageMatrixBody.innerHTML = '';
  
  // Funktionsbereiche in Zeilen darstellen
  formattedMatrix.areas.forEach(area => {
    const row = document.createElement('tr');
    
    // Bereichsname als erste Spalte
    const areaCell = document.createElement('td');
    areaCell.textContent = area;
    row.appendChild(areaCell);
    
    // Für jeden Testtyp eine Spalte mit Abdeckungsindikator
    formattedMatrix.testTypes.forEach(testType => {
      const cell = document.createElement('td');
      const coverage = formattedMatrix.coverage[area][testType];
      
      if (coverage && coverage > 0) {
        // Farbige Abdeckungsanzeige basierend auf der Anzahl der Tests
        const coverageClass = coverage > 3 ? 'bg-success' : 
                            coverage > 1 ? 'bg-info' : 'bg-warning';
        
        cell.innerHTML = `<span class="badge ${coverageClass}">${coverage}</span>`;
      } else {
        cell.innerHTML = `<span class="text-muted">-</span>`;
      }
      
      row.appendChild(cell);
    });
    
    coverageMatrixBody!.appendChild(row);
  });
  
  // Abdeckungslücken anzeigen
  const gaps = identifyCoverageGaps(formattedMatrix);
  displayCoverageGaps(gaps);
}

/**
 * Abdeckungslücken anzeigen
 */
function displayCoverageGaps(gaps: string[]): void {
  if (!coverageGaps) return;
  
  // Lücken in der UI darstellen
  if (gaps && gaps.length > 0) {
    let gapsHtml = '<ul class="mb-0">';
    gaps.forEach(gap => {
      gapsHtml += `<li>${gap}</li>`;
    });
    gapsHtml += '</ul>';
    coverageGaps.innerHTML = gapsHtml;
  } else {
    coverageGaps.innerHTML = '<p class="mb-0">Keine signifikanten Abdeckungslücken gefunden.</p>';
  }
}

/**
 * Berechnet Qualitätsmetriken aus den Testdaten
 */
function calculateQualityMetrics(testMetadata: TestMetadata[]): QualityMetrics {
  const metrics: QualityMetrics = {};
  
  if (!testMetadata || testMetadata.length === 0) return metrics;
  
  // Durchschnittliche Selektoren pro Test berechnen
  let totalSelectors = 0;
  let testsWithSelectors = 0;
  
  // Durchschnittliche Assertions pro Test berechnen
  let totalAssertions = 0;
  let testsWithAssertions = 0;
  
  // Selektortypen zählen für Selektorqualität
  let testIdSelectors = 0;
  let roleSelectors = 0;
  let textSelectors = 0;
  let cssSelectors = 0;
  let xpathSelectors = 0;
  
  testMetadata.forEach(test => {
    if (test.selectors && test.selectors.length > 0) {
      totalSelectors += test.selectors.length;
      testsWithSelectors++;
      
      // Zähle Selektortypen
      test.selectors.forEach(selector => {
        if (selector.type === 'testId') testIdSelectors++;
        else if (selector.type === 'role') roleSelectors++;
        else if (selector.type === 'text') textSelectors++;
        else if (selector.type === 'css') cssSelectors++;
        else if (selector.type === 'xpath') xpathSelectors++;
      });
    }
    
    if (test.assertions && test.assertions.length > 0) {
      totalAssertions += test.assertions.length;
      testsWithAssertions++;
    }
  });
  
  // Metriken berechnen
  const avgSelectors = testsWithSelectors > 0 ? (totalSelectors / testsWithSelectors).toFixed(1) : '0';
  const avgAssertions = testsWithAssertions > 0 ? (totalAssertions / testsWithAssertions).toFixed(1) : '0';
  
  // Selektorqualität berechnen (höhere Werte für testId und role, niedrigere für css und xpath)
  const totalSelectorCount = testIdSelectors + roleSelectors + textSelectors + cssSelectors + xpathSelectors;
  let selectorQuality = 0;
  
  if (totalSelectorCount > 0) {
    const testIdWeight = 1.0;
    const roleWeight = 0.8;
    const textWeight = 0.6;
    const cssWeight = 0.4;
    const xpathWeight = 0.2;
    
    selectorQuality = (testIdSelectors * testIdWeight + 
                     roleSelectors * roleWeight + 
                     textSelectors * textWeight + 
                     cssSelectors * cssWeight + 
                     xpathSelectors * xpathWeight) / totalSelectorCount;
    
    // Auf Skala von 0-100 normalisieren
    selectorQuality = Math.round(selectorQuality * 100);
  }
  
  // Testabdeckung berechnen (vereinfachte Berechnung basierend auf Funktionsbereichen)
  const coveredAreas = new Set<string>();
  testMetadata.forEach(test => {
    if (test.coverage && test.coverage.area) {
      test.coverage.area.forEach(area => coveredAreas.add(area));
    }
  });
  
  // Annahme: es gibt ungefähr 10 wichtige Funktionsbereiche in der Anwendung (anpassen nach Bedarf)
  const estimatedTotalAreas = 10;
  const coveragePercentage = Math.min(100, Math.round((coveredAreas.size / estimatedTotalAreas) * 100));
  
  // Metriken zusammenstellen
  metrics['Durchschnittliche Selektoren pro Test'] = {
    value: avgSelectors,
    status: Number(avgSelectors) >= 3 ? 'success' : 'warning',
    recommendation: Number(avgSelectors) < 3 ? 'Erhöhen Sie die Anzahl der Selektoren für robustere Tests.' : 'Gute Abdeckung mit Selektoren.'
  };
  
  metrics['Durchschnittliche Assertions pro Test'] = {
    value: avgAssertions,
    status: Number(avgAssertions) >= 2 ? 'success' : 'warning',
    recommendation: Number(avgAssertions) < 2 ? 'Erhöhen Sie die Anzahl der Assertions für gründlichere Tests.' : 'Gute Prüfungsabdeckung.'
  };
  
  metrics['Selektorqualität'] = {
    value: selectorQuality + '%',
    status: selectorQuality >= 70 ? 'success' : selectorQuality >= 50 ? 'warning' : 'danger',
    recommendation: selectorQuality < 70 ? 'Verwenden Sie mehr testId und role-basierte Selektoren.' : 'Gute Selektorqualität.'
  };
  
  metrics['Testabdeckung'] = {
    value: coveragePercentage + '%',
    status: coveragePercentage >= 80 ? 'success' : coveragePercentage >= 50 ? 'warning' : 'danger',
    recommendation: coveragePercentage < 80 ? 'Erweitern Sie Tests auf mehr Funktionsbereiche.' : 'Gute Testabdeckung.'
  };
  
  return metrics;
}

/**
 * Test-Qualitätsmetriken anzeigen
 */
function displayQualityMetrics(data: AnalysisData): void {
  if (!qualityMetricsBody) return;
  
  qualityMetricsBody.innerHTML = '';
  
  // Berechne Metriken aus den Testdaten
  const metrics = calculateQualityMetrics(data.testMetadata || []);
  
  // Fallback-Metriken, wenn keine Daten verfügbar sind
  if (Object.keys(metrics).length === 0) {
    metrics['Durchschnittliche Selektoren pro Test'] = { value: 'N/A', status: 'info', recommendation: 'Führen Sie eine Analyse durch.' };
    metrics['Durchschnittliche Assertions pro Test'] = { value: 'N/A', status: 'info', recommendation: 'Führen Sie eine Analyse durch.' };
    metrics['Selektorqualität'] = { value: 'N/A', status: 'info', recommendation: 'Führen Sie eine Analyse durch.' };
    metrics['Testabdeckung'] = { value: 'N/A', status: 'info', recommendation: 'Führen Sie eine Analyse durch.' };
  }
  
  // Metriken in der Tabelle anzeigen
  Object.entries(metrics).forEach(([metric, data]) => {
    const row = document.createElement('tr');
    
    const statusClass = data.status === 'success' ? 'text-success' :
                       data.status === 'warning' ? 'text-warning' :
                       data.status === 'danger' ? 'text-danger' : 'text-info';
    
    row.innerHTML = `
      <td>${metric}</td>
      <td>${data.value}</td>
      <td><span class="${statusClass}">${formatStatus(data.status)}</span></td>
      <td>${data.recommendation || '-'}</td>
    `;
    
    qualityMetricsBody!.appendChild(row);
  });
}

/**
 * Diagramme initialisieren und darstellen
 */
function initCharts(data: AnalysisData): void {
  // Chart.js verwenden, falls verfügbar
  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js ist nicht geladen. Diagramme werden nicht angezeigt.');
    return;
  }
  
  try {
    console.log('Starte Chart-Initialisierung');
    
    // Container-Elemente finden
    const complexityContainer = document.getElementById('complexity-chart-container');
    const selectorContainer = document.getElementById('selector-chart-container');
    
    if (!complexityContainer || !selectorContainer) {
      console.error('Chart-Container nicht gefunden:', { 
        complexityContainer: !!complexityContainer,
        selectorContainer: !!selectorContainer 
      });
      return;
    }
    
    // WICHTIG: Vorhandene Charts zerstören
    if (complexityChart) {
      complexityChart.destroy();
      complexityChart = null;
    }
    
    if (selectorChart) {
      selectorChart.destroy();
      selectorChart = null;
    }
    
    // Container vollständig leeren und neue Canvas-Elemente erstellen
    complexityContainer.innerHTML = '';
    selectorContainer.innerHTML = '';
    
    const complexityCanvas = document.createElement('canvas');
    complexityCanvas.height = 250;
    complexityContainer.appendChild(complexityCanvas);
    
    const selectorCanvas = document.createElement('canvas');
    selectorCanvas.height = 250;
    selectorContainer.appendChild(selectorCanvas);
    
    // Komplexitätsverteilung berechnen
    const complexityData = calculateComplexityDistribution(data.testMetadata || []);
    console.log('Berechnete Komplexitätsverteilung:', complexityData);
    
    // Selektor-Typen berechnen
    const selectorData = calculateSelectorTypeDistribution(data.testMetadata || []);
    console.log('Berechnete Selektor-Typen:', selectorData);
    
    // Diagramme erstellen
    complexityChart = new window.Chart(complexityCanvas, {
      type: 'bar',
      data: {
        labels: complexityData.labels,
        datasets: [{
          label: 'Test-Komplexitätsverteilung',
          data: complexityData.counts,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            // In neueren Chart.js-Versionen sind die Eigenschaften anders strukturiert
            ticks: {
              precision: 0,
              beginAtZero: true
            }
          }
        }
      }
    });
    
    selectorChart = new window.Chart(selectorCanvas, {
      type: 'pie',
      data: {
        labels: selectorData.labels,
        datasets: [{
          label: 'Selektortyp-Verteilung',
          data: selectorData.counts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      }
    });
    
  } catch (error) {
    console.error('Fehler bei der Chart-Initialisierung:', error);
  }
}

/**
 * Berechnet die Komplexitätsverteilung aus den Testdaten
 */
function calculateComplexityDistribution(testMetadata: TestMetadata[]): ComplexityDistribution {
  const complexityBuckets: { [key: string]: number } = {
    'Niedrig (0-5)': 0,
    'Mittel (6-15)': 0,
    'Hoch (16-30)': 0,
    'Sehr hoch (>30)': 0
  };
  
  testMetadata.forEach(test => {
    const complexity = calculateComplexity(test);
    
    if (complexity <= 5) {
      complexityBuckets['Niedrig (0-5)']++;
    } else if (complexity <= 15) {
      complexityBuckets['Mittel (6-15)']++;
    } else if (complexity <= 30) {
      complexityBuckets['Hoch (16-30)']++;
    } else {
      complexityBuckets['Sehr hoch (>30)']++;
    }
  });
  
  return {
    labels: Object.keys(complexityBuckets),
    counts: Object.values(complexityBuckets)
  };
}

/**
 * Berechnet die Verteilung der Selektortypen
 */
function calculateSelectorTypeDistribution(testMetadata: TestMetadata[]): SelectorTypeDistribution {
  const selectorTypes: { [key: string]: number } = {
    'TestID': 0,
    'Role': 0,
    'Text': 0,
    'CSS': 0,
    'XPath': 0
  };
  
  testMetadata.forEach(test => {
    if (test.selectors && test.selectors.length > 0) {
      test.selectors.forEach(selector => {
        if (selector.type === 'testId') selectorTypes['TestID']++;
        else if (selector.type === 'role') selectorTypes['Role']++;
        else if (selector.type === 'text') selectorTypes['Text']++;
        else if (selector.type === 'css') selectorTypes['CSS']++;
        else if (selector.type === 'xpath') selectorTypes['XPath']++;
      });
    }
  });
  
  return {
    labels: Object.keys(selectorTypes),
    counts: Object.values(selectorTypes)
  };
}

/**
 * Berechnet die Komplexität eines Tests
 */
function calculateComplexity(test: TestMetadata): number {
  // Einfache Komplexitätsberechnung basierend auf Selektoren und Assertions
  let complexity = 0;
  
  // Selektoren tragen zur Komplexität bei
  if (test.selectors) {
    complexity += test.selectors.length;
    
    // Zusätzliche Komplexität für kompliziertere Selektoren
    test.selectors.forEach(selector => {
      if (selector.type === 'css' || selector.type === 'xpath') {
        complexity += 1; // Komplexere Selektoren haben höheren Wert
      }
    });
  }
  
  // Assertions tragen zur Komplexität bei
  if (test.assertions) {
    complexity += test.assertions.length * 2; // Assertions haben höheren Einfluss
  }
  
  return complexity;
}

/**
 * Formatiert die Komplexität für die Anzeige
 */
function formatComplexity(complexity: number): string {
  let badge = 'bg-success';
  let label = 'Niedrig';
  
  if (complexity > 30) {
    badge = 'bg-danger';
    label = 'Sehr hoch';
  } else if (complexity > 15) {
    badge = 'bg-warning';
    label = 'Hoch';
  } else if (complexity > 5) {
    badge = 'bg-info';
    label = 'Mittel';
  }
  
  return `<span class="badge ${badge}">${label} (${complexity})</span>`;
}

/**
 * Formatiert eine Liste von Funktionsbereichen für die Anzeige
 */
function formatFunctionalAreas(areas: string[]): string {
  if (!areas || areas.length === 0) {
    return '-';
  }
  
  return areas.map(area => `<span class="badge bg-secondary me-1">${area}</span>`).join(' ');
}

/**
 * Formatiert einen Status als Text
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'success': return 'Gut';
    case 'warning': return 'Verbesserbar';
    case 'danger': return 'Problematisch';
    case 'info':
    default: return 'Information';
  }
}

/**
 * Test-Metadaten filtern nach Typ und Suchbegriff
 */
function filterTestMetadata(filterType: string, searchTerm: string): void {
  if (!metadataTableBody) return;
  
  const rows = metadataTableBody.querySelectorAll('tr');
  let visibleCount = 0;
  
  rows.forEach(row => {
    const testType = row.dataset.testType || 'unknown';
    const testName = (row.dataset.testName || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Filter anwenden
    const matchesType = filterType === 'all' || testType === filterType;
    const matchesSearch = !searchTerm || testName.includes(searchLower);
    
    // Zeile ein-/ausblenden
    if (matchesType && matchesSearch) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Status-Nachricht anzeigen
  if (visibleCount === 0 && rows.length > 0) {
    // Wenn keine Tests den Kriterien entsprechen, zeige Hinweis an
    updateAnalysisStatus('info', `Keine Tests entsprechen den Filterkriterien.`);
  } else if (visibleCount < rows.length) {
    // Wenn einige Tests gefiltert wurden
    updateAnalysisStatus('info', `${visibleCount} von ${rows.length} Tests werden angezeigt.`);
  }
}

/**
 * Status der Analyse aktualisieren
 */
function updateAnalysisStatus(type: 'success' | 'info' | 'warning' | 'danger', message: string): void {
  if (!analysisStatus) return;
  
  analysisStatus.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

/**
 * Lade-Status anzeigen/verstecken
 */
function showAnalysisLoading(show: boolean): void {
  if (!analysisSpinner) return;
  
  if (show) {
    analysisSpinner.classList.remove('d-none');
  } else {
    analysisSpinner.classList.add('d-none');
  }
}
