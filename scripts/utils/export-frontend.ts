import fs from "node:fs";
import path from "node:path";

type DeploymentJson = {
  chainId: number;
  network: string;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, string>;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function exportToFrontend(deployment: DeploymentJson) {
  const root = process.cwd();

  const frontendDir = path.join(root, "frontend");
  if (!fs.existsSync(frontendDir)) {
    throw new Error("frontend/ folder not found");
  }

  const frontendContractsDir = path.join(
    frontendDir,
    "src",
    "contracts"
  );

  const frontendAbiDir = path.join(frontendContractsDir, "abi");

  ensureDir(frontendAbiDir);

  // Write addresses.json
  const addressesPath = path.join(frontendContractsDir, "addresses.json");

  fs.writeFileSync(
    addressesPath,
    JSON.stringify(deployment, null, 2),
    "utf8"
  );

  // Copy ABIs
  const contractsToCopy = ["EventTicketNFT", "TicketingPlatform"] as const;

  for (const name of contractsToCopy) {
    const artifactPath = path.join(
      root,
      "artifacts",
      "contracts",
      `${name}.sol`,
      `${name}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Artifact not found: ${artifactPath}. Did you compile?`
      );
    }

    const artifact = JSON.parse(
      fs.readFileSync(artifactPath, "utf8")
    );

    const abiOutPath = path.join(
      frontendAbiDir,
      `${name}.abi.json`
    );

    fs.writeFileSync(
      abiOutPath,
      JSON.stringify(artifact.abi, null, 2),
      "utf8"
    );
  }

  console.log("\n✅ Frontend artifacts exported:");
  console.log("   frontend/src/contracts/addresses.json");
  console.log("   frontend/src/contracts/abi/*.abi.json");
}
