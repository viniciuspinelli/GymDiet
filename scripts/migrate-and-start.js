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
    
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set!');
    }
    console.log('✅ DATABASE_URL configurada');
    
    // Run migrations
    console.log('📦 Sincronizando schema com banco de dados...');
    try {
      const output = execSync('npx prisma db push --skip-generate', { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8'
      });
      console.log(output);
    } catch (migrationError) {
      console.error('❌ Erro durante migrations:');
      console.error(migrationError.stdout || migrationError.message);
      console.error(migrationError.stderr || '');
      throw migrationError;
    }
    
    console.log('✅ Migrations aplicadas com sucesso!');
    
    // Seed database if needed
    console.log('🌱 Carregando dados iniciais...');
    try {
      execSync('node prisma/seed.js', { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8'
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
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
