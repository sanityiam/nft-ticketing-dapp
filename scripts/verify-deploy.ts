import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const nft = d.contracts.EventTicketNFT;
  const platform = d.contracts.TicketingPlatform;

  const nftCode = await ethers.provider.getCode(nft);
  const platformCode = await ethers.provider.getCode(platform);

  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("NFT:", nft, "code bytes:", nftCode.length);
  console.log("Platform:", platform, "code bytes:", platformCode.length);

  if (nftCode === "0x") throw new Error("not deployed - nft issue");
  if (platformCode === "0x") throw new Error("not deployed - platform issue");

  console.log("we are officially live 🚀");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});