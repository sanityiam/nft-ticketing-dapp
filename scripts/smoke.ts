import { network } from "hardhat";

const NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PLATFORM_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

async function main() {
  const { ethers } = await network.connect();

  const [organizer, buyer] = await ethers.getSigners();

  const platform = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, organizer);
  const platformAsBuyer = await ethers.getContractAt("TicketingPlatform", PLATFORM_ADDRESS, buyer);
  const nft = await ethers.getContractAt("EventTicketNFT", NFT_ADDRESS);

  // create event
  const basePrice = ethers.parseEther("0.01"); // 0.01 ETH
  const now = Math.floor(Date.now() / 1000);
  const dateTime = BigInt(now + 7 * 24 * 60 * 60); // +7 days

  const startBlock1 = await ethers.provider.getBlockNumber();
  const createTx = await platform.createEvent(
    "Dubai Concert",
    "Coca-Cola Arena",
    dateTime,
    basePrice,
    3,              // maxSupply
    true,           // resaleEnabled
    basePrice * 2n, // maxResalePrice
    500,            // royaltyBps = 5%
    organizer.address
  );

  const createRcpt = await createTx.wait();
  const endBlock1 = createRcpt!.blockNumber;

  const createdEvents = await platform.queryFilter(
    platform.filters.EventCreated(),
    startBlock1,
    endBlock1
  );

  const eventId = createdEvents[0].args.eventId as bigint;
  console.log("Event created, eventId:", eventId.toString());

  // mint tickets (organizer)
  const mintTx = await platform.mintTickets(eventId, 3);
  await mintTx.wait();
  console.log("Tickets minted.");

  // buy primary (buyer)
  const startBlock2 = await ethers.provider.getBlockNumber();
  const buyTx = await platformAsBuyer.buyPrimary(eventId, { value: basePrice });
  const buyRcpt = await buyTx.wait();
  const endBlock2 = buyRcpt!.blockNumber;

  const purchasedEvents = await platformAsBuyer.queryFilter(
    platformAsBuyer.filters.TicketPurchased(),
    startBlock2,
    endBlock2
  );

  const tokenId = purchasedEvents[purchasedEvents.length - 1].args.tokenId as bigint;
  console.log("Ticket purchased. tokenId:", tokenId.toString(), "buyer:", buyer.address);

  // verify NFT ownership
  const owner = await nft.ownerOf(tokenId);
  console.log("NFT ownerOf(tokenId):", owner);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});