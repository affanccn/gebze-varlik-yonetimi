import { execSync } from 'child_process';
import path from 'path';

export default async function globalTeardown() {
  try {
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'cleanup_test_artifacts.js');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('Global teardown cleanup warning:', err);
  }
}
