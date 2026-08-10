import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const desktopDir = resolve(rootDir, '../linkarm-desktop');

// Ensure native deps are in place: WebView2Loader.dll must be in the same directory as LinkArm.exe
// consistent with how desktop-build.js deploys release
function ensureNativeDeps() {
  const srcDll = resolve(desktopDir, 'webview2/build/native/x64/WebView2Loader.dll');
  const dstDll = resolve(desktopDir, 'build/bin/Release/WebView2Loader.dll');
  if (existsSync(srcDll) && !existsSync(dstDll)) {
    copyFileSync(srcDll, dstDll);
    console.log('  Copied WebView2Loader.dll to build/bin/Release/');
  }
}

// When LinkArm.exe is not found, auto-run cmake configure + build
function autoBuildDesktop() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  LinkArm desktop app not built yet. Building now...');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('[1/2] Running cmake configuration...');
  execSync('cmake -B build -S .', { cwd: desktopDir, stdio: 'inherit', shell: true });

  console.log('\n[2/2] Building LinkArm (this may take a few minutes)...');
  execSync('cmake --build build --config Release', { cwd: desktopDir, stdio: 'inherit', shell: true });

  ensureNativeDeps();

  console.log('\n✅ Desktop app built successfully.\n');
}

async function main() {
  console.log('Starting Vite dev server...');
  
  const viteProcess = spawn('npx', ['vite'], {
    cwd: rootDir,
    shell: true,
    stdio: ['inherit', 'pipe', 'inherit']
  });

  let actualPort = null;

  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '').replace(/\?/g, '');
    const portMatch = cleanOutput.match(/Local:\s*http:\/\/localhost:(\d+)/);
    if (portMatch && !actualPort) {
      actualPort = parseInt(portMatch[1]);

      const exePath = resolve(desktopDir, 'build/bin/Release/LinkArm.exe');

      if (!existsSync(exePath)) {
        console.log(`Detected Vite server on port: ${actualPort}`);
        try {
          autoBuildDesktop();
        } catch (e) {
          console.error('\n❌ Auto build failed:', e.message);
          console.log('\n💡 Web version is still running at: http://localhost:' + actualPort);
          console.log('   Run "npm run desktop:build" manually for details.\n');
          return;
        }
      } else {
        // exe exists but dll may be missing (common in dev mode); fill in deps before launch
        ensureNativeDeps();
      }

      setTimeout(() => {
        console.log('Starting desktop app with --dev flag...');
        console.log(`Exe path: ${exePath}`);
        console.log(`Dev server: http://localhost:${actualPort}`);
        
        const launcherProcess = spawn(exePath, ['--dev', `--port=${actualPort}`], {
          cwd: resolve(desktopDir, 'build/bin/Release'),
          stdio: 'inherit'
        });

        launcherProcess.on('close', (code) => {
          console.log(`\nDesktop app closed with code ${code}`);
          viteProcess.kill();
          process.exit(code || 0);
        });

        launcherProcess.on('error', (err) => {
          console.error('\n❌ Failed to launch desktop app:', err.message);
          console.log('\n💡 Web version is still running at: http://localhost:' + actualPort);
          console.log('Press Ctrl+C to stop the server.\n');
        });
      }, 1000);
    }
  });

  viteProcess.on('close', (code) => {
    process.exit(code || 0);
  });

  process.on('SIGINT', () => {
    viteProcess.kill();
    process.exit(0);
  });
}

main();