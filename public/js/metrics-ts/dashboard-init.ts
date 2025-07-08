/**
 * dashboard-init.ts
 * Zentrale Initialisierung des UX-Test-Dashboards
 */

// Keine expliziten Importe, da die Module globale Objekte im Window-Namespace erstellen
// Typdefinitionen für die globalen Objekte, die von anderen Modulen exportiert werden
declare global {
  interface Window {
    SuccessRateView: {
      loadSuccessRates: () => Promise<void>;
      loadSuccessTrends: () => Promise<void>;
      setTimeRange: (start: Date, end: Date) => void;
    };
    FlakinessView: {
      loadFlakinessReport: () => Promise<void>;
      loadFlakyTests: () => Promise<void>;
      setDays: (days: number) => void;
    };
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
 * Dashboard-Klasse zur Steuerung der Anwendung
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
      console.error('Testmetriken-Module nicht geladen!');
      const errorElement = document.getElementById('test-metrics-error');
      if (errorElement) {
        errorElement.classList.remove('d-none');
      }
      return;
    }
    
    // Status anzeigen
    const loadingElement = document.getElementById('test-metrics-loading');
    if (loadingElement) {
      loadingElement.classList.remove('d-none');
    }
    
    // Erfolgsraten-Visualisierung initialisieren
    window.SuccessRateView.loadSuccessRates();
    // Event-Handler für den Ladevorgang
    const loadingEl = document.getElementById('test-metrics-loading');
    const errorEl = document.getElementById('test-metrics-error');
    
    // Beim Laden der Seite die Ladeanimation ausblenden
    if (loadingEl) {
      setTimeout(() => {
        loadingEl.classList.add('d-none');
      }, 1000); // Kurze Verzögerung für UX
    }
    
    // Flakiness-Visualisierung initialisieren
    window.FlakinessView.loadFlakinessReport();
    // Fehlerbehandlung durch Event-Listener
    document.addEventListener('metrics-error', (event: Event) => {
      const customEvent = event as CustomEvent<{message: string}>;
      console.error('Fehler bei der Datenverarbeitung:', customEvent.detail);
      if (errorEl) {
        errorEl.textContent = `Fehler beim Laden der Daten: ${customEvent.detail?.message || 'Unbekannter Fehler'}`;
        errorEl.classList.remove('d-none');
      }
    });
  }
}

// Dashboard automatisch initialisieren
// Der DashboardController.init() selbst fügt bereits einen DOMContentLoaded Event-Listener hinzu,
// daher reicht ein einzelner Aufruf hier
DashboardController.init();

export { DashboardController };
