import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  // Deploy EventTicketNFT
  const TicketNFT = await ethers.getContractFactory("EventTicketNFT");
  const ticketNFT = await TicketNFT.deploy();
  await ticketNFT.waitForDeployment();

  const nftAddress = await ticketNFT.getAddress();
  console.log("EventTicketNFT deployed:", nftAddress);

  // Deploy TicketingPlatform(nftAddress)
  const Platform = await ethers.getContractFactory("TicketingPlatform");
  const platform = await Platform.deploy(nftAddress);
  await platform.waitForDeployment();

  const platformAddress = await platform.getAddress();
  console.log("TicketingPlatform deployed:", platformAddress);

  // Set platform as MINTER
  const tx = await ticketNFT.setMinter(platformAddress);
  await tx.wait();

  console.log("Minter set:", platformAddress);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
