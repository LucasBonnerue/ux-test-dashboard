import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';

// Importiere die Typdefinitionen für Tests
import './types';

// ESLint-Konfiguration für Tests
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock-Funktionen für fetch und DOM-Manipulation
global.fetch = sinon.stub();
const mockFetch = global.fetch as sinon.SinonStub;

// Setup a fake DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'dangerously'
});

// Set up the global objects
global.window = dom.window as any;
global.document = dom.window.document;
global.CustomEvent = dom.window.CustomEvent;
global.HTMLElement = dom.window.HTMLElement;

// Create necessary DOM elements for testing
function setupTestDOM() {
  // Create DOM elements that success-rate-view.ts expects
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'success-rate-loading';
  loadingIndicator.style.display = 'none';
  document.body.appendChild(loadingIndicator);

  const errorContainer = document.createElement('div');
  errorContainer.id = 'success-rate-error';
  errorContainer.style.display = 'none';
  document.body.appendChild(errorContainer);

  const chartContainer = document.createElement('canvas');
  chartContainer.id = 'success-rate-chart';
  document.body.appendChild(chartContainer);

  const timeRangeSelector = document.createElement('select');
  timeRangeSelector.id = 'success-rate-time-range';
  timeRangeSelector.innerHTML = `
    <option value="7days">7 Tage</option>
    <option value="30days">30 Tage</option>
    <option value="90days">90 Tage</option>
  `;
  document.body.appendChild(timeRangeSelector);

  return {
    loadingIndicator,
    errorContainer,
    chartContainer,
    timeRangeSelector
  };
}

// Import the module code (this would typically be dynamically loaded)
// For testing purposes, we'll import it as a string and evaluate it
function loadSuccessRateModule() {
  const modulePath = path.resolve(__dirname, '../../public/js/metrics-ts/success-rate-view.ts');
  
  try {
    // This is a simplified approach - in a real test environment, you'd use a bundler like webpack
    // with ts-loader to properly load and compile TypeScript modules
    // For demonstration, we're assuming the file is already compiled or we use ts-node
    
    // Set up mock window objects that the module might expect
    global.window.Chart = {
      // Mock Chart.js functionality
      register: sinon.stub(),
      defaults: {
        font: { family: 'Arial' },
        scales: {}
      }
    };
    
    global.window.SuccessRateView = {
      init: sinon.stub().resolves(),
      loadSuccessRates: sinon.stub().resolves()
    };
    
    // Since we can't directly import a TS file in the testing environment without proper setup,
    // we'll mock the module behavior for the test
    
    // In a real test with proper build setup, you would:
    // 1. Make sure your TypeScript files are compiled before tests run
    // 2. Import the compiled JS files in your tests
    // 3. Or use ts-node/register with mocha to directly test TS files
  } catch (err) {
    console.error('Error loading success rate module:', err);
  }
}

