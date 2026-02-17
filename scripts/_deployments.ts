import fs from "node:fs";
import path from "node:path";

export type Deployments = {
  chainId: number;
  network: string;
  deployedAt: string;
  deployer: string;
  contracts: {
    EventTicketNFT: string;
    TicketingPlatform: string;
  };
};

function detectNetworkName(): string {
  // 1) If Hardhat set it, use it.
  if (process.env.HARDHAT_NETWORK) return process.env.HARDHAT_NETWORK;

  // 2) Otherwise, parse CLI args: --network localhost  OR  --network=localhost
  const argv = process.argv;
  const i = argv.findIndex((a) => a === "--network");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];

  const eq = argv.find((a) => a.startsWith("--network="));
  if (eq) return eq.split("=")[1] ?? "hardhat";

  // 3) Default
  return "hardhat";
}

export function loadDeployments(): Deployments {
  const networkName = detectNetworkName();
  const file = path.join(process.cwd(), "deployments", `${networkName}.json`);

  if (!fs.existsSync(file)) {
    throw new Error(
      `Deployment file missing: ${file}\n` +
        `Run:\n` +
        `npx hardhat run scripts/deploy.ts --network ${networkName}`
    );
  }

  const d = JSON.parse(fs.readFileSync(file, "utf8")) as Deployments;

  // Helpful debug:
  // eslint-disable-next-line no-console
  console.log(`Loaded deployments from: deployments/${networkName}.json`);

  return d;
}