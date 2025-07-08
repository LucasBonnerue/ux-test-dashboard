import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import * as sinon from 'sinon';

// Setup a fake DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'dangerously'
});

// Mock global objects
global.window = dom.window as any;
global.document = dom.window.document;
global.CustomEvent = dom.window.CustomEvent;
global.HTMLElement = dom.window.HTMLElement;

// Mocks für die Dashboard-Module
global.window.DashboardController = {
  handleError: sinon.stub(),
  init: sinon.stub().resolves()
};

// Event types für Tests
type TestEventType = 
  | 'data:loading' 
  | 'data:loaded' 
  | 'data:error' 
  | 'logs:loading' 
  | 'logs:loaded' 
  | 'logs:error' 
  | 'logs:filter-changed'
  | 'success-rate:loading'
  | 'success-rate:loaded'
  | 'success-rate:error'
  | 'success-rate:time-range-changed'
  | 'flakiness:loading'
  | 'flakiness:loaded'
  | 'flakiness:error'
  | 'flakiness:days-changed';

interface TestEventDetail {
  source: string;
  message?: string;
  data?: any;
  error?: Error | unknown;
}

// Hilfsfunktionen für Tests
function dispatchTestEvent(type: TestEventType, detail: Partial<TestEventDetail> = {}): CustomEvent {
  const event = new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: { source: 'TestSource', ...detail }
  });
  document.dispatchEvent(event);
  return event;
}

