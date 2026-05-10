import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const desktopDir = resolve(rootDir, '../linkarm-desktop');

function printDesktopBuildGuide() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  LinkArm desktop app not built yet');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Vite dev server is running. You can access it in browser:');
  console.log('  http://localhost:7890');
  console.log('');
  console.log('  To build the desktop app:');
  console.log('');
  console.log('  Prerequisites: CMake 3.15+, Visual Studio 2022 (C++ desktop development)');
  console.log('');
  console.log('  cd linkarm-desktop');
  console.log('  mkdir build && cd build');
  console.log('  cmake ..');
  console.log('  cmake --build . --config Release');
  console.log('');
  console.log('  Or use the one-click script:');
  console.log('  cd linkarm && npm run desktop:build');
  console.log('');
  console.log('  After building, run npm run desktop:dev again');
  console.log('═══════════════════════════════════════════════════════════\n');
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
        printDesktopBuildGuide();
        return;
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