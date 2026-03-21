/**
 * ROLLOUT Bug Scanner
 * Runs every 12 hours via cron job
 * Scans GitHub repo, sends code to Claude API for analysis,
 * outputs a bug report for team review
 *
 * Setup:
 *   npm install node-fetch @octokit/rest
 *   node rollout-bug-scanner.js
 *
 * Cron (every 12 hours):
 *   0 */12 * * * /usr/bin/node /path/to/rollout-bug-scanner.js >> /var/log/rollout-scanner.log 2>&1
 */

import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// CONFIG
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const REPO_OWNER = "rollout-cc";
const REPO_NAME = "rollout-xyz-mobile-app";
const DEBUG_API_KEY = process.env.DEBUG_API_KEY || "RolloutDebug2026!xK9#mP";
const DEBUG_API_ENDPOINT = "https://ctnsworqzzguykzzvdme.supabase.co/functions/v1/debug-api";
const REPORT_OUTPUT = `./bug-report-${new Date().toISOString().split("T")[0]}.json`;

const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const SKIP_PATHS = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getRepoFiles(owner, repo, dirPath = "") {
  const { data } = await octokit.repos.getContent({ owner, repo, path: dirPath });
  let files = [];
  for (const item of data) {
    if (SKIP_PATHS.some((skip) => item.path.includes(skip))) continue;
    if (item.type === "file" && SCAN_EXTENSIONS.includes(path.extname(item.name))) {
      files.push(item);
    } else if (item.type === "dir") {
      const subFiles = await getRepoFiles(owner, repo, item.path);
      files = files.concat(subFiles);
    }
  }
  return files;
}

async function getFileContent(owner, repo, filePath) {
  const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function scanFileForBugs(filePath, content) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a senior engineer reviewing a React/TypeScript codebase called ROLLOUT (a music industry OS).

Scan this file for bugs only. Do NOT suggest style improvements or refactors. Only flag actual bugs:
- Runtime errors
- Logic errors
- Null/undefined access
- Missing error handling
- Race conditions
- Memory leaks
- Broken async/await patterns
- Type mismatches that would cause failures

File: ${filePath}

\`\`\`
${content.slice(0, 4000)}
\`\`\`

Respond ONLY in this JSON format, no preamble:
{
  "bugs": [
    {
      "severity": "high|medium|low",
      "line": <approximate line number or null>,
      "description": "<what the bug is>",
      "fix": "<suggested fix in plain English>"
    }
  ]
}

If no bugs found, return: { "bugs": [] }`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((i) => i.text || "").join("") || "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { bugs: [] };
  }
}

async function runScan() {
  console.log(`\n[${new Date().toISOString()}] ROLLOUT Bug Scanner starting...`);
  const files = await getRepoFiles(REPO_OWNER, REPO_NAME);
  console.log(`Found ${files.length} files to scan.`);

  const report = {
    scannedAt: new Date().toISOString(),
    repo: `${REPO_OWNER}/${REPO_NAME}`,
    totalFiles: files.length,
    totalBugs: 0,
    high: 0, medium: 0, low: 0,
    findings: [],
  };

  for (const file of files) {
    console.log(`Scanning: ${file.path}`);
    const content = await getFileContent(REPO_OWNER, REPO_NAME, file.path);
    const result = await scanFileForBugs(file.path, content);

    if (result.bugs && result.bugs.length > 0) {
      report.findings.push({ file: file.path, bugs: result.bugs });
      result.bugs.forEach((bug) => {
        report.totalBugs++;
        if (bug.severity === "high") report.high++;
        else if (bug.severity === "medium") report.medium++;
        else report.low++;
      });
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync(REPORT_OUTPUT, JSON.stringify(report, null, 2));
  console.log(`\nScan complete. ${report.totalBugs} bugs found (${report.high} high, ${report.medium} medium, ${report.low} low).`);
  console.log(`Report saved to: ${REPORT_OUTPUT}`);
  return report;
}

runScan().catch(console.error);
