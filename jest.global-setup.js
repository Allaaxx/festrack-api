import { execSync } from 'child_process';

export default async function globalSetup() {

    execSync('docker compose up -d --wait postgres-test');
    execSync('npx prisma db push');
}