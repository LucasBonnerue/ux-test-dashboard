/**
 * Logs-Viewer - TypeScript für die Log-Anzeige und -Filterung
 *
 * Diese Datei enthält alle Funktionen für:
 * - Log-Abruf vom Backend
 * - Filterung nach Log-Level und Komponenten
 * - Echtzeit-Aktualisierung
 * - Log-Download und -Export
 */

// Interface für Logs
interface LogEntry {
  timestamp: string;
  level: string;
  component?: string;
  message: string;
  raw: string;
}

// Interface für API-Antworten
interface LogResponse {
  logs: LogEntry[];
  count: number;
  components: string[];
}

// Interface für Filter-Status
interface LogFilters {
  search: string;
  levels: string[];
  component: string;
}

// Erweiterung der Window-Schnittstelle
declare global {
  interface Window {
    LogsViewer: {
      refreshLogs: () => Promise<LogResponse>;
      clearLogs: () => Promise<void>;
      downloadLogs: () => Promise<void>;
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente
  const logEntriesContainer = document.getElementById("log-entries") as HTMLDivElement;
  const logCountBadge = document.getElementById("log-count") as HTMLSpanElement;
  const refreshLogsBtn = document.getElementById("refresh-logs-btn") as HTMLButtonElement;
  const clearLogsBtn = document.getElementById("clear-logs-btn") as HTMLButtonElement;
  const downloadLogsBtn = document.getElementById("download-logs-btn") as HTMLButtonElement;
  const searchInput = document.getElementById("log-search") as HTMLInputElement;
  const searchBtn = document.getElementById("search-logs-btn") as HTMLButtonElement;
  const autoRefreshCheck = document.getElementById("auto-refresh") as HTMLInputElement;
  const componentFilter = document.getElementById("component-filter") as HTMLSelectElement;

  // Checkboxen für Log-Level
  const showDebug = document.getElementById("show-debug") as HTMLInputElement;
  const showInfo = document.getElementById("show-info") as HTMLInputElement;
  const showWarn = document.getElementById("show-warn") as HTMLInputElement;
  const showError = document.getElementById("show-error") as HTMLInputElement;

  // Log-Farben nach Level
  const logColors: Record<string, string> = {
    DEBUG: "#8a8a8a", // Grau
    INFO: "#ffffff", // Weiß
    WARN: "#ffc107", // Gelb
    WARNING: "#ffc107", // Gelb (Alias)
    ERROR: "#dc3545", // Rot
  };

  // Aktueller Filter-Status
  let currentFilters: LogFilters = {
    search: "",
    levels: ["DEBUG", "INFO", "WARN", "ERROR"],
    component: "all",
  };

  // Timer für Auto-Refresh
  let autoRefreshTimer: number | null = null;
  const REFRESH_INTERVAL = 5000; // 5 Sekunden

  // Logs vom Backend abrufen
  async function fetchLogs(): Promise<LogResponse> {
    try {
      // Query-Parameter aufbauen
      const params = new URLSearchParams();
      if (currentFilters.search) {
        params.append("search", currentFilters.search);
      }
      if (currentFilters.component !== "all") {
        params.append("component", currentFilters.component);
      }

      const response = await fetch(`/api/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status}`);
      }

      const data = await response.json() as LogResponse;
      displayLogs(data.logs);
      updateComponentFilter(data.components);
      updateLogCount(data.count);

      return data;
    } catch (error) {
      console.error("Fehler beim Abrufen der Logs:", error);
      logEntriesContainer.innerHTML = `
        <div class="alert alert-danger">
          <strong>Fehler beim Abrufen der Logs:</strong> ${(error as Error).message}
        </div>
      `;
      return { logs: [], count: 0, components: [] };
    }
  }

  // Logs im Container anzeigen
  function displayLogs(logs: LogEntry[]): void {
    // Container leeren
    logEntriesContainer.innerHTML = "";

    if (logs.length === 0) {
      logEntriesContainer.innerHTML =
        '<div class="text-muted">Keine Logs vorhanden oder alle gefiltert.</div>';
      return;
    }

    // Logs nach Level filtern
    const filteredLogs = logs.filter((log) =>
      currentFilters.levels.includes(log.level),
    );

    if (filteredLogs.length === 0) {
      logEntriesContainer.innerHTML =
        '<div class="text-muted">Keine Logs für die ausgewählten Filter.</div>';
      return;
    }

    // Logs anzeigen
    filteredLogs.forEach((log) => {
      const logDiv = document.createElement("div");
      logDiv.className = "log-entry";

      // Farbe nach Log-Level
      const color = logColors[log.level] || "#ffffff";

      // HTML für Log-Eintrag
      logDiv.innerHTML = `
        <span class="log-timestamp" style="color: #adb5bd">[${log.timestamp}]</span>
        <span class="log-level" style="color: ${color}">[${log.level}]</span>
        ${log.component ? `<span class="log-component" style="color: #17a2b8">[${log.component}]</span>` : ""}
        <span class="log-message">${escapeHTML(log.message)}</span>
      `;

      logEntriesContainer.appendChild(logDiv);
    });

    // Zum Ende scrollen
    logEntriesContainer.scrollTop = logEntriesContainer.scrollHeight;
  }

  // HTML-Sonderzeichen escapen
  function escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Komponenten-Filter aktualisieren
  function updateComponentFilter(components: string[]): void {
    // Aktuelle Auswahl merken
    const currentSelection = componentFilter.value;

    // Nur "Alle" behalten
    componentFilter.innerHTML = '<option value="all">Alle Komponenten</option>';

    // Neue Optionen hinzufügen
    components.forEach((component) => {
      const option = document.createElement("option");
      option.value = component;
      option.textContent = component;
      componentFilter.appendChild(option);
    });

    // Vorherige Auswahl wiederherstellen, wenn möglich
    if (components.includes(currentSelection)) {
      componentFilter.value = currentSelection;
    }
  }

  // Log-Zähler aktualisieren
  function updateLogCount(count: number): void {
    logCountBadge.textContent = count.toString();
  }

  // Auto-Refresh starten/stoppen
  function toggleAutoRefresh(): void {
    if (autoRefreshCheck.checked) {
      // Auto-Refresh starten
      if (!autoRefreshTimer) {
        autoRefreshTimer = window.setInterval(fetchLogs, REFRESH_INTERVAL);
      }
    } else {
      // Auto-Refresh stoppen
      if (autoRefreshTimer) {
        window.clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    }
  }

  // Logs herunterladen
  async function downloadLogs(): Promise<void> {
    try {
      // Alle Logs abrufen ohne Filter
      const response = await fetch("/api/logs");
      const data = await response.json() as LogResponse;

      if (data.logs.length === 0) {
        alert("Keine Logs zum Herunterladen vorhanden.");
        return;
      }

      // Log-Inhalt als Text aufbereiten
      let logContent = "";
      data.logs.reverse().forEach((log) => {
        logContent += `${log.raw}\n`;
      });

      // Download initiieren
      const blob = new Blob([logContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split("T")[0];

      const a = document.createElement("a");
      a.href = url;
      a.download = `evolution-hub-logs_${today}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Fehler beim Herunterladen der Logs:", error);
      alert(`Fehler beim Herunterladen der Logs: ${(error as Error).message}`);
    }
  }

  // Logs löschen
  async function clearLogs(): Promise<void> {
    if (
      !confirm(
        "Sollen wirklich alle Logs gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/logs", {
        method: "DELETE",
      });

      const data = await response.json() as { message: string };
      alert(data.message);

      // Logs neu laden
      fetchLogs();
    } catch (error) {
      console.error("Fehler beim Löschen der Logs:", error);
      alert(`Fehler beim Löschen der Logs: ${(error as Error).message}`);
    }
  }

  // Event-Listener registrieren

  // Manuelle Aktualisierung
  refreshLogsBtn.addEventListener("click", () => fetchLogs());

  // Logs löschen
  clearLogsBtn.addEventListener("click", () => clearLogs());

  // Logs herunterladen
  downloadLogsBtn.addEventListener("click", () => downloadLogs());

  // Suche
  searchBtn.addEventListener("click", () => {
    currentFilters.search = searchInput.value.trim();
    fetchLogs();
  });

  // Suche mit Enter-Taste
  searchInput.addEventListener("keyup", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      currentFilters.search = searchInput.value.trim();
      fetchLogs();
    }
  });

  // Log-Level-Filter
  showDebug.addEventListener("change", () => {
    updateLevelFilters();
    fetchLogs();
  });

  showInfo.addEventListener("change", () => {
    updateLevelFilters();
    fetchLogs();
  });

  showWarn.addEventListener("change", () => {
    updateLevelFilters();
    fetchLogs();
  });

  showError.addEventListener("change", () => {
    updateLevelFilters();
    fetchLogs();
  });

  // Komponenten-Filter
  componentFilter.addEventListener("change", () => {
    currentFilters.component = componentFilter.value;
    fetchLogs();
  });

  // Auto-Refresh
  autoRefreshCheck.addEventListener("change", () => toggleAutoRefresh());

  // Log-Level-Filter aktualisieren
  function updateLevelFilters(): void {
    currentFilters.levels = [];

    if (showDebug.checked) currentFilters.levels.push("DEBUG");
    if (showInfo.checked) currentFilters.levels.push("INFO");
    if (showWarn.checked) {
      currentFilters.levels.push("WARN");
      currentFilters.levels.push("WARNING");
    }
    if (showError.checked) currentFilters.levels.push("ERROR");
  }

  // Tab-Wechsel überwachen, um Logs zu laden, wenn der Log-Tab aktiviert wird
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (event) => {
      const target = event.target as HTMLElement;
      if (target.id === "logs-tab") {
        fetchLogs();
        toggleAutoRefresh(); // Auto-Refresh starten, wenn aktiviert
      } else {
        // Auto-Refresh stoppen, wenn ein anderer Tab aktiv ist
        if (autoRefreshTimer) {
          window.clearInterval(autoRefreshTimer);
          autoRefreshTimer = null;
        }
      }
    });
  });

  // Initialer Log-Abruf, wenn der Log-Tab von Anfang an aktiv ist
  if (document.querySelector("#logs-tab.active")) {
    fetchLogs();
    toggleAutoRefresh();
  }

  // Global verfügbar machen
  window.LogsViewer = {
    refreshLogs: fetchLogs,
    clearLogs,
    downloadLogs,
  };
});
