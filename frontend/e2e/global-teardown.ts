import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function globalTeardown() {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.resolve(currentDir, '..', '..', 'scripts', 'cleanup_test_artifacts.js');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('Global teardown cleanup warning:', err);
  }
}
