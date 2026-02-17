import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { exportToFrontend } from "./utils/export-frontend.js";

async function main() {
  const hre = await network.connect();
  const { ethers } = hre;

  const networkName = (hre as any).networkName ?? process.env.HARDHAT_NETWORK ?? "hardhat";

  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // Deploy NFT
  const NFT = await ethers.getContractFactory("EventTicketNFT", deployer);
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("EventTicketNFT deployed:", nftAddress);

  // Deploy Platform
  const Platform = await ethers.getContractFactory("TicketingPlatform", deployer);
  const platform = await Platform.deploy(nftAddress);
  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();
  console.log("TicketingPlatform deployed:", platformAddress);

  // Set minter
  await (await nft.setMinter(platformAddress)).wait();
  console.log("Minter set:", platformAddress);

  // Save deployment JSON
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${networkName}.json`);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const payload = {
    chainId,
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      EventTicketNFT: nftAddress,
      TicketingPlatform: platformAddress,
    },
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("Saved deployment:", outPath);

  // Export to frontend
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
