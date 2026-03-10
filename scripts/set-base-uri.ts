import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const baseUriRaw = process.env.BASE_URI?.trim() ?? "";
  if (!baseUriRaw) {
    throw new Error("BASE_URI is empty in .env");
  }

  const baseUri = baseUriRaw.endsWith("/") ? baseUriRaw : `${baseUriRaw}/`;

  const [admin] = await ethers.getSigners();

  const nft = await ethers.getContractAt(
    "EventTicketNFT",
    d.contracts.EventTicketNFT,
    admin
  );

  const tx = await nft.setBaseURI(baseUri);
  await tx.wait();

  console.log("BaseURI updated:", baseUri);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});