// Testsuite für das Event-System
describe('Event System Tests', () => {
  let eventSpy: sinon.SinonSpy;
  let loadingDiv: HTMLDivElement;
  let errorDiv: HTMLDivElement;
  
  beforeEach(() => {
    // Spy für Events einrichten
    eventSpy = sinon.spy();
    document.addEventListener('data:loading', eventSpy);
    document.addEventListener('data:loaded', eventSpy);
    document.addEventListener('data:error', eventSpy);
    
    // DOM-Elemente für Tests erstellen
    loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.style.display = 'none';
    
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.display = 'none';
    
    document.body.appendChild(loadingDiv);
    document.body.appendChild(errorDiv);
  });
  
  afterEach(() => {
    // Aufräumen nach Tests
    document.removeEventListener('data:loading', eventSpy);
    document.removeEventListener('data:loaded', eventSpy);
    document.removeEventListener('data:error', eventSpy);
    
    // DOM-Elemente entfernen
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }
    if (document.body.contains(errorDiv)) {
      document.body.removeChild(errorDiv);
    }
    
    // Alle Stubs zurücksetzen
    sinon.restore();
  });
  
  describe('Event Dispatching', () => {
    it('should dispatch events with correct source and detail', () => {
      // Test für Event-Dispatching
      const testMessage = 'Test loading message';
      const event = dispatchTestEvent('data:loading', { message: testMessage });
      
      // Überprüfen, ob Event korrekt erzeugt wurde
      expect(event).to.be.instanceOf(CustomEvent);
      expect(event.type).to.equal('data:loading');
      expect(event.detail.source).to.equal('TestSource');
      expect(event.detail.message).to.equal(testMessage);
      expect(event.bubbles).to.be.true;
      expect(event.cancelable).to.be.true;
    });
    
    it('should receive dispatched events via listeners', () => {
      // Event senden und prüfen, ob Listener aufgerufen wird
      dispatchTestEvent('data:loading', { message: 'Loading data' });
      
      expect(eventSpy.calledOnce).to.be.true;
      expect(eventSpy.firstCall.args[0].type).to.equal('data:loading');
      expect(eventSpy.firstCall.args[0].detail.message).to.equal('Loading data');
    });
  });
  
  describe('Logs Module Events', () => {
    // Wir simulieren ein einfaches Logs-Modul für Tests
    const LogsModule = {
      fetchLogs: async function() {
        dispatchTestEvent('logs:loading', { message: 'Fetching logs' });
        try {
          // API-Aufruf simulieren
          const data = await Promise.resolve({ logs: [{id: 1, message: 'Test log'}] });
          dispatchTestEvent('logs:loaded', { data: data.logs });
          return data;
        } catch (error) {
          dispatchTestEvent('logs:error', { error, message: 'Failed to fetch logs' });
          throw error;
        }
      },
      
      changeFilter: function(filter: string) {
        dispatchTestEvent('logs:filter-changed', { data: { filter } });
      }
    };
    
    it('should dispatch loading event when fetching logs', async () => {
      // Neuen Spy für logs:loading erstellen
      const logsLoadingSpy = sinon.spy();
      document.addEventListener('logs:loading', logsLoadingSpy);
      
      // Funktion mit API-Aufruf testen
      const fetchPromise = LogsModule.fetchLogs();
      
      // Überprüfen ob loading-Event gesendet wurde
      expect(logsLoadingSpy.calledOnce).to.be.true;
      expect(logsLoadingSpy.firstCall.args[0].detail.message).to.equal('Fetching logs');
      
      // Warten auf Abschluss des API-Aufrufs
      await fetchPromise;
      
      // Aufräumen
      document.removeEventListener('logs:loading', logsLoadingSpy);
    });
    
    it('should dispatch loaded event when logs are loaded successfully', async () => {
      // Spy für logs:loaded
      const logsLoadedSpy = sinon.spy();
      document.addEventListener('logs:loaded', logsLoadedSpy);
      
      // API-Aufruf durchführen
      await LogsModule.fetchLogs();
      
      // Überprüfen ob loaded-Event mit Daten gesendet wurde
      expect(logsLoadedSpy.calledOnce).to.be.true;
      expect(logsLoadedSpy.firstCall.args[0].detail.data).to.be.an('array');
      expect(logsLoadedSpy.firstCall.args[0].detail.data[0]).to.have.property('id', 1);
      
      // Aufräumen
      document.removeEventListener('logs:loaded', logsLoadedSpy);
    });
    
    it('should dispatch filter-changed event when filter is changed', () => {
      // Spy für filter-changed
      const filterChangedSpy = sinon.spy();
      document.addEventListener('logs:filter-changed', filterChangedSpy);
      
      // Filter ändern
      LogsModule.changeFilter('error');
      
      // Überprüfen ob Event gesendet wurde
      expect(filterChangedSpy.calledOnce).to.be.true;
      expect(filterChangedSpy.firstCall.args[0].detail.data.filter).to.equal('error');
      
      // Aufräumen
      document.removeEventListener('logs:filter-changed', filterChangedSpy);
    });
  });
  
  describe('Success Rate Module Events', () => {
    // Simuliertes Success-Rate-Modul
    const SuccessRateModule = {
      loadData: async function(timeRange: string) {
        dispatchTestEvent('success-rate:loading', { message: 'Loading success rate data' });
        try {
          // API-Aufruf simulieren
          const data = await Promise.resolve({ rates: [
            { date: '2023-01-01', rate: 0.95 },
            { date: '2023-01-02', rate: 0.97 }
          ]});
          dispatchTestEvent('success-rate:loaded', { data: data.rates });
          return data;
        } catch (error) {
          dispatchTestEvent('success-rate:error', { error, message: 'Failed to load success rates' });
          throw error;
        }
      },
      
      changeTimeRange: function(range: string) {
        dispatchTestEvent('success-rate:time-range-changed', { data: { timeRange: range } });
      }
    };
    
    it('should propagate module events to dashboard events', async () => {
      // Spies für Modul- und Dashboard-Events
      const moduleLoadingSpy = sinon.spy();
      const dashboardLoadingSpy = sinon.spy();
      
      document.addEventListener('success-rate:loading', moduleLoadingSpy);
      document.addEventListener('data:loading', dashboardLoadingSpy);
      
      // Funktion aufrufen, die Events sendet
      const loadPromise = SuccessRateModule.loadData('7days');
      
      // Überprüfen, ob beide Events gesendet wurden
      expect(moduleLoadingSpy.calledOnce).to.be.true;
      expect(dashboardLoadingSpy.called).to.be.true;
      
      // Event-Details prüfen
      expect(moduleLoadingSpy.firstCall.args[0].detail.message).to.equal('Loading success rate data');
      
      // Aufräumen
      document.removeEventListener('success-rate:loading', moduleLoadingSpy);
      document.removeEventListener('data:loading', dashboardLoadingSpy);
      
      await loadPromise;
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors via events', async () => {
      // Error-Handler-Spy
      const errorHandlerSpy = sinon.spy(global.window.DashboardController, 'handleError');
      
      // Error-Event senden
      const testError = new Error('Test error message');
      dispatchTestEvent('data:error', { 
        error: testError,
        message: 'An error occurred'
      });
      
      // Prüfen, ob Error-Handler aufgerufen wurde
      expect(errorHandlerSpy.calledOnce).to.be.true;
      
      // Oder prüfen, ob UI entsprechend aktualisiert wurde
      // (In einer realen Implementierung würden wir UI-Updates durch Events testen)
    });
  });
  
  describe('Cross-Module Communication', () => {
    it('should allow modules to communicate via events', () => {
      // Module-Kommunikation simulieren
      // Modul 1 sendet Event
      dispatchTestEvent('success-rate:time-range-changed', { data: { timeRange: '30days' } });
      
      // Modul 2 hat einen Listener (hier durch Spy simuliert)
      const module2Spy = sinon.spy();
      document.addEventListener('success-rate:time-range-changed', module2Spy);
      
      // Nochmal Event senden
      dispatchTestEvent('success-rate:time-range-changed', { data: { timeRange: '90days' } });
      
      // Prüfen, ob Modul 2 das Event erhalten hat
      expect(module2Spy.calledOnce).to.be.true;
      expect(module2Spy.firstCall.args[0].detail.data.timeRange).to.equal('90days');
      
      // Aufräumen
      document.removeEventListener('success-rate:time-range-changed', module2Spy);
    });
  });
});
