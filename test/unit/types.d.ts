/**
 * Typdefinitionen für die Test-Umgebung
 */

// Erweiterung der Window-Schnittstelle für Tests
interface Window {
  // Chart.js Typen
  Chart: {
    register: (...args: any[]) => void;
    defaults: {
      font: { family: string };
      scales: Record<string, any>;
      [key: string]: any;
    };
  };

  // Dashboard-Module
  SuccessRateView: {
    init: () => Promise<void>;
    loadSuccessRates: (timeRange?: string) => Promise<any>;
    [key: string]: any;
  };
  
  FlakinessView: {
    init: () => Promise<void>;
    loadFlakinessData: (days?: number) => Promise<any>;
    [key: string]: any;
  };

  LogsViewer: {
    init: () => Promise<void>;
    fetchLogs: (filter?: any) => Promise<any>;
    [key: string]: any;
  };

  DashboardController: {
    init: () => Promise<void>;
    handleError: (error: any) => void;
    [key: string]: any;
  };
}