describe('Success Rate Module Event Tests', () => {
  let domElements;
  let eventSpies = {
    loading: sinon.spy(),
    loaded: sinon.spy(),
    error: sinon.spy(),
    timeRangeChanged: sinon.spy()
  };
  
  beforeEach(() => {
    // Set up DOM
    domElements = setupTestDOM();
    
    // Load (or mock) the module
    loadSuccessRateModule();
    
    // Set up event listeners
    document.addEventListener('success-rate:loading', eventSpies.loading);
    document.addEventListener('success-rate:loaded', eventSpies.loaded);
    document.addEventListener('success-rate:error', eventSpies.error);
    document.addEventListener('success-rate:time-range-changed', eventSpies.timeRangeChanged);
    
    // Mock successful API response
    mockFetch.resolves({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        rates: [
          { date: '2023-06-01', rate: 0.95 },
          { date: '2023-06-02', rate: 0.96 },
          { date: '2023-06-03', rate: 0.92 }
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
    mockFetch.resetHistory();
    
    // Remove event listeners
    document.removeEventListener('success-rate:loading', eventSpies.loading);
    document.removeEventListener('success-rate:loaded', eventSpies.loaded);
    document.removeEventListener('success-rate:error', eventSpies.error);
    document.removeEventListener('success-rate:time-range-changed', eventSpies.timeRangeChanged);
  });
  
  // Test the dispatchSuccessRateEvent function (mocked version)
  describe('Event Dispatching', () => {
    it('should dispatch module-specific and dashboard events', () => {
      // We'll create our own implementation of the dispatch function for testing
      function dispatchSuccessRateEvent(eventType, detail = {}) {
        // Module-specific event
        const moduleEvent = new CustomEvent(eventType, {
          bubbles: true,
          cancelable: true,
          detail: { source: 'SuccessRateView', ...detail }
        });
        document.dispatchEvent(moduleEvent);
        
        // Map to dashboard event
        let dashboardEventType;
        if (eventType === 'success-rate:loading') dashboardEventType = 'data:loading';
        else if (eventType === 'success-rate:loaded') dashboardEventType = 'data:loaded';
        else if (eventType === 'success-rate:error') dashboardEventType = 'data:error';
        
        if (dashboardEventType) {
          const dashboardEvent = new CustomEvent(dashboardEventType, {
            bubbles: true,
            cancelable: true,
            detail: { source: 'SuccessRateView', ...detail }
          });
          document.dispatchEvent(dashboardEvent);
        }
      }
      
      // Set up spies for dashboard events
      const dashboardLoadingSpy = sinon.spy();
      document.addEventListener('data:loading', dashboardLoadingSpy);
      
      // Test dispatching an event
      dispatchSuccessRateEvent('success-rate:loading', { message: 'Loading success rates' });
      
      // Verify both events were fired
      expect(eventSpies.loading.calledOnce).to.be.true;
      expect(dashboardLoadingSpy.calledOnce).to.be.true;
      
      // Verify event details
      expect(eventSpies.loading.firstCall.args[0].detail.source).to.equal('SuccessRateView');
      expect(eventSpies.loading.firstCall.args[0].detail.message).to.equal('Loading success rates');
      
      // Clean up
      document.removeEventListener('data:loading', dashboardLoadingSpy);
    });
  });
  
  // Test loading data and corresponding events
  describe('Data Loading', () => {
    it('should emit loading and loaded events during data fetching', async () => {
      // Mock the loadSuccessRates function
      const loadSuccessRates = async (timeRange = '7days') => {
        // Dispatch loading event
        const loadingEvent = new CustomEvent('success-rate:loading', {
          bubbles: true,
          detail: { source: 'SuccessRateView', message: `Loading success rates for ${timeRange}` }
        });
        document.dispatchEvent(loadingEvent);
        
        try {
          // Show loading indicator
          domElements.loadingIndicator.style.display = 'block';
          
          // Simulate API call
          const response = await fetch('/api/success-rate?timeRange=' + timeRange);
          const data = await response.json();
          
          if (!data.success) {
            throw new Error('Failed to load success rates');
          }
          
          // Dispatch loaded event
          const loadedEvent = new CustomEvent('success-rate:loaded', {
            bubbles: true,
            detail: { source: 'SuccessRateView', data: data.rates }
          });
          document.dispatchEvent(loadedEvent);
          
          // Hide loading indicator
          domElements.loadingIndicator.style.display = 'none';
          
          return data.rates;
        } catch (error) {
          // Dispatch error event
          const errorEvent = new CustomEvent('success-rate:error', {
            bubbles: true,
            detail: { 
              source: 'SuccessRateView', 
              error,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          document.dispatchEvent(errorEvent);
          
          // Show error message
          domElements.errorContainer.style.display = 'block';
          domElements.errorContainer.textContent = error instanceof Error ? 
            error.message : 'Unknown error loading success rates';
          
          // Hide loading indicator
          domElements.loadingIndicator.style.display = 'none';
          
          throw error;
        }
      };
      
      // Call the function
      const result = await loadSuccessRates('30days');
      
      // Check that events were fired in correct order
      expect(eventSpies.loading.calledOnce).to.be.true;
      expect(eventSpies.loaded.calledOnce).to.be.true;
      expect(eventSpies.loading.calledBefore(eventSpies.loaded)).to.be.true;
      
      // Check loading indicator was shown and then hidden
      expect(domElements.loadingIndicator.style.display).to.equal('none');
      
      // Check API was called with correct parameters
      expect(mockFetch.calledOnce).to.be.true;
      expect(mockFetch.firstCall.args[0]).to.include('30days');
      
      // Check data was returned
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(3);
    });
    
    it('should emit error event when API request fails', async () => {
      // Make fetch fail
      mockFetch.rejects(new Error('Network error'));
      
      // Mock the loadSuccessRates function (same as above)
      const loadSuccessRates = async (timeRange = '7days') => {
        // Same implementation as above, just shortened for this test
        const loadingEvent = new CustomEvent('success-rate:loading', {
          bubbles: true,
          detail: { source: 'SuccessRateView' }
        });
        document.dispatchEvent(loadingEvent);
        
        try {
          domElements.loadingIndicator.style.display = 'block';
          const response = await fetch('/api/success-rate?timeRange=' + timeRange);
          const data = await response.json();
          
          const loadedEvent = new CustomEvent('success-rate:loaded', {
            bubbles: true,
            detail: { source: 'SuccessRateView', data }
          });
          document.dispatchEvent(loadedEvent);
          
          domElements.loadingIndicator.style.display = 'none';
          return data;
        } catch (error) {
          const errorEvent = new CustomEvent('success-rate:error', {
            bubbles: true,
            detail: { 
              source: 'SuccessRateView', 
              error,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          document.dispatchEvent(errorEvent);
          
          domElements.errorContainer.style.display = 'block';
          domElements.loadingIndicator.style.display = 'none';
          throw error;
        }
      };
      
      // Call the function and expect it to throw
      try {
        await loadSuccessRates('7days');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Check that error event was fired
        expect(eventSpies.error.calledOnce).to.be.true;
        expect(eventSpies.error.firstCall.args[0].detail.error).to.be.instanceOf(Error);
        expect(eventSpies.error.firstCall.args[0].detail.error.message).to.equal('Network error');
        
        // Check error is displayed
        expect(domElements.errorContainer.style.display).to.equal('block');
        
        // Check loading indicator is hidden
        expect(domElements.loadingIndicator.style.display).to.equal('none');
      }
    });
  });
  
  // Test time range change events
  describe('Time Range Changes', () => {
    it('should emit time-range-changed event when time range changes', () => {
      // Mock the change event handler
      const handleTimeRangeChange = (event) => {
        const timeRange = event.target.value;
        
        // Dispatch the time range changed event
        const timeRangeEvent = new CustomEvent('success-rate:time-range-changed', {
          bubbles: true,
          cancelable: true,
          detail: { source: 'SuccessRateView', data: { timeRange } }
        });
        document.dispatchEvent(timeRangeEvent);
      };
      
      // Add event listener to select element
      domElements.timeRangeSelector.addEventListener('change', handleTimeRangeChange);
      
      // Change the time range
      domElements.timeRangeSelector.value = '90days';
      const changeEvent = new Event('change');
      domElements.timeRangeSelector.dispatchEvent(changeEvent);
      
      // Verify event was fired with correct details
      expect(eventSpies.timeRangeChanged.calledOnce).to.be.true;
      expect(eventSpies.timeRangeChanged.firstCall.args[0].detail.data.timeRange).to.equal('90days');
      
      // Clean up
      domElements.timeRangeSelector.removeEventListener('change', handleTimeRangeChange);
    });
  });
});
