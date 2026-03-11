import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function runStep(label: string, command: string) {
  console.log(`\n${label}`);
  try {
    execSync(command, { stdio: "inherit" });
    console.log(`${label} completed`);
  } catch {
    console.log(`${label} failed`);
    process.exit(1);
  }
}

function detectNetwork(): string {
  return (process.env.NETWORK ?? process.env.HARDHAT_NETWORK ?? "localhost").trim();
}

function printDeploymentInfo(networkName: string) {
  const deploymentPath = path.join(process.cwd(), "deployments", `${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.log("Deployment file not found yet - it will be created after the deployment");
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\nDeployment info:");
  console.log(`Network: ${deployment.network}`);
  console.log(`ChainId: ${deployment.chainId}`);
  console.log(`Deployment file: deployments/${networkName}.json`);
}

async function main() {
  const start = Date.now();

  const networkName = detectNetwork();

  console.log("nft-ticketing-dapp demo\n");
  console.log(`Target network: ${networkName}`);

  runStep(
    "Deploy contracts",
    `DEPLOYMENT_NAME=${networkName} npx hardhat run scripts/deploy.ts --network ${networkName}`
  );

  printDeploymentInfo(networkName);

  runStep(
    "Smoke test (without check-in)",
    `DEPLOYMENT_NAME=${networkName} DO_CHECKIN=0 npx hardhat run scripts/smoke.ts --network ${networkName}`
  );

  runStep(
    "Check-in validation",
    `DEPLOYMENT_NAME=${networkName} npx hardhat run scripts/checkin-smoke.ts --network ${networkName}`
  );

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\nDemo completed successfully");
  console.log(`Total time: ${duration}s\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});