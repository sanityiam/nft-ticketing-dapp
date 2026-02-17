import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const NFT_ADDRESS = d.contracts.EventTicketNFT;
  const PLATFORM_ADDRESS = d.contracts.TicketingPlatform;

  const [verifierSigner] = await ethers.getSigners();

  const platform = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS);
  const platformAsVerifier = await ethers.getContractAt(
    "TicketingPlatform",
    PLATFORM_ADDRESS,
    verifierSigner
  );
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  console.log("Check-in smoke started");
  console.log("NFT:", NFT_ADDRESS);
  console.log("Platform:", PLATFORM_ADDRESS);

  // find newest unused ticket
  const nextTokenId = await platform.nextTokenId(); // public in contract
  if (nextTokenId <= 1n) {
    throw new Error("No minted tokens exist yet. Run smoke.ts first.");
  }

  const LOOKBACK = 50n; // scan last 50 token ids
  const start = nextTokenId > LOOKBACK ? nextTokenId - LOOKBACK : 1n;

  let tokenId: bigint | null = null;
  let attendee: string | null = null;

  for (let t = nextTokenId - 1n; t >= start; t--) {
    const eventId = await platform.ticketEventId(t);
    if (eventId === 0n) continue; // token never existed

    const used = await platform.ticketUsed(t);
    if (used) continue;

    tokenId = t;
    attendee = await nft.ownerOf(t);
    break;
  }

  if (!tokenId || !attendee) {
    throw new Error("No unused tickets found. Run smoke.ts again (without check-in) to mint/buy a fresh ticket.");
  }

  console.log("Selected tokenId:", tokenId.toString());
  console.log("Attendee (ownerOf):", attendee);

  // debug
  const eventId = await platform.ticketEventId(tokenId);
  const eventData = await platform.eventsById(eventId);

  console.log("EventId:", eventId.toString());
  console.log("event.venueVerifier:", eventData.venueVerifier);
  console.log("verifier signer:", verifierSigner.address);

  if (eventData.venueVerifier.toLowerCase() !== verifierSigner.address.toLowerCase()) {
    throw new Error("Connected signer is NOT the venue verifier for this event. Switch signer / redeploy.");
  }

  // check-in
  const tx = await platformAsVerifier.checkIn(tokenId, attendee);
  await tx.wait();

  console.log("Checked in tokenId:", tokenId.toString());
  console.log("ticketUsed(tokenId):", await platform.ticketUsed(tokenId));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});