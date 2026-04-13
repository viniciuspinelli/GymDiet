#!/usr/bin/env node

/**
 * Health Check Script for Render
 * Verifies the application is running correctly
 */

const http = require('http');
const path = require('path');

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;
const url = `http://${host}:${port}`;

console.log(`🏥 Health check: ${url}`);

const request = http.get(url, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);

  if (res.statusCode === 200 || res.statusCode === 302) {
    console.log('✅ Application is healthy');
    process.exit(0);
  } else {
    console.error(`❌ Unexpected status code: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`❌ Health check failed: ${err.message}`);
  process.exit(1);
});

request.setTimeout(5000, () => {
  console.error('❌ Health check timeout');
  request.destroy();
  process.exit(1);
});
