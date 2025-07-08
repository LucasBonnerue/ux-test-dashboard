/**
 * dashboard-init.ts
 * Zentrale Initialisierung des UX-Test-Dashboards
 * 
 * Dieses Modul dient als zentraler Einstiegspunkt für das Frontend und
 * koordiniert die Kommunikation zwischen den verschiedenen Modulen über Events.
 */

// Da der Build-Prozess alle Module separat bundelt und die anderen Module
// ihre Funktionalität als globale Objekte exportieren, verwenden wir
// Typdefinitionen anstatt direkter Importe, um die Kompatibilität zu gewährleisten

// Typdefinitionen für die Module-Interfaces
interface SuccessRateViewModule {
  [key: string]: any;
  init: () => Promise<void>;
  loadSuccessRates: (timeRange?: string) => Promise<any>;
}

interface FlakinessViewModule {
  [key: string]: any;
  init: () => Promise<void>;
  loadFlakinessData: (days?: number) => Promise<any>;
}

interface LogsViewerModule {
  [key: string]: any;
  init: () => Promise<void>;
  fetchLogs: (filter?: any) => Promise<any>;
}

// Globale Typdefinitionen
declare global {
  interface Window {
    // Modul-Basis-Interfaces
    SuccessRateView: SuccessRateViewModule;
    FlakinessView: FlakinessViewModule;
    LogsViewer: LogsViewerModule;
    LogsView: {
      init: () => void;
      loadLogs: () => Promise<void>;
    };
    TestAnalysisView: {
      init: () => void;
      loadTestAnalysis: () => Promise<void>;
    };
    // Erweitere für weitere Module nach Bedarf
  }
}

/**
 * Eventtypen für die Dashboard-Kommunikation
 */
type DashboardEventType = 
  | 'dashboard:initialized' 
  | 'module:loaded' 
  | 'module:error' 
  | 'data:loading' 
  | 'data:loaded' 
  | 'data:error';

/**
 * Interface für Dashboard-Events
 */
interface DashboardEventDetail {
  source: string;
  message?: string;
  data?: unknown;
  error?: Error | unknown;
}

/**
 * Dashboard-Klasse zur zentralen Steuerung der Anwendung
 * Implementiert den Controller für alle Module und deren Kommunikation
 */
class DashboardController {
  /**
   * Initialisiert das Dashboard und alle Module
   */
  public static init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Initialisiere UX-Test-Dashboard...');
      
      // Tab-Event-Listener hinzufügen
      this.setupTabListeners();
      
      // Dashboard-Module initialisieren
      this.initializeModules();
      
      // Event-Listener für modulare Kommunikation einrichten
      this.setupEventListeners();
      
