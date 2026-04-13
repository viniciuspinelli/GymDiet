#!/bin/bash

# GymDiet - Startup Script for Render
# This script runs before the application starts
# It handles database migrations and seed data

set -e

echo "🚀 Starting GymDiet initialization..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "📦 Installing dependencies..."
npm ci --only=production

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "✅ GymDiet initialization completed!"
