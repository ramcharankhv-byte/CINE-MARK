#!/usr/bin/env node

/**
 * CineMark Configuration Validator
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const checks = [
  {
    name: "Backend .env file",
    path: "./BACKEND/.env",
    required: true,
    check: (content) => {
      const required = ["DATABASE_URL", "GOOGLE_CLIENT_ID", "JWT_SECRET"];
      const missing = required.filter((key) => !content.includes(key));
      if (missing.length > 0) throw new Error(`Missing: ${missing.join(", ")}`);
    },
  },
  {
    name: "Frontend .env.local",
    path: "./FRONTEND/.env.local",
    required: true,
    check: (content) => {
      if (!content.includes("NEXT_PUBLIC_API_URL")) {
        throw new Error("Missing NEXT_PUBLIC_API_URL");
      }
    },
  },
];

function validate() {
  log("\n🎬 CineMark Configuration Validator\n", "yellow");

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const fullPath = path.join(__dirname, check.path);
    process.stdout.write(`✓ ${check.name}: `);

    try {
      if (!fs.existsSync(fullPath)) throw new Error("File not found");
      const content = fs.readFileSync(fullPath, "utf-8");
      if (check.check) check.check(content);
      log("✅", "green");
      passed++;
    } catch (error) {
      log(`❌ ${error.message}`, "red");
      failed++;
    }
  }

  log(
    `\nResults: ${passed} passed, ${failed} failed\n`,
    failed > 0 ? "red" : "green",
  );
  process.exit(failed > 0 ? 1 : 0);
}

validate();
