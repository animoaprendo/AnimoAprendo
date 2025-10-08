#!/usr/bin/env node

/**
 * Production startup script for AnimoAprendo
 * Starts both Next.js and Socket.IO servers
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AnimoAprendo in production mode...');

// Start Socket.IO server
console.log('📡 Starting Socket.IO server...');
const socketServer = spawn('node', ['socket-server.js'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env }
});

socketServer.stdout.on('data', (data) => {
  console.log(`[Socket] ${data.toString().trim()}`);
});

socketServer.stderr.on('data', (data) => {
  console.error(`[Socket Error] ${data.toString().trim()}`);
});

// Start Next.js server
console.log('⚡ Starting Next.js server...');
const nextServer = spawn('npm', ['run', 'start'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env }
});

nextServer.stdout.on('data', (data) => {
  console.log(`[Next.js] ${data.toString().trim()}`);
});

nextServer.stderr.on('data', (data) => {
  console.error(`[Next.js Error] ${data.toString().trim()}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  socketServer.kill('SIGTERM');
  nextServer.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  socketServer.kill('SIGTERM');
  nextServer.kill('SIGTERM');
  process.exit(0);
});

socketServer.on('exit', (code) => {
  console.log(`Socket.IO server exited with code ${code}`);
});

nextServer.on('exit', (code) => {
  console.log(`Next.js server exited with code ${code}`);
});