/**
 * Load test script to verify the API can handle heavy traffic.
 * Uses autocannon to simulate concurrent connections.
 *
 * Usage: npm run loadtest
 * Requires: Server running on localhost:3000
 */

import autocannon from "autocannon";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface TestScenario {
  name: string;
  url: string;
  method: "POST" | "GET";
  body?: string;
  connections: number;
  duration: number;
}

const scenarios: TestScenario[] = [
  {
    name: "Small payload (simple object)",
    url: `${BASE_URL}/replace`,
    method: "POST",
    body: JSON.stringify({ pet: "dog", name: "buddy" }),
    connections: 100,
    duration: 10,
  },
  {
    name: "Medium payload (nested object)",
    url: `${BASE_URL}/replace`,
    method: "POST",
    body: JSON.stringify({
      pets: Array(10).fill({ type: "dog", name: "buddy", traits: ["friendly", "dog-like"] }),
      owner: { name: "John", loves: "dog" },
    }),
    connections: 100,
    duration: 10,
  },
  {
    name: "Health check endpoint",
    url: `${BASE_URL}/health`,
    method: "GET",
    connections: 100,
    duration: 10,
  },
];

async function runScenario(scenario: TestScenario): Promise<autocannon.Result> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${scenario.name}`);
  console.log(`Connections: ${scenario.connections}, Duration: ${scenario.duration}s`);
  console.log("=".repeat(60));

  const config: autocannon.Options = {
    url: scenario.url,
    connections: scenario.connections,
    duration: scenario.duration,
    method: scenario.method,
    headers: {
      "content-type": "application/json",
    },
  };

  if (scenario.body) {
    config.body = scenario.body;
  }

  return new Promise((resolve, reject) => {
    const instance = autocannon(config, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printResults(results: { name: string; result: autocannon.Result }[]) {
  console.log("\n");
  console.log("=".repeat(70));
  console.log("LOAD TEST RESULTS SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("| Scenario | Req/sec | Latency (avg) | Latency (p99) | Errors |");
  console.log("|----------|---------|---------------|---------------|--------|");

  for (const { name, result } of results) {
    const reqPerSec = result.requests.average.toFixed(0);
    const latencyAvg = result.latency.average.toFixed(2);
    const latencyP99 = result.latency.p99.toFixed(2);
    const errors = result.errors + result.timeouts;
    console.log(
      `| ${name.slice(0, 30).padEnd(30)} | ${reqPerSec.padStart(7)} | ${(latencyAvg + "ms").padStart(13)} | ${(latencyP99 + "ms").padStart(13)} | ${String(errors).padStart(6)} |`
    );
  }

  console.log("");
  console.log("Thresholds for 'heavy traffic' requirement:");
  console.log("  ✓ Req/sec > 1000 for small payloads");
  console.log("  ✓ p99 latency < 100ms");
  console.log("  ✓ Error rate < 1%");
}

async function main() {
  console.log("Load Test - Dog-to-Cat API");
  console.log(`Target: ${BASE_URL}`);
  console.log("");

  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    console.log("✓ Server is running");
  } catch (error) {
    console.error("✗ Server is not running. Start it with: npm run dev");
    process.exit(1);
  }

  const results: { name: string; result: autocannon.Result }[] = [];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push({ name: scenario.name, result });
  }

  printResults(results);

  // Check if thresholds are met
  const smallPayloadResult = results[0].result;
  const passed =
    smallPayloadResult.requests.average > 1000 &&
    smallPayloadResult.latency.p99 < 100 &&
    smallPayloadResult.errors === 0;

  if (passed) {
    console.log("\n✓ PASSED: API can handle heavy traffic");
    process.exit(0);
  } else {
    console.log("\n✗ FAILED: Performance below thresholds");
    process.exit(1);
  }
}

main().catch(console.error);
