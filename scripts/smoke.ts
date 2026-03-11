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
  const DO_RESALE = process.env.DO_RESALE !== "0";

  const signers = await ethers.getSigners();
  const organizer = signers[0];

  const buyer1 = signers[1] ?? organizer;
  const buyer2 = signers[2] ?? organizer;

  const isSingleSigner = signers.length < 3;

  if (isSingleSigner) {
    console.log("Only 1 signer available on this network - Reusing deployer as buyer1/buyer2");
  }

  const platformOrg = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, organizer);
  const platformBuyer1 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer1);
  const platformBuyer2 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer2);
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  const basePrice = ethers.parseEther("0.01");
  const now = Math.floor(Date.now() / 1000);
  const dateTime = BigInt(now + 7 * 24 * 60 * 60);
  const resalePrice = ethers.parseEther("0.015");

  const createTx = await platformOrg.createEvent(
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

  const createRcpt = await createTx.wait();

  const createdLog = createRcpt!.logs.find((l: any) => l.fragment?.name === "EventCreated");
  if (!createdLog || !("args" in createdLog)) {
    throw new Error("EventCreated not found");
  }

  const eventId = (createdLog as any).args.eventId as bigint;
  console.log("Event created:", eventId.toString());

  await (await platformOrg.mintTickets(eventId, 5)).wait();
  console.log("Tickets minted");

  const buyRcpt = await (await platformBuyer1.buyPrimary(eventId, { value: basePrice })).wait();

  const purchasedLog = buyRcpt!.logs.find((l: any) => l.fragment?.name === "TicketPurchased");
  if (!purchasedLog || !("args" in purchasedLog)) {
    throw new Error("TicketPurchased not found");
  }

  const tokenId = (purchasedLog as any).args.tokenId as bigint;

  console.log("Primary purchase:", tokenId.toString(), "buyer:", buyer1.address);
  console.log("Owner after primary:", await nft.ownerOf(tokenId));

  if (DO_RESALE && !isSingleSigner) {
    await (await nft.connect(buyer1).setApprovalForAll(PLATFORM_ADDRESS, true)).wait();
    console.log("ApprovalForAll enabled (buyer1 -> platform)");

    const listRcpt = await (await platformBuyer1.listForResale(tokenId, resalePrice)).wait();

    const listedLog = listRcpt!.logs.find((l: any) => l.fragment?.name === "ListedForResale");
    if (!listedLog || !("args" in listedLog)) {
      throw new Error("ListedForResale not found");
    }

    const listingId = (listedLog as any).args.listingId as bigint;

    console.log("Listed for resale: listingId =", listingId.toString());

    await (await platformBuyer2.buyResale(listingId, { value: resalePrice })).wait();

    console.log("Resale purchased by:", buyer2.address);
    console.log("Owner after resale:", await nft.ownerOf(tokenId));
  } else {
    console.log("Skipped resale");
  }

  if (DO_CHECKIN) {
    const attendee = await nft.ownerOf(tokenId);
    await (await platformOrg.checkIn(tokenId, attendee)).wait();
    console.log("Checked in ticketUsed =", await platformOrg.ticketUsed(tokenId));
  } else {
    console.log("Skipped check-in - DO_CHECKIN=1 to enable");
  }

  console.log("full flow passed");

  const parts: string[] = ["create", "mint", "primary"];
  if (DO_RESALE && !isSingleSigner) parts.push("resale");
  else parts.push("resale (skipped)");
  if (DO_CHECKIN) parts.push("check-in");
  else parts.push("check-in (skipped)");


  console.log(parts.join(" , "));
}

main().catch((e) => {
  console.error("smoke test failed:");
  console.error(e);
  process.exitCode = 1;
});