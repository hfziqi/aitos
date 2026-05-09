import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const desktopDir = resolve(rootDir, '../linkarm-desktop');

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
      console.log(`Detected Vite server on port: ${actualPort}`);
      
      setTimeout(() => {
        const exePath = resolve(desktopDir, 'build/bin/Release/LinkArm.exe');
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
          console.error('Failed to start desktop app:', err);
          viteProcess.kill();
          process.exit(1);
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
