const { exec } = require("child_process");

const runMigrations = async () => {
  try {
    return new Promise((resolve, reject) => {

      console.log("Running migrations...");
      const migrateProcess = exec("npm run migrate");

      let stdoutData = "";
      let stderrData = "";

      migrateProcess.stdout.on("data", (data) => {
        console.log("stdout:", data);
        stdoutData += data;
      });

      migrateProcess.stderr.on("data", (data) => {
        console.error("stderr:", data);
        stderrData += data;
      });

      migrateProcess.on("close", (code) => {
        console.log(`Migration process exited with code ${code}`);
        if (code === 0) {
          resolve({ code, stdout: stdoutData, stderr: stderrData });
        } else {
          reject({ code, stdout: stdoutData, stderr: stderrData });
        }
      });
    });
  } catch (err) {
    console.log("Migration is already running on another instance or lock error:", err);
  }
};

module.exports = runMigrations;