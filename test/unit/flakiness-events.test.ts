import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import * as sinon from 'sinon';

// Importiere die Typdefinitionen für Tests
import './types';

// ESLint-Konfiguration für Tests
/* eslint-disable @typescript-eslint/no-explicit-any */

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
global.fetch = sinon.stub();

// Mock Chart.js for tests
global.window.Chart = {
  register: sinon.stub(),
  defaults: {
    font: { family: 'Arial' },
    scales: {}
  }
};

// Create necessary DOM elements for testing
function setupTestDOM() {
  // Flakiness DOM elements
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'flakiness-loading';
  loadingIndicator.style.display = 'none';
  document.body.appendChild(loadingIndicator);

  const errorContainer = document.createElement('div');
  errorContainer.id = 'flakiness-error';
  errorContainer.style.display = 'none';
  document.body.appendChild(errorContainer);

  const chartContainer = document.createElement('canvas');
  chartContainer.id = 'flakiness-chart';
  document.body.appendChild(chartContainer);

  const daySelector = document.createElement('select');
  daySelector.id = 'flakiness-days';
  daySelector.innerHTML = `
    <option value="7">7 Tage</option>
    <option value="14">14 Tage</option>
    <option value="30">30 Tage</option>
  `;
  document.body.appendChild(daySelector);

  return {
    loadingIndicator,
    errorContainer,
    chartContainer,
    daySelector
  };
}

// Flakiness module mock
const FlakinessModule = {
  dispatchFlakinessEvent(eventType, detail = {}) {
    // Module-specific event
    const moduleEvent = new CustomEvent(eventType, {
      bubbles: true,
      cancelable: true,
      detail: { source: 'FlakinessView', ...detail }
    });
    document.dispatchEvent(moduleEvent);
    
    // Map to dashboard event
    let dashboardEventType;
    if (eventType === 'flakiness:loading') dashboardEventType = 'data:loading';
    else if (eventType === 'flakiness:loaded') dashboardEventType = 'data:loaded';
    else if (eventType === 'flakiness:error') dashboardEventType = 'data:error';
    
    if (dashboardEventType) {
      const dashboardEvent = new CustomEvent(dashboardEventType, {
        bubbles: true,
        cancelable: true,
        detail: { source: 'FlakinessView', ...detail }
      });
      document.dispatchEvent(dashboardEvent);
    }
  },

  async loadFlakinessData(days = 7) {
    this.dispatchFlakinessEvent('flakiness:loading', { message: `Loading flakiness data for ${days} days` });
    
    try {
      // Show loading indicator
      const loadingIndicator = document.getElementById('flakiness-loading');
      if (loadingIndicator) loadingIndicator.style.display = 'block';
      
      // Simulate API call
      const response = await fetch(`/api/flakiness?days=${days}`);
      const data = await response.json();
      
      // Process data
      this.dispatchFlakinessEvent('flakiness:loaded', { data: data.flakiness });
      
      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      
      return data.flakiness;
    } catch (error) {
      // Handle error
      this.dispatchFlakinessEvent('flakiness:error', { 
        error,
        message: error instanceof Error ? error.message : 'Failed to load flakiness data'
      });
      
      // Show error message
      const errorContainer = document.getElementById('flakiness-error');
      const loadingIndicator = document.getElementById('flakiness-loading');
      
      if (errorContainer) {
        errorContainer.style.display = 'block';
        errorContainer.textContent = error instanceof Error ? 
          error.message : 'Unknown error loading flakiness data';
      }
      
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      
      throw error;
    }
  },

  handleDaysChanged(event) {
    const days = parseInt(event.target.value, 10);
    this.dispatchFlakinessEvent('flakiness:days-changed', { data: { days } });
    this.loadFlakinessData(days);
  },

  init() {
    const daySelector = document.getElementById('flakiness-days');
    if (daySelector) {
      daySelector.addEventListener('change', this.handleDaysChanged.bind(this));
    }
    
    // Initial load with default days
    return this.loadFlakinessData(7);
  }
};

