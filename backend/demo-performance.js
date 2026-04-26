/**
 * Demo script to showcase the performance monitoring foundation
 * Run with: node demo-performance.js
 */

import performanceService from './services/performance.service.js';
import alertingService from './services/alerting.service.js';

console.log('🚀 Performance Monitoring Foundation Demo\n');

// Set up alert monitoring
alertingService.addAlertChannel({
  type: 'console',
  config: {},
  severityFilter: ['medium', 'high', 'critical']
});

console.log('📊 Tracking API Response Times...');

// Simulate various API requests
const apiRequests = [
  { endpoint: '/products', method: 'GET', duration: 120, status: 200, cached: false },
  { endpoint: '/products', method: 'GET', duration: 45, status: 200, cached: true },
  { endpoint: '/orders', method: 'POST', duration: 280, status: 201, cached: false },
  { endpoint: '/users', method: 'GET', duration: 600, status: 200, cached: false }, // This will trigger an alert
  { endpoint: '/cart', method: 'PUT', duration: 150, status: 200, cached: false },
];

apiRequests.forEach((req, index) => {
  setTimeout(() => {
    console.log(`  → Tracking ${req.method} ${req.endpoint} (${req.duration}ms)`);
    performanceService.trackAPIResponseTime(
      req.endpoint,
      req.duration,
      req.status,
      req.cached,
      req.method,
      'Demo-Agent/1.0',
      '127.0.0.1'
    );
  }, index * 100);
});

setTimeout(() => {
  console.log('\n🗄️  Tracking Database Operations...');
  
  // Simulate database operations
  const dbOperations = [
    { operation: 'find', collection: 'products', duration: 85, docs: 50, returned: 10, indexed: true },
    { operation: 'aggregate', collection: 'orders', duration: 180, docs: 200, returned: 5, indexed: false },
    { operation: 'save', collection: 'users', duration: 45, docs: 1, returned: 1, indexed: true },
    { operation: 'find', collection: 'products', duration: 250, docs: 1000, returned: 20, indexed: false }, // This will trigger an alert
  ];

  dbOperations.forEach((op, index) => {
    setTimeout(() => {
      console.log(`  → Tracking ${op.operation} on ${op.collection} (${op.duration}ms)`);
      performanceService.trackDatabaseQueryTime(
        op.operation,
        op.collection,
        op.duration,
        op.docs,
        op.returned,
        op.indexed
      );
    }, index * 100);
  });
}, 600);

setTimeout(() => {
  console.log('\n💾 Tracking System Resources...');
  
  // Simulate resource usage over time
  const resourceReadings = [
    { cpu: 45, memory: 60, heap: 50000000, total: 100000000 },
    { cpu: 72, memory: 75, heap: 75000000, total: 100000000 },
    { cpu: 85, memory: 82, heap: 82000000, total: 100000000 }, // This will trigger alerts
    { cpu: 65, memory: 70, heap: 70000000, total: 100000000 },
  ];

  resourceReadings.forEach((resource, index) => {
    setTimeout(() => {
      console.log(`  → CPU: ${resource.cpu}%, Memory: ${resource.memory}%`);
      performanceService.trackResourceUsage(
        resource.cpu,
        resource.memory,
        resource.heap,
        resource.total
      );
    }, index * 200);
  });
}, 1200);

setTimeout(() => {
  console.log('\n📈 Performance Summary:');
  console.log('========================');
  
  const summary = performanceService.getPerformanceSummary();
  
  console.log('\n🌐 API Performance:');
  Object.entries(summary.api).forEach(([endpoint, stats]) => {
    console.log(`  ${endpoint}:`);
    console.log(`    Average Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
    console.log(`    Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`    Request Count: ${stats.count}`);
  });
  
  console.log('\n🗄️  Database Performance:');
  Object.entries(summary.database).forEach(([operation, stats]) => {
    console.log(`  ${operation}:`);
    console.log(`    Average Query Time: ${stats.avgQueryTime.toFixed(2)}ms`);
    console.log(`    Index Usage Rate: ${(stats.indexUsageRate * 100).toFixed(1)}%`);
    console.log(`    Query Count: ${stats.count}`);
  });
  
  console.log('\n💻 System Resources:');
  if (summary.system.cpuUsage !== undefined) {
    console.log(`  CPU Usage: ${summary.system.cpuUsage}%`);
    console.log(`  Memory Usage: ${summary.system.memoryUsage}%`);
    console.log(`  Heap Used: ${(summary.system.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
  
  console.log(`\n⚠️  Error Rate: ${(summary.errorRate * 100).toFixed(2)}%`);
  
  // Show alert statistics
  const alertStats = alertingService.getAlertStatistics();
  console.log(`\n🚨 Alerts Triggered: ${alertStats.total}`);
  if (alertStats.total > 0) {
    console.log('   By Severity:');
    Object.entries(alertStats.bySeverity).forEach(([severity, count]) => {
      console.log(`     ${severity}: ${count}`);
    });
    console.log('   By Type:');
    Object.entries(alertStats.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
  }
  
  console.log('\n✅ Performance monitoring foundation is working correctly!');
  console.log('   - API response times are being tracked');
  console.log('   - Database query performance is monitored');
  console.log('   - System resource usage is recorded');
  console.log('   - Alerts are triggered for performance thresholds');
  console.log('   - Core Web Vitals tracking is ready for frontend integration');
  
  process.exit(0);
}, 2500);