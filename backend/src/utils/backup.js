const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const BACKUP_DIR = path.join(__dirname, "../../../backups");
let isBackupRunning = false;
let lastBackupTime = 0;


// Find pg_dump path on Windows
const PG_DUMP_PATHS = [
  "pg_dump",
  "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
  "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
  "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
  "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
];

function getPgDumpPath() {
  for (const p of PG_DUMP_PATHS) {
    if (p === "pg_dump") continue; // We will try exec 'pg_dump' as fallback
    if (fs.existsSync(p)) return `"${p}"`;
  }
  return "pg_dump";
}

async function runDatabaseBackup() {
  if (process.env.NODE_ENV === "production") {
    return { skipped: true, reason: "Skipped in production environment" };
  }

  // Ensure backup directory exists (only needed in local/dev)
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Throttle backups to max once every 30 seconds
  const now = Date.now();
  if (now - lastBackupTime < 30000) {
    return { throttled: true };
  }

  if (isBackupRunning) return { running: true };
  isBackupRunning = true;

  return new Promise((resolve) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(BACKUP_DIR, `valano_backup_${timestamp}.sql`);
    const pgDump = getPgDumpPath();
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      isBackupRunning = false;
      return resolve({ error: "Missing DATABASE_URL" });
    }

    const command = `${pgDump} -d "${dbUrl}" -f "${backupFile}"`;

    exec(command, (error, stdout, stderr) => {
      isBackupRunning = false;
      lastBackupTime = Date.now();

      if (error) {
        console.error(`[BACKUP ERROR] pg_dump failed:`, error.message);
        return resolve({ error: error.message });
      }

      console.log(`[BACKUP SUCCESS] Database backup created: ${backupFile}`);
      
      // Clean up old backups (keep only the last 10 backups)
      try {
        const files = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith("valano_backup_") && f.endsWith(".sql"))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
          const toDelete = files.slice(10);
          for (const f of toDelete) {
            fs.unlinkSync(path.join(BACKUP_DIR, f.name));
            console.log(`[BACKUP CLEANUP] Removed old backup file: ${f.name}`);
          }
        }
      } catch (cleanupErr) {
        console.error(`[BACKUP CLEANUP ERROR]`, cleanupErr.message);
      }

      resolve({ success: true, file: backupFile });
    });
  });
}

module.exports = {
  runDatabaseBackup,
};
