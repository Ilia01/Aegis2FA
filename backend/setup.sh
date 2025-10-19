#!/bin/bash

echo "Setting up 2FA Backend..."

if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env

  echo ""
  echo "IMPORTANT: Edit .env and add your credentials:"
  echo "   - DATABASE_URL"
  echo "   - JWT secrets (generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
  echo "   - Optional: Twilio credentials for SMS"
  echo "   - Optional: Email credentials"
  echo ""
  read -p "Press Enter after updating .env..."
fi

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "Setting up database..."
npm run prisma:migrate

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure PostgreSQL and Redis are running"
echo "  2. Start the server: npm run dev"
echo "  3. Test the API: http://localhost:3001/api/health"
echo ""