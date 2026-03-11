import { expect } from "chai";
import { network } from "hardhat";

describe("TicketingPlatform (MVP)", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();

    const [deployer, organizer, buyer1, buyer2, verifier] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("EventTicketNFT", deployer);
    const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Platform = await ethers.getContractFactory("TicketingPlatform", deployer);
    const platform = await Platform.deploy(await nft.getAddress());
    await platform.waitForDeployment();

    await (await nft.connect(deployer).setMinter(await platform.getAddress())).wait();
    await (await nft.connect(deployer).setMetadataProvider(await platform.getAddress())).wait();

    return { ethers, deployer, organizer, buyer1, buyer2, verifier, nft, platform };
  }

  async function createEventFixture(overrides?: Partial<{
    resaleEnabled: boolean;
    maxResalePrice: bigint;
    royaltyBps: number;
    maxSupply: number;
    basePriceEther: string;
    venueVerifier: string;
  }>) {
    const ctx = await deployFixture();
    const { ethers, platform, organizer, verifier } = ctx;

    const basePrice = ethers.parseEther(overrides?.basePriceEther ?? "0.01");
    const now = Math.floor(Date.now() / 1000);
    const dateTime = BigInt(now + 7 * 24 * 60 * 60);

    const resaleEnabled = overrides?.resaleEnabled ?? true;
    const maxResalePrice = overrides?.maxResalePrice ?? basePrice * 2n;
    const royaltyBps = overrides?.royaltyBps ?? 500;
    const maxSupply = overrides?.maxSupply ?? 5;
    const venueVerifier = overrides?.venueVerifier ?? verifier.address;

    await (await platform.connect(organizer).createEvent(
      "Dubai Concert",
      "Coca-Cola Arena",
      dateTime,
      basePrice,
      maxSupply,
      resaleEnabled,
      maxResalePrice,
      royaltyBps,
      venueVerifier
    )).wait();

    const eventId = 1n;
    return { ...ctx, eventId, basePrice, maxSupply, resaleEnabled, maxResalePrice, royaltyBps, venueVerifier };
  }

  it("createEvent rejects empty name/venue", async function () {
    const { ethers, platform, organizer, verifier } = await deployFixture();

    const now = Math.floor(Date.now() / 1000);
    const dateTime = BigInt(now + 1000);
    const basePrice = ethers.parseEther("0.01");

    await expect(
      platform.connect(organizer).createEvent(
        "",
        "Venue",
        dateTime,
        basePrice,
        5,
        true,
        basePrice * 2n,
        500,
        verifier.address
      )
    ).to.be.revertedWithCustomError(platform, "EmptyName");

    await expect(
      platform.connect(organizer).createEvent(
        "Name",
        "",
        dateTime,
        basePrice,
        5,
        true,
        basePrice * 2n,
        500,
        verifier.address
      )
    ).to.be.revertedWithCustomError(platform, "EmptyVenue");
  });

  it("mintTickets cannot be more than maxSupply", async function () {
    const { platform, organizer, eventId } = await createEventFixture({ maxSupply: 2 });

    await (await platform.connect(organizer).mintTickets(eventId, 2)).wait();

    await expect(platform.connect(organizer).mintTickets(eventId, 1))
      .to.be.revertedWithCustomError(platform, "SupplyExceeded");
  });

  it("buyPrimary transfers NFT to buyer and funds to organiser", async function () {
    const { ethers, platform, nft, organizer, buyer1, eventId, basePrice } =
      await createEventFixture({ maxSupply: 1 });

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();

    const orgBalBefore = await ethers.provider.getBalance(organizer.address);

    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const tokenId = 1n;
    expect(await nft.ownerOf(tokenId)).to.equal(buyer1.address);

    const orgBalAfter = await ethers.provider.getBalance(organizer.address);
    expect(orgBalAfter - orgBalBefore).to.equal(basePrice);
  });

  it("listForResale requires owner + approval", async function () {
    const { ethers, platform, nft, organizer, buyer1, eventId, basePrice } =
      await createEventFixture({ maxSupply: 1 });

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();
    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const tokenId = 1n;
    const resalePrice = basePrice + ethers.parseEther("0.001");

    await expect(platform.connect(buyer1).listForResale(tokenId, resalePrice))
      .to.be.revertedWithCustomError(platform, "NotApproved");

    await (await nft.connect(buyer1).approve(await platform.getAddress(), tokenId)).wait();
    await (await platform.connect(buyer1).listForResale(tokenId, resalePrice)).wait();

    const listing = await platform.listingsById(1n);
    expect(listing.active).to.equal(true);
    expect(listing.seller).to.equal(buyer1.address);
    expect(listing.tokenId).to.equal(tokenId);
  });

  it("listForResale - maxResalePrice", async function () {
    const { platform, nft, organizer, buyer1, eventId, basePrice } =
      await createEventFixture({
        maxSupply: 1,
        basePriceEther: "0.01",
      });

    await (await platform.connect(organizer).setResaleRules(eventId, true, basePrice, 500)).wait();

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();
    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const tokenId = 1n;
    await (await nft.connect(buyer1).approve(await platform.getAddress(), tokenId)).wait();

    await expect(platform.connect(buyer1).listForResale(tokenId, basePrice + 1n))
      .to.be.revertedWithCustomError(platform, "PriceTooHigh");

    await (await platform.connect(buyer1).listForResale(tokenId, basePrice)).wait();
  });

  it("buyResale transfers NFT, pays royalty, ticket becomes inactive", async function () {
    const { ethers, platform, nft, organizer, buyer1, buyer2, eventId, basePrice } =
      await createEventFixture({
        maxSupply: 1,
        royaltyBps: 500,
      });

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();
    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const tokenId = 1n;
    const resalePrice = basePrice + ethers.parseEther("0.005");

    await (await nft.connect(buyer1).approve(await platform.getAddress(), tokenId)).wait();
    await (await platform.connect(buyer1).listForResale(tokenId, resalePrice)).wait();

    const sellerBalBefore = await ethers.provider.getBalance(buyer1.address);
    const orgBalBefore = await ethers.provider.getBalance(organizer.address);

    await (await platform.connect(buyer2).buyResale(1n, { value: resalePrice })).wait();

    expect(await nft.ownerOf(tokenId)).to.equal(buyer2.address);

    const listing = await platform.listingsById(1n);
    expect(listing.active).to.equal(false);

    const royalty = (resalePrice * 500n) / 10_000n;
    const sellerAmount = resalePrice - royalty;

    const sellerBalAfter = await ethers.provider.getBalance(buyer1.address);
    const orgBalAfter = await ethers.provider.getBalance(organizer.address);

    expect(sellerBalAfter - sellerBalBefore).to.equal(sellerAmount);
    expect(orgBalAfter - orgBalBefore).to.equal(royalty);
  });

  it("checkIn only verifier, cannot check-in twice, cannot sell after use", async function () {
    const { platform, nft, organizer, buyer1, verifier, eventId, basePrice } =
      await createEventFixture({
        maxSupply: 1,
      });

    await (await platform.connect(organizer).setResaleRules(eventId, true, basePrice * 2n, 500)).wait();

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();
    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const tokenId = 1n;

    await expect(platform.connect(buyer1).checkIn(tokenId, buyer1.address))
      .to.be.revertedWithCustomError(platform, "NotVenueVerifier");

    await (await platform.connect(verifier).checkIn(tokenId, buyer1.address)).wait();
    expect(await platform.ticketUsed(tokenId)).to.equal(true);

    await expect(platform.connect(verifier).checkIn(tokenId, buyer1.address))
      .to.be.revertedWithCustomError(platform, "TicketAlreadyUsed");

    await (await nft.connect(buyer1).approve(await platform.getAddress(), tokenId)).wait();
    await expect(platform.connect(buyer1).listForResale(tokenId, basePrice))
      .to.be.revertedWithCustomError(platform, "TicketAlreadyUsed");
  });

  it("tokenURI returns on-chain metadata json", async function () {
    const { platform, nft, organizer, buyer1, eventId, basePrice } =
      await createEventFixture({ maxSupply: 1 });

    await (await platform.connect(organizer).mintTickets(eventId, 1)).wait();
    await (await platform.connect(buyer1).buyPrimary(eventId, { value: basePrice })).wait();

    const uri = await nft.tokenURI(1n);

    expect(uri.startsWith("data:application/json;base64,")).to.equal(true);
  });
});