import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { exportToFrontend } from "./utils/export-frontend.js";

function chainIdToName(chainId: number) {
  if (chainId === 31337) return "localhost";
  if (chainId === 11155111) return "sepolia";
  return `chain-${chainId}`;
}

type DeploymentJson = {
  chainId: number;
  network: string;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, string>;
};

async function main() {
  const hre = await network.connect();
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);

const deploymentName =
  process.env.DEPLOYMENT_NAME?.trim() ||
  process.env.HARDHAT_NETWORK?.trim() ||
  chainIdToName(chainId);

  // deploy nft
  const NFT = await ethers.getContractFactory("EventTicketNFT", deployer);
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("EventTicketNFT deployed:", nftAddress);

  // deploy platform
  const Platform = await ethers.getContractFactory("TicketingPlatform", deployer);
  const platform = await Platform.deploy(nftAddress);
  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();
  console.log("TicketingPlatform deployed:", platformAddress);

  // set minter
  await (await nft.setMinter(platformAddress)).wait();
  console.log("Minter set:", platformAddress);

  const baseURI = process.env.BASE_URI ?? "";
  if (baseURI) {
    await (await nft.setBaseURI(baseURI)).wait();
    console.log("BaseURI set:", baseURI);
  } else {
    console.log("BaseURI not set (BASE_URI env var is empty).");
  }

  // save deployment json
  const outDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${deploymentName}.json`);


  const payload: DeploymentJson = {
    chainId,
    network: deploymentName,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      EventTicketNFT: nftAddress,
      TicketingPlatform: platformAddress,
    },
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("Saved deployment:", outPath);

  // export to frontend
  try {
    exportToFrontend(payload);
  } catch (e: any) {
    console.log("Frontend export skipped:", e?.message ?? e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});