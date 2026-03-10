import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function esc(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatEventDateTime(ts: bigint) {
  const d = new Date(Number(ts) * 1000);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} / ${hours}:${minutes}`;
}

function makeSquareSvg(
  tokenId: bigint,
  eventId: bigint,
  eventName: string,
  venue: string,
  dateLabel: string,
  used: boolean
) {
  const safeName = esc(eventName);
  const safeVenue = esc(venue);
  const safeDate = esc(dateLabel);
  const safeStatus = used ? "USED" : "VALID";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="1200" rx="48" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="1080" rx="36" fill="url(#panel)" stroke="#7c3aed" stroke-width="4"/>

  <text x="100" y="145" fill="#a78bfa" font-size="28" font-family="Arial, sans-serif" font-weight="700">NFT TICKETING DAPP</text>

  <text x="100" y="245" fill="#ffffff" font-size="56" font-family="Arial, sans-serif" font-weight="700">${safeName}</text>
  <text x="100" y="305" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">${safeVenue}</text>
  <text x="100" y="350" fill="#94a3b8" font-size="24" font-family="Arial, sans-serif">${safeDate}</text>

  <rect x="100" y="405" width="1000" height="2" fill="#334155"/>

  <rect x="100" y="465" width="470" height="260" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="130" y="525" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">EVENT ID</text>
  <text x="130" y="605" fill="#ffffff" font-size="62" font-family="Arial, sans-serif" font-weight="700">${eventId.toString()}</text>

  <rect x="630" y="465" width="470" height="260" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="660" y="525" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">TOKEN ID</text>
  <text x="660" y="605" fill="#ffffff" font-size="62" font-family="Arial, sans-serif" font-weight="700">#${tokenId.toString()}</text>

  <rect x="100" y="785" width="1000" height="260" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="130" y="850" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">STATUS</text>
  <text x="130" y="940" fill="${used ? "#ef4444" : "#22c55e"}" font-size="72" font-family="Arial, sans-serif" font-weight="700">${safeStatus}</text>
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
  const baseUri =
    baseUriRaw === ""
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
    const dateLabel = formatEventDateTime(e.dateTime);

    const imageUrl = baseUri
      ? `${baseUri}${tokenId.toString()}.svg`
      : `${tokenId.toString()}.svg`;

    const metadata = {
      name: `${e.name} Ticket #${tokenId.toString()}`,
      description: `NFT ticket for ${e.name} at ${e.venue}. Event ID ${eventId.toString()}. Ownership, resale and used-status are enforced on-chain.`,
      image: imageUrl,
      external_url:
        d.network === "sepolia"
          ? `https://sepolia.etherscan.io/token/${d.contracts.EventTicketNFT}?a=${tokenId.toString()}`
          : undefined,
      attributes: [
        { trait_type: "Event ID", value: eventId.toString() },
        { trait_type: "Event", value: e.name },
        { trait_type: "Venue", value: e.venue },
        { trait_type: "Date", value: dateLabel },
        { trait_type: "Owner", value: owner },
        { trait_type: "Used", value: used ? "Yes" : "No" },
        { trait_type: "Resale Enabled", value: e.resaleEnabled ? "Yes" : "No" },
        { trait_type: "Royalty Bps", value: Number(e.royaltyBps) },
        { trait_type: "Base Price ETH", value: ethers.formatEther(e.basePrice) }
      ]
    };

    const svg = makeSquareSvg(
      tokenId,
      eventId,
      e.name,
      e.venue,
      dateLabel,
      used
    );

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