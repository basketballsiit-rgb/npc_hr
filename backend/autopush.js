const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const WATCH_DIR = path.join(__dirname, '..');
const DEBOUNCE_MS = 5000; // Wait 5 seconds after the last change before pushing

let debounceTimer = null;
let changedFiles = new Set();

function isIgnored(filePath) {
  const relPath = path.relative(WATCH_DIR, filePath);
  
  // Ignore git folder, node_modules, local uploads, env files, and log files
  if (
    relPath.startsWith('.git' + path.sep) || relPath === '.git' ||
    relPath.startsWith('node_modules' + path.sep) || relPath === 'node_modules' ||
    relPath.startsWith('backend' + path.sep + 'public' + path.sep + 'uploads' + path.sep) ||
    relPath === 'backend/public/uploads' ||
    relPath === 'backend' + path.sep + '.env' ||
    relPath === '.env' ||
    relPath.endsWith('.log') ||
    relPath.includes('debug_') ||
    relPath.includes('check_db')
  ) {
    return true;
  }
  return false;
}

function runGitPush() {
  console.log(`\n[AutoPush] Changes detected in:`, Array.from(changedFiles));
  console.log(`[AutoPush] Running git push...`);
  
  changedFiles.clear();
  
  exec('git add .', { cwd: WATCH_DIR }, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ [AutoPush] git add failed:`, err.message);
      return;
    }
    
    const commitMsg = `Auto-commit: changes saved at ${new Date().toLocaleTimeString('th-TH')}`;
    exec(`git commit -m "${commitMsg}"`, { cwd: WATCH_DIR }, (err, stdout, stderr) => {
      // If there are no changes to commit, err will be set but it's not a real failure
      if (err && !stdout.includes('nothing to commit')) {
        console.log(`ℹ️ [AutoPush] Nothing to commit or git commit skipped.`);
        return;
      }
      
      console.log(`[AutoPush] Committed changes.`);
      exec('git push origin main', { cwd: WATCH_DIR }, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ [AutoPush] git push failed:`, err.message);
          return;
        }
        console.log(`✅ [AutoPush] Successfully pushed to GitHub origin main!`);
      });
    });
  });
}

console.log(`=== AutoPush Watcher Started ===`);
console.log(`Watching directory: ${WATCH_DIR}`);
console.log(`Waiting for file changes...`);

fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  
  const fullPath = path.join(WATCH_DIR, filename);
  if (isIgnored(fullPath)) return;
  
  // Add to changed list
  changedFiles.add(filename);
  
  // Reset debounce timer
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    runGitPush();
  }, DEBOUNCE_MS);
});
