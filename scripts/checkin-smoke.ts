import { network } from "hardhat";

const NFT_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const PLATFORM_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

async function main() {
  const { ethers } = await network.connect();

  const [organizer, buyer] = await ethers.getSigners();

  const platform = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS);
  const platformAsVerifier = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, organizer);
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  // find latest purchased ticket
  const currentBlock = await ethers.provider.getBlockNumber();
  const purchasedEvents = await platform.queryFilter(platform.filters.TicketPurchased(), 0, currentBlock);

  if (purchasedEvents.length === 0) {
    throw new Error("No purchased tickets found. Run smoke.ts first.");
  }

  let tokenId: bigint | null = null;
  let attendee: string | null = null;

  // find most recent purchased ticket that is not used yet
  for (let i = purchasedEvents.length - 1; i >= 0; i--) {
    const t = purchasedEvents[i].args.tokenId as bigint;
    const isUsed = await platform.ticketUsed(t);
    if (!isUsed) {
      tokenId = t;
      attendee = purchasedEvents[i].args.buyer as string;
      break;
    }
  }

  if (tokenId === null || attendee === null) {
    throw new Error("No unused purchased tickets found. Run smoke.ts again to buy a new ticket.");
  }



  console.log("Latest purchased tokenId:", tokenId.toString());
  console.log("Attendee:", attendee);

  // debug why checkIn might revert
  const eventId = await platform.ticketEventId(tokenId);
  console.log("ticketEventId:", eventId.toString());

  const e = await platform.eventsById(eventId);
  console.log("event.venueVerifier:", e.venueVerifier);
  console.log("verifier signer:", organizer.address);

  const used = await platform.ticketUsed(tokenId);
  console.log("ticketUsed:", used);

  const owner = await nft.ownerOf(tokenId);
  console.log("ownerOf(tokenId):", owner);

  // attempt check-in
  try {
    const tx = await platformAsVerifier.checkIn(tokenId, attendee);
    await tx.wait();
    console.log("✅ Checked in tokenId:", tokenId.toString());

    const usedAfter = await platform.ticketUsed(tokenId);
    console.log("ticketUsed(tokenId):", usedAfter);
  } catch (err: any) {
    console.log("❌ Check-in failed:");
    console.log(err?.shortMessage ?? err?.message ?? err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
