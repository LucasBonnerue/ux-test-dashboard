/**
 * TypeScript-Deklarationen für Chart.js
 * Diese Datei enthält die Typdefinitionen für die in der Frontend-UI verwendete Chart.js-Bibliothek
 */

// Chart.js auf Window-Objekt
interface Window {
  Chart: typeof Chart;
}

// Grundlegende Chart-Typen
declare class Chart {
  constructor(context: string | CanvasRenderingContext2D | HTMLCanvasElement, options: ChartConfiguration);
  
  update(): void;
  destroy(): void;
  
  static register(...items: any[]): void;
  static getChart(canvas: HTMLCanvasElement): Chart | undefined;
}

// Chart-Konfiguration
interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter';
  data: ChartData;
  options?: ChartOptions;
}

// Chart-Daten
interface ChartData {
  labels?: Array<string>;
  datasets: Array<ChartDataset>;
}

// Dataset-Konfiguration
interface ChartDataset {
  data: Array<number | null | undefined>;
  label?: string;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  tension?: number;
  fill?: boolean;
  pointRadius?: number;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
  pointHoverRadius?: number;
  pointHoverBackgroundColor?: string | string[];
  pointHoverBorderColor?: string | string[];
  [key: string]: any;
}

// Chart-Optionen
interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'left' | 'bottom' | 'right';
      align?: 'start' | 'center' | 'end';
    };
    title?: {
      display?: boolean;
      text?: string | string[];
      position?: 'top' | 'left' | 'bottom' | 'right';
      font?: {
        size?: number;
        family?: string;
        style?: string;
        weight?: string | number;
      };
    };
    tooltip?: {
      enabled?: boolean;
      mode?: 'point' | 'nearest' | 'index' | 'dataset' | 'x' | 'y';
      callbacks?: {
        title?: (context: any) => string | string[];
        label?: (context: any) => string | string[];
        footer?: (context: any) => string | string[];
        [key: string]: any;
      };
    };
    [key: string]: any;
  };
  
  scales?: {
    x?: {
      type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries';
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      grid?: {
        display?: boolean;
      };
    };
    y?: {
      type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries';
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      grid?: {
        display?: boolean;
      };
      ticks?: {
        beginAtZero?: boolean;
        precision?: number;
        callback?: (value: number, index: number, values: number[]) => string;
      };
    };
    [key: string]: any;
  };
  
  animation?: {
    duration?: number;
    easing?: string;
  };
  
  [key: string]: any;
}
