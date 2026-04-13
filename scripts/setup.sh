#!/bin/bash

# GymDiet - Setup for Render Production
# This script is run automatically on Render

set -e

echo "🚀 [$(date)] Starting GymDiet setup..."

# Verify environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
  echo "❌ ERROR: SESSION_SECRET is not set!"
  exit 1
fi

echo "✅ Environment variables verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration failed, attempting to create initial schema..."
  npx prisma db push --skip-generate
}

echo "✅ Setup completed successfully!"
echo "🎉 GymDiet is ready!"
