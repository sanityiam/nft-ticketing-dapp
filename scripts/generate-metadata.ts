import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function toIsoFromUnix(ts: bigint) {
  return new Date(Number(ts) * 1000).toISOString();
}

function makeSvg(
  tokenId: bigint,
  eventName: string,
  venue: string,
  dateIso: string
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="700" rx="36" fill="#0d1321"/>
  <rect x="40" y="40" width="1120" height="620" rx="28" fill="#1d2d44"/>
  <rect x="70" y="70" width="1060" height="560" rx="24" fill="#111827"/>
  <text x="100" y="160" fill="#ffffff" font-size="54" font-family="Arial, sans-serif" font-weight="700">${eventName}</text>
  <text x="100" y="220" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">${venue}</text>
  <text x="100" y="270" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">${dateIso}</text>

  <line x1="760" y1="90" x2="760" y2="610" stroke="#334155" stroke-width="3" stroke-dasharray="14 10"/>

  <text x="100" y="390" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">Token ID</text>
  <text x="100" y="455" fill="#ffffff" font-size="64" font-family="Arial, sans-serif" font-weight="700">#${tokenId.toString()}</text>

  <text x="100" y="560" fill="#64748b" font-size="20" font-family="Arial, sans-serif">Verified on-chain • resale rules enforced • check-in tracked</text>

  <text x="810" y="210" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif">Type</text>
  <text x="810" y="250" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">Event Ticket</text>

  <text x="810" y="340" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif">Collection</text>
  <text x="810" y="380" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">ETIX</text>

  <text x="810" y="500" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif">Network</text>
  <text x="810" y="540" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">Ethereum Sepolia</text>
</svg>`;
}

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const platform = await ethers.getContractAt(
    "TicketingPlatform",
    d.contracts.TicketingPlatform
  );
  const nft = await ethers.getContractAt(
    "EventTicketNFT",
    d.contracts.EventTicketNFT
  );

  const baseUriRaw = process.env.BASE_URI?.trim() ?? "";
  const baseUri = baseUriRaw === ""
    ? ""
    : baseUriRaw.endsWith("/")
      ? baseUriRaw
      : `${baseUriRaw}/`;

  const outDir = path.join(process.cwd(), "docs", "metadata");
  ensureDir(outDir);

  const nextTokenId = await platform.nextTokenId();
  const start = 1n;
  const end = nextTokenId - 1n;

  if (end < start) {
    console.log("No minted tokens found.");
    return;
  }

  console.log(`Generating metadata for tokenIds ${start.toString()}..${end.toString()}`);

  for (let tokenId = start; tokenId <= end; tokenId++) {
    const eventId = await platform.ticketEventId(tokenId);
    if (eventId === 0n) continue;

    let owner: string;
    try {
      owner = await nft.ownerOf(tokenId);
    } catch {
      continue;
    }

    const used = await platform.ticketUsed(tokenId);
    const e = await platform.eventsById(eventId);

    const dateIso = toIsoFromUnix(e.dateTime);
    const imageUrl = baseUri ? `${baseUri}${tokenId.toString()}.svg` : `${tokenId.toString()}.svg`;

    const metadata = {
      name: `${e.name} Ticket #${tokenId.toString()}`,
      description: `NFT ticket for ${e.name} at ${e.venue}. Ownership is verified on-chain. Resale rules and used status are enforced by the TicketingPlatform smart contract.`,
      image: imageUrl,
      external_url: d.network === "sepolia"
        ? `https://sepolia.etherscan.io/token/${d.contracts.EventTicketNFT}?a=${tokenId.toString()}`
        : undefined,
      attributes: [
        { trait_type: "Event ID", value: eventId.toString() },
        { trait_type: "Event", value: e.name },
        { trait_type: "Venue", value: e.venue },
        { trait_type: "Date", value: dateIso },
        { trait_type: "Owner", value: owner },
        { trait_type: "Used", value: used ? "Yes" : "No" },
        { trait_type: "Resale Enabled", value: e.resaleEnabled ? "Yes" : "No" },
        { trait_type: "Royalty Bps", value: Number(e.royaltyBps) },
        { trait_type: "Base Price ETH", value: ethers.formatEther(e.basePrice) }
      ]
    };

    const svg = makeSvg(tokenId, e.name, e.venue, dateIso);

    fs.writeFileSync(
      path.join(outDir, `${tokenId.toString()}.json`),
      JSON.stringify(metadata, null, 2),
      "utf8"
    );

    fs.writeFileSync(
      path.join(outDir, `${tokenId.toString()}.svg`),
      svg,
      "utf8"
    );
  }

  console.log("Metadata generated in docs/metadata");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});