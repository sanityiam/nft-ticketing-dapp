import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const nft = await ethers.getContractAt(
    "EventTicketNFT",
    d.contracts.EventTicketNFT
  );

  const tokenId = BigInt(process.env.TOKEN_ID ?? "5");
  const uri = await nft.tokenURI(tokenId);

  console.log("tokenURI:", uri);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});