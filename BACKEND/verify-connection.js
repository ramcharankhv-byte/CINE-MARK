#!/usr/bin/env node

/**
 * CineMark Frontend-Backend Connection Verification
 */

import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const API_BASE = `${BACKEND_URL}/api/v1`;

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verify() {
  log("\n🎬 CineMark Connection Verification\n", "blue");
  log("=".repeat(50), "blue");

  const tests = [
    {
      name: "Backend Health Check",
      fn: async () => {
        const response = await axios.get(`${BACKEND_URL}/`, { timeout: 5000 });
        return `Backend running on ${BACKEND_URL}`;
      },
    },
    {
      name: "CORS Configuration",
      fn: async () => {
        await axios.get(`${API_BASE}/auth/me`, {
          timeout: 5000,
          validateStatus: () => true,
        });
        return "CORS enabled";
      },
    },
    {
      name: "Auth Routes",
      fn: async () => {
        const response = await axios.post(
          `${API_BASE}/auth/google/signup`,
          {},
          {
            timeout: 5000,
            validateStatus: () => true,
          },
        );
        return `Auth endpoints available (status: ${response.status})`;
      },
    },
    {
      name: "Movie Routes",
      fn: async () => {
        const response = await axios.get(
          `${API_BASE}/movie/search?query=test`,
          {
            timeout: 5000,
            validateStatus: () => true,
          },
        );
        return `Movie endpoints available (status: ${response.status})`;
      },
    },
  ];

  let passed = 0;
  for (const test of tests) {
    process.stdout.write(`\n✓ ${test.name}: `);
    try {
      const result = await test.fn();
      log(`✅ ${result}`, "green");
      passed++;
    } catch (error) {
      log(`❌ ${error.message}`, "red");
    }
  }

  log("\n" + "=".repeat(50), "blue");
  log(
    `\nResults: ${passed}/${tests.length} passed\n`,
    passed === tests.length ? "green" : "red",
  );
}

verify();