      // Dashboard-Initialisierung abgeschlossen
      this.dispatchDashboardEvent('dashboard:initialized', {
        source: 'DashboardController',
        message: 'Dashboard erfolgreich initialisiert'
      });
    });
  }

  /**
   * Richtet Event-Listener für Tab-Wechsel ein
   */
  private static setupTabListeners(): void {
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
      tab.addEventListener('shown.bs.tab', (event) => {
        const target = (event.target as HTMLElement).getAttribute('data-bs-target');
        
        // Initialisiere modulspezifische Funktionen basierend auf dem aktivierten Tab
        switch (target) {
          case '#metrics-content':
            this.initTestMetricsVisualizations();
            break;
          case '#system-logs':
            // Logs-Modul aktivieren, wenn vorhanden
            if (window.LogsView && typeof window.LogsView.init === 'function') {
              window.LogsView.init();
            }
            break;
          case '#test-analysis':
            // Test-Analysis-Modul aktivieren, wenn vorhanden
            if (window.TestAnalysisView && typeof window.TestAnalysisView.init === 'function') {
              window.TestAnalysisView.init();
            }
            break;
        }
      });
    });
  }

  /**
   * Initialisiert alle Dashboard-Module
   */
  private static initializeModules(): void {
    // Event-Listener für den Refresh-Button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Dashboard neu laden
        window.location.reload();
      });
    }
    
    // Teststart-Button-Eventlistener
    const startTestBtn = document.getElementById('startTestBtn');
    if (startTestBtn) {
      startTestBtn.addEventListener('click', () => {
        // Test starten (kann später durch echte Test-Logik ersetzt werden)
        console.log('Test wird gestartet...');
        const modal = document.getElementById('runTestModal');
        if (modal) {
          // Bootstrap 5 API für Modals verwenden
          // @ts-ignore - Bootstrap-Typen sind nicht direkt verfügbar
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) {
            bsModal.hide();
          }
        }
      });
    }
  }

  /**
   * Initialisiert die Testmetriken-Visualisierungen
   */
  private static initTestMetricsVisualizations(): void {
    // Prüfen, ob die Module geladen wurden
    if (typeof window.SuccessRateView === 'undefined' || typeof window.FlakinessView === 'undefined') {
      const errorMessage = 'Testmetriken-Module nicht geladen!';
      console.error(errorMessage);
      
      // Fehler-Event auslösen
      this.dispatchDashboardEvent('module:error', {
        source: 'DashboardController',
        message: errorMessage
      });
      
      const errorElement = document.getElementById('test-metrics-error');
      if (errorElement) {
        errorElement.classList.remove('d-none');
      }
      return;
    }
    
    // Lade-Status anzeigen und Event senden
    this.dispatchDashboardEvent('data:loading', {
      source: 'TestMetricsVisualization',
      message: 'Lade Testmetriken-Daten...'
    });
    
    const loadingElement = document.getElementById('test-metrics-loading');
    if (loadingElement) {
      loadingElement.classList.remove('d-none');
    }
    
    try {
      // Erfolgsraten-Visualisierung initialisieren
      window.SuccessRateView.loadSuccessRates()
        .catch((error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
          this.dispatchDashboardEvent('data:error', {
            source: 'SuccessRateView',
            message: errorMessage,
            error
          });
        });
      
      // Flakiness-Visualisierung initialisieren
      window.FlakinessView.loadFlakinessReport()
        .catch((error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
          this.dispatchDashboardEvent('data:error', {
            source: 'FlakinessView',
            message: errorMessage,
            error
          });
        });
      
      // Event-Handler für den Ladevorgang
      const loadingEl = document.getElementById('test-metrics-loading');
      const errorEl = document.getElementById('test-metrics-error');
      
      // Beim Laden der Seite die Ladeanimation ausblenden
      if (loadingEl) {
        setTimeout(() => {
          loadingEl.classList.add('d-none');
          
          // Daten geladen-Event senden
          this.dispatchDashboardEvent('data:loaded', {
            source: 'TestMetricsVisualization',
            message: 'Testmetriken-Daten erfolgreich geladen'
          });
        }, 1000); // Kurze Verzögerung für UX
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('Fehler beim Initialisieren der Testmetriken:', errorMessage);
      
      // Fehler-Event auslösen
      this.dispatchDashboardEvent('module:error', {
        source: 'TestMetricsVisualization',
        message: errorMessage,
        error
      });
    }
  }
  
  /**
   * Richtet allgemeine Event-Listener für das Dashboard ein
   */
  private static setupEventListeners(): void {
    // Lausche auf Modul-Fehler
    document.addEventListener('module:error', (event: Event) => {
      const customEvent = event as CustomEvent<DashboardEventDetail>;
      console.error(`Modulfehler in ${customEvent.detail.source}:`, customEvent.detail.message);
      
      // Fehler in der UI anzeigen (generisch)
      const errorContainers = document.querySelectorAll('[data-error-container]');
      errorContainers.forEach(container => {
        const source = container.getAttribute('data-module-source');
        if (!source || source === customEvent.detail.source) {
          container.classList.remove('d-none');
          if (container instanceof HTMLElement) {
            container.innerHTML = `<div class="alert alert-danger">${customEvent.detail.message}</div>`;
          }
        }
      });
    });
    
    // Lausche auf Datenlade-Events
    document.addEventListener('data:loading', (event: Event) => {
      const customEvent = event as CustomEvent<DashboardEventDetail>;
      console.log(`Lade Daten aus ${customEvent.detail.source}...`);
      
      // Loading-Indikatoren für das entsprechende Modul einblenden
      const loadingContainers = document.querySelectorAll('[data-loading-container]');
      loadingContainers.forEach(container => {
        const source = container.getAttribute('data-module-source');
        if (!source || source === customEvent.detail.source) {
          container.classList.remove('d-none');
        }
      });
    });
    
    // Lausche auf abgeschlossene Datenladung
    document.addEventListener('data:loaded', (event: Event) => {
      const customEvent = event as CustomEvent<DashboardEventDetail>;
      console.log(`Daten aus ${customEvent.detail.source} geladen`);
      
      // Loading-Indikatoren für das entsprechende Modul ausblenden
      const loadingContainers = document.querySelectorAll('[data-loading-container]');
      loadingContainers.forEach(container => {
        const source = container.getAttribute('data-module-source');
        if (!source || source === customEvent.detail.source) {
          container.classList.add('d-none');
        }
      });
    });
  }
  
  /**
   * Sendet ein typisiertes Dashboard-Event
   */
  private static dispatchDashboardEvent(
    eventType: DashboardEventType,
    detail: DashboardEventDetail
  ): void {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      cancelable: true,
      detail
    });
    
    document.dispatchEvent(event);
    console.debug(`Event "${eventType}" gesendet von ${detail.source}:`, detail);
  }
}

// Dashboard automatisch initialisieren
// Der DashboardController.init() selbst fügt bereits einen DOMContentLoaded Event-Listener hinzu,
// daher reicht ein einzelner Aufruf hier
DashboardController.init();

export { DashboardController };