describe('Flakiness Module Event Tests', () => {
  let domElements;
  let eventSpies = {
    loading: sinon.spy(),
    loaded: sinon.spy(),
    error: sinon.spy(),
    daysChanged: sinon.spy(),
    dashboardLoading: sinon.spy(),
    dashboardLoaded: sinon.spy(),
    dashboardError: sinon.spy()
  };
  
  beforeEach(() => {
    // Set up DOM
    domElements = setupTestDOM();
    
    // Set up event listeners
    document.addEventListener('flakiness:loading', eventSpies.loading);
    document.addEventListener('flakiness:loaded', eventSpies.loaded);
    document.addEventListener('flakiness:error', eventSpies.error);
    document.addEventListener('flakiness:days-changed', eventSpies.daysChanged);
    document.addEventListener('data:loading', eventSpies.dashboardLoading);
    document.addEventListener('data:loaded', eventSpies.dashboardLoaded);
    document.addEventListener('data:error', eventSpies.dashboardError);
    
    // Mock successful API response
    (global.fetch as sinon.SinonStub).resolves({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        flakiness: [
          { testId: 'test1', flakiness: 0.05, runs: 100 },
          { testId: 'test2', flakiness: 0.12, runs: 120 }
        ]
      })
    });
  });
  
  afterEach(() => {
    // Clean up
    Array.from(document.body.children).forEach(child => {
      document.body.removeChild(child);
    });
    
    // Reset spies and stubs
    sinon.restore();
    Object.values(eventSpies).forEach(spy => spy.resetHistory());
    
    // Remove event listeners
    document.removeEventListener('flakiness:loading', eventSpies.loading);
    document.removeEventListener('flakiness:loaded', eventSpies.loaded);
    document.removeEventListener('flakiness:error', eventSpies.error);
    document.removeEventListener('flakiness:days-changed', eventSpies.daysChanged);
    document.removeEventListener('data:loading', eventSpies.dashboardLoading);
    document.removeEventListener('data:loaded', eventSpies.dashboardLoaded);
    document.removeEventListener('data:error', eventSpies.dashboardError);
  });
  
  describe('Event Dispatching', () => {
    it('should dispatch both module-specific and dashboard events', () => {
      // Dispatch a flakiness event
      FlakinessModule.dispatchFlakinessEvent('flakiness:loading', { message: 'Loading flakiness data' });
      
      // Verify both events were fired
      expect(eventSpies.loading.calledOnce).to.be.true;
      expect(eventSpies.dashboardLoading.calledOnce).to.be.true;
      
      // Verify event details
      expect(eventSpies.loading.firstCall.args[0].detail.source).to.equal('FlakinessView');
      expect(eventSpies.loading.firstCall.args[0].detail.message).to.equal('Loading flakiness data');
      expect(eventSpies.dashboardLoading.firstCall.args[0].detail.source).to.equal('FlakinessView');
    });
  });
  
  describe('Data Loading', () => {
    it('should emit loading and loaded events during data fetching', async () => {
      // Call load function
      const result = await FlakinessModule.loadFlakinessData(14);
      
      // Check events were fired in correct order
      expect(eventSpies.loading.calledOnce).to.be.true;
      expect(eventSpies.loaded.calledOnce).to.be.true;
      expect(eventSpies.loading.calledBefore(eventSpies.loaded)).to.be.true;
      
      // Check dashboard events
      expect(eventSpies.dashboardLoading.calledOnce).to.be.true;
      expect(eventSpies.dashboardLoaded.calledOnce).to.be.true;
      
      // Check fetch was called with correct params
      expect((global.fetch as sinon.SinonStub).calledOnce).to.be.true;
      expect((global.fetch as sinon.SinonStub).firstCall.args[0]).to.include('days=14');
      
      // Check data was returned
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
    });
    
    it('should show and hide loading indicator during data loading', async () => {
      // Initial state should be hidden
      expect(domElements.loadingIndicator.style.display).to.equal('none');
      
      // Start loading
      const loadPromise = FlakinessModule.loadFlakinessData();
      
      // Loading indicator should be visible
      expect(domElements.loadingIndicator.style.display).to.equal('block');
      
      // Complete loading
      await loadPromise;
      
      // Loading indicator should be hidden again
      expect(domElements.loadingIndicator.style.display).to.equal('none');
    });
    
    it('should handle API errors and dispatch error events', async () => {
      // Make API call fail
      (global.fetch as sinon.SinonStub).rejects(new Error('Network error'));
      
      try {
        await FlakinessModule.loadFlakinessData();
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Check error events
        expect(eventSpies.error.calledOnce).to.be.true;
        expect(eventSpies.dashboardError.calledOnce).to.be.true;
        
        // Check error details
        expect(eventSpies.error.firstCall.args[0].detail.error).to.be.instanceOf(Error);
        expect(eventSpies.error.firstCall.args[0].detail.error.message).to.equal('Network error');
        
        // Check UI updates
        expect(domElements.errorContainer.style.display).to.equal('block');
        expect(domElements.loadingIndicator.style.display).to.equal('none');
      }
    });
  });
  
  describe('Day Selection Changes', () => {
    it('should dispatch days-changed event when days selection changes', () => {
      // Set up event handler
      domElements.daySelector.addEventListener('change', (e) => FlakinessModule.handleDaysChanged(e));
      
      // Change days
      domElements.daySelector.value = '30';
      const changeEvent = new Event('change');
      domElements.daySelector.dispatchEvent(changeEvent);
      
      // Verify event was dispatched
      expect(eventSpies.daysChanged.calledOnce).to.be.true;
      expect(eventSpies.daysChanged.firstCall.args[0].detail.data.days).to.equal(30);
      
      // Verify loading was triggered
      expect(eventSpies.loading.calledOnce).to.be.true;
    });
  });
  
  describe('Module Initialization', () => {
    it('should attach event handlers and load initial data on init', async () => {
      // Call init
      await FlakinessModule.init();
      
      // Verify initial data was loaded
      expect(eventSpies.loading.calledOnce).to.be.true;
      expect(eventSpies.loaded.calledOnce).to.be.true;
      
      // Test that event handler was attached by simulating a change
      domElements.daySelector.value = '14';
      const changeEvent = new Event('change');
      domElements.daySelector.dispatchEvent(changeEvent);
      
      // Now we should have a days-changed event and a second loading event
      expect(eventSpies.daysChanged.calledOnce).to.be.true;
      expect(eventSpies.loading.calledTwice).to.be.true;
    });
  });
});
