#!/bin/bash
set -e

echo "=================================="
echo "TeikoTechnical Environment Setup"
echo "=================================="

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install -e .

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd dashboard
npm install
cd ..

# Run data pipeline
echo "🗄️  Loading cell count data into database..."
python load_data.py

# Verify setup
echo "✅ Verifying database setup..."
python -c "
import sqlite3
con = sqlite3.connect('data.db')
projects = con.execute('SELECT COUNT(*) FROM project').fetchone()[0]
subjects = con.execute('SELECT COUNT(*) FROM subject').fetchone()[0]
samples = con.execute('SELECT COUNT(*) FROM sample').fetchone()[0]
print(f'  ✓ {projects} projects')
print(f'  ✓ {subjects} subjects')
print(f'  ✓ {samples} samples')
con.close()
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Terminal 1: make dashboard"
echo "  Terminal 2: cd dashboard && npm run dev -- --host 0.0.0.0"
echo ""
