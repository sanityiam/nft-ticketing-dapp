import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const NFT_ADDRESS = d.contracts.EventTicketNFT;
  const PLATFORM_ADDRESS = d.contracts.TicketingPlatform;

  console.log("Smoke test started");
  console.log("NFT:", NFT_ADDRESS);
  console.log("Platform:", PLATFORM_ADDRESS);

  const DO_CHECKIN = process.env.DO_CHECKIN === "1";

  const [organizer, buyer1, buyer2] = await ethers.getSigners();

  const platformOrg = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, organizer);
  const platformBuyer1 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer1);
  const platformBuyer2 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer2);
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  const basePrice = ethers.parseEther("0.01");
  const now = Math.floor(Date.now() / 1000);
  const dateTime = BigInt(now + 7 * 24 * 60 * 60);
  const resalePrice = ethers.parseEther("0.015");

  // create event (get eventId deterministically)
  const eventId = await platformOrg.createEvent.staticCall(
    "Dubai Concert",
    "Coca-Cola Arena",
    dateTime,
    basePrice,
    10,
    true,
    basePrice * 2n,
    500,
    organizer.address
  );
  await (await platformOrg.createEvent(
    "Dubai Concert",
    "Coca-Cola Arena",
    dateTime,
    basePrice,
    10,
    true,
    basePrice * 2n,
    500,
    organizer.address
  )).wait();

  console.log("Event created:", eventId.toString());

  // mint
  await (await platformOrg.mintTickets(eventId, 5)).wait();
  console.log("Tickets minted");

  // primary purchase (get tokenId deterministically)
  const tokenId = await platformBuyer1.buyPrimary.staticCall(eventId, { value: basePrice });
  await (await platformBuyer1.buyPrimary(eventId, { value: basePrice })).wait();

  console.log("Primary purchase:", tokenId.toString(), "buyer:", buyer1.address);
  console.log("Owner after primary:", await nft.ownerOf(tokenId));

  // approve
  await (await nft.connect(buyer1).setApprovalForAll(PLATFORM_ADDRESS, true)).wait();
  console.log("ApprovalForAll enabled (buyer1 -> platform)");

  // list for resale (get listingId deterministically)
  const listingId = await platformBuyer1.listForResale.staticCall(tokenId, resalePrice);
  await (await platformBuyer1.listForResale(tokenId, resalePrice)).wait();

  console.log("Listed for resale: listingId =", listingId.toString());

  // buy resale
  await (await platformBuyer2.buyResale(listingId, { value: resalePrice })).wait();

  console.log("Resale purchased by:", buyer2.address);
  console.log("Owner after resale:", await nft.ownerOf(tokenId));

  // check-in
if (DO_CHECKIN) {
  await (await platformOrg.checkIn(tokenId, buyer2.address)).wait();
  console.log("Checked in. ticketUsed =", await platformOrg.ticketUsed(tokenId));
} else {
  console.log("Skipped check-in (set DO_CHECKIN=1 to enable).");
}

console.log("\nFULL FLOW PASSED");
console.log(DO_CHECKIN
  ? "create -> mint -> primary -> resale -> check-in"
  : "create -> mint -> primary -> resale (check-in skipped)"
);
}

main().catch((e) => {
  console.error("Smoke test failed:");
  console.error(e);
  process.exitCode = 1;
});