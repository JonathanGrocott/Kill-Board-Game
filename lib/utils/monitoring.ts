/**
 * Performance Monitoring Utilities
 * 
 * Tracks latency and performance metrics for real-time synchronization
 */

interface LatencyMetric {
  operation: string;
  startTime: number;
  endTime: number;
  latency: number;
  success: boolean;
}

class PerformanceMonitor {
  private metrics: LatencyMetric[] = [];
  private readonly maxMetrics = 100; // Keep last 100 metrics
  private readonly targetLatency = 200; // Target <200ms

  /**
   * Start timing an operation
   */
  startTimer(): number {
    return performance.now();
  }

  /**
   * End timing and record metric
   */
  endTimer(operation: string, startTime: number, success: boolean = true): number {
    const endTime = performance.now();
    const latency = endTime - startTime;

    const metric: LatencyMetric = {
      operation,
      startTime,
      endTime,
      latency,
      success,
    };

    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log warning if latency exceeds target
    if (latency > this.targetLatency) {
      console.warn(`⚠️ High latency detected: ${operation} took ${latency.toFixed(0)}ms (target: ${this.targetLatency}ms)`);
    } else {
      console.log(`✓ ${operation} completed in ${latency.toFixed(0)}ms`);
    }

    return latency;
  }

  /**
   * Get average latency for an operation
   */
  getAverageLatency(operation?: string): number {
    const relevantMetrics = operation
      ? this.metrics.filter(m => m.operation === operation && m.success)
      : this.metrics.filter(m => m.success);

    if (relevantMetrics.length === 0) return 0;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.latency, 0);
    return sum / relevantMetrics.length;
  }

  /**
   * Get success rate for an operation
   */
  getSuccessRate(operation?: string): number {
    const relevantMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const successCount = relevantMetrics.filter(m => m.success).length;
    return (successCount / relevantMetrics.length) * 100;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    averageLatency: number;
    successRate: number;
    slowOperations: number;
  } {
    return {
      totalOperations: this.metrics.length,
      averageLatency: this.getAverageLatency(),
      successRate: this.getSuccessRate(),
      slowOperations: this.metrics.filter(m => m.latency > this.targetLatency).length,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility to measure async function execution
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performanceMonitor.startTimer();
  try {
    const result = await fn();
    performanceMonitor.endTimer(operation, startTime, true);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operation, startTime, false);
    throw error;
  }
}

/**
 * Utility to measure sync function execution
 */
export function measureSync<T>(
  operation: string,
  fn: () => T
): T {
  const startTime = performanceMonitor.startTimer();
  try {
    const result = fn();
    performanceMonitor.endTimer(operation, startTime, true);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operation, startTime, false);
    throw error;
  }
}
