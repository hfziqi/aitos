import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const desktopDir = resolve(rootDir, '../linkarm-desktop');

console.log('Building web application...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: rootDir,
  shell: true,
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Build failed');
    process.exit(code);
  }

  console.log('\nCopying files to release directory...');
  
  const releaseDir = resolve(desktopDir, 'release');
  if (existsSync(releaseDir)) {
    rmSync(releaseDir, { recursive: true });
  }
  mkdirSync(releaseDir, { recursive: true });

  copyFileSync(
    resolve(desktopDir, 'build/bin/Release/LinkArm.exe'),
    resolve(releaseDir, 'LinkArm.exe')
  );

  copyFileSync(
    resolve(desktopDir, 'webview2/build/native/x64/WebView2Loader.dll'),
    resolve(releaseDir, 'WebView2Loader.dll')
  );

  cpSync(
    resolve(rootDir, 'dist'),
    resolve(releaseDir, 'app'),
    { recursive: true }
  );

  console.log('\n✅ Build complete!');
  console.log(`Release directory: ${releaseDir}`);
});
