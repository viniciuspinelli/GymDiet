#!/usr/bin/env node

/**
 * Startup script that ensures migrations are applied before starting the app
 * Used for Render free tier (no shell access)
 */

const { execSync } = require('child_process');
const path = require('path');

async function main() {
  try {
    console.log('🔄 Verificando migrações...');
    
    // Run migrations
    console.log('📦 Executando migrations...');
    execSync('npx prisma migrate deploy --skip-generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Migrations aplicadas com sucesso!');
    
    // Seed database if needed
    console.log('🌱 Carregando dados iniciais...');
    try {
      execSync('node prisma/seed.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Dados iniciais carregados!');
    } catch (e) {
      // Seed pode falhar se dados já existem - isso é ok
      console.log('ℹ️  Seed já foi executado ou dados já existem');
    }
    
    console.log('🚀 Iniciando aplicação...');
    
    // Start the app
    require('../app');
    
  } catch (error) {
    console.error('❌ Erro durante startup:', error.message);
    process.exit(1);
  }
}

main();
