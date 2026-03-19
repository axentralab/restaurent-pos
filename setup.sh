#!/bin/bash
# setup.sh — One-command project setup
# Usage: bash setup.sh

set -e

echo ""
echo "🍔 foodashh POS — Setup"
echo "========================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found. Make sure PostgreSQL is running."
  echo "   Or use Docker: docker-compose up -d postgres"
fi

echo "📦 Installing backend dependencies..."
cd backend && npm install
echo ""

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install
echo ""

echo "🗄️  Setting up database..."
cd ../backend && node config/migrate.js
echo ""

echo "✅ Setup complete!"
echo ""
echo "Start the app:"
echo "  Backend:  cd backend  && npm run dev   → http://localhost:5000"
echo "  Frontend: cd frontend && npm run dev   → http://localhost:3000"
echo ""
echo "Demo accounts:"
echo "  Admin:   admin@pos.com   / admin123"
echo "  Cashier: cashier@pos.com / cashier123"
echo "  Waiter:  waiter@pos.com  / waiter123"
echo "  Chef:    chef@pos.com    / chef123"
echo ""
