import { network } from "hardhat";

const NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PLATFORM_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

async function main() {
  const { ethers } = await network.connect();

  const [organizer, buyer1, buyer2] = await ethers.getSigners();

  const platformAsOrg = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, organizer);
  const platformAsBuyer1 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer1);
  const platformAsBuyer2 = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer2);
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  // create event
  const basePrice = ethers.parseEther("0.01");
  const now = Math.floor(Date.now() / 1000);
  const dateTime = BigInt(now + 7 * 24 * 60 * 60);

  const startBlock1 = await ethers.provider.getBlockNumber();
  const createTx = await platformAsOrg.createEvent(
    "Dubai Concert",
    "Coca-Cola Arena",
    dateTime,
    basePrice,
    10,             // maxSupply
    true,           // resaleEnabled
    basePrice * 2n, // maxResalePrice
    500,            // royaltyBps = 5%
    organizer.address
  );
  const createRcpt = await createTx.wait();
  const endBlock1 = createRcpt!.blockNumber;

  const createdEvents = await platformAsOrg.queryFilter(
    platformAsOrg.filters.EventCreated(),
    startBlock1,
    endBlock1
  );
  const eventId = createdEvents[0].args.eventId as bigint;
  console.log("Event created, eventId:", eventId.toString());

  // mint tickets
  const mintTx = await platformAsOrg.mintTickets(eventId, 5);
  await mintTx.wait();
  console.log("Tickets minted.");

  // buyer1 buys primary
  const startBlock2 = await ethers.provider.getBlockNumber();
  const buyPrimaryTx = await platformAsBuyer1.buyPrimary(eventId, { value: basePrice });
  const buyPrimaryRcpt = await buyPrimaryTx.wait();
  const endBlock2 = buyPrimaryRcpt!.blockNumber;

  const purchasedPrimaryEvents = await platformAsBuyer1.queryFilter(
    platformAsBuyer1.filters.TicketPurchased(),
    startBlock2,
    endBlock2
  );

  const tokenId = purchasedPrimaryEvents[purchasedPrimaryEvents.length - 1].args.tokenId as bigint;
  console.log("Primary purchased. tokenId:", tokenId.toString(), "buyer1:", buyer1.address);

  const owner1 = await nft.ownerOf(tokenId);
  console.log("ownerOf(tokenId) after primary:", owner1);

  // buyer1 approves platform
const approveTx = await nft.connect(buyer1).setApprovalForAll(PLATFORM_ADDRESS, true);
await approveTx.wait();
console.log("ApprovedForAll set for buyer1 -> platform");
  console.log("Approved platform for tokenId:", tokenId.toString());

  // buyer1 lists for resale
  const resalePrice = ethers.parseEther("0.015");
  // debug
  const ev = await platformAsBuyer1.eventsById(eventId);
  console.log("event.resaleEnabled:", ev.resaleEnabled);
  console.log("event.maxResalePrice:", ev.maxResalePrice.toString());
  console.log("event.royaltyBps:", ev.royaltyBps);

  const usedBefore = await platformAsBuyer1.ticketUsed(tokenId);
  console.log("ticketUsed before list:", usedBefore);

  const ownerBeforeList = await nft.ownerOf(tokenId);
  console.log("ownerOf before list:", ownerBeforeList);

  const approvedAddr = await nft.getApproved(tokenId);
  console.log("getApproved(tokenId):", approvedAddr);

  const approvedForAll = await nft.isApprovedForAll(buyer1.address, PLATFORM_ADDRESS);
  console.log("isApprovedForAll(buyer1, platform):", approvedForAll);

  // show actual revert reason (raw eth_call + decode)
  const data = platformAsBuyer1.interface.encodeFunctionData("listForResale", [tokenId, resalePrice]);

  try {
    await ethers.provider.call({
      to: PLATFORM_ADDRESS,
      from: buyer1.address,
      data,
    });
    console.log("raw call listForResale: OK");
  } catch (err: any) {
    console.log("raw call listForResale FAILED (decoding):");

    const revertData =
      err?.data ??
      err?.error?.data ??
      err?.info?.error?.data ??
      err?.cause?.data;

    console.log("revertData:", revertData);

    if (revertData) {
      try {
        const decoded = platformAsBuyer1.interface.parseError(revertData);
        console.log("decoded error:", decoded?.name, decoded?.args ?? "");
      } catch (e) {
        console.log("could not decode revertData with ABI");
      }
    } else {
      console.log(err?.shortMessage ?? err?.message ?? err);
    }
  }

let listRcpt;
try {
const listTx = await platformAsBuyer1.listForResale(tokenId, resalePrice, {
  gasLimit: 1_500_000n,
});
  listRcpt = await listTx.wait();
  console.log("Listed successfully.");
} catch (err: any) {
  console.log("listForResale TX FAILED:");
  console.log(err?.shortMessage ?? err?.message ?? err);
  return;
}

  const currentBlock = listRcpt!.blockNumber;
  const listedEvents = await platformAsBuyer1.queryFilter(
    platformAsBuyer1.filters.ListedForResale(),
    currentBlock,
    currentBlock
  );

  const listingId = listedEvents[listedEvents.length - 1].args.listingId as bigint;
  console.log("Listed for resale. listingId:", listingId.toString(), "price:", resalePrice.toString());

  // buyer2 buys resale
const buyResaleTx = await platformAsBuyer2.buyResale(listingId, {
  value: resalePrice,
  gasLimit: 2_000_000n,
});
  await buyResaleTx.wait();
  console.log("Resale purchased. buyer2:", buyer2.address);

  const owner2 = await nft.ownerOf(tokenId);
  console.log("ownerOf(tokenId) after resale:", owner2);

  // venue check-in (organizer is verifier)
  const checkInTx = await platformAsOrg.checkIn(tokenId, buyer2.address);
  await checkInTx.wait();
  console.log("Checked in tokenId:", tokenId.toString());

  const used = await platformAsOrg.ticketUsed(tokenId);
  console.log("ticketUsed(tokenId):", used);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});