import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../package.json');
const versionJsonPath = path.join(__dirname, '../src/version.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version || '0.0.0';

// Split version into components
const parts = currentVersion.split('.').map(Number);
if (parts.length === 3) {
  parts.push(0);
}

if (parts.length !== 4 || parts.some(isNaN)) {
  console.error(`Invalid version format in package.json: ${currentVersion}`);
  process.exit(1);
}

// Increment the 4th component
parts[3] += 1;
const newVersion = parts.join('.');

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

// Update/create src/version.json
const versionJson = { version: newVersion };
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8');

console.log(`Version auto-incremented: ${currentVersion} -> ${newVersion}`);
