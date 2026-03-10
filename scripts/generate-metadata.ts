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

function esc(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function makeSquareSvg(
  tokenId: bigint,
  eventId: bigint,
  eventName: string,
  venue: string,
  dateIso: string,
  used: boolean
) {
  const safeName = esc(eventName);
  const safeVenue = esc(venue);
  const safeDate = esc(dateIso);
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
  <rect x="70" y="70" width="1060" height="1060" rx="36" fill="url(#panel)" stroke="#7c3aed" stroke-width="4"/>

  <text x="100" y="150" fill="#a78bfa" font-size="28" font-family="Arial, sans-serif" font-weight="700">NFT TICKETING DAPP</text>

  <text x="100" y="245" fill="#ffffff" font-size="56" font-family="Arial, sans-serif" font-weight="700">${safeName}</text>
  <text x="100" y="305" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">${safeVenue}</text>
  <text x="100" y="350" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">${safeDate}</text>

  <rect x="100" y="400" width="1000" height="2" fill="#334155"/>

  <rect x="100" y="455" width="480" height="220" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="130" y="510" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">EVENT ID</text>
  <text x="130" y="575" fill="#ffffff" font-size="52" font-family="Arial, sans-serif" font-weight="700">${eventId.toString()}</text>
  <text x="130" y="635" fill="#64748b" font-size="20" font-family="Arial, sans-serif">On-chain event reference</text>

  <rect x="620" y="455" width="480" height="220" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="650" y="510" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">TOKEN ID</text>
  <text x="650" y="575" fill="#ffffff" font-size="52" font-family="Arial, sans-serif" font-weight="700">#${tokenId.toString()}</text>
  <text x="650" y="635" fill="#64748b" font-size="20" font-family="Arial, sans-serif">Unique NFT ticket ID</text>

  <rect x="100" y="730" width="1000" height="220" rx="24" fill="#0b1220" stroke="#334155"/>
  <text x="130" y="790" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">STATUS</text>
  <text x="130" y="860" fill="${used ? "#ef4444" : "#22c55e"}" font-size="56" font-family="Arial, sans-serif" font-weight="700">${safeStatus}</text>
  <text x="130" y="920" fill="#64748b" font-size="20" font-family="Arial, sans-serif">Primary + resale + check-in enforced by smart contract</text>

  <text x="100" y="1045" fill="#64748b" font-size="20" font-family="Arial, sans-serif">
    Ethereum Sepolia • Square wallet-friendly NFT preview
  </text>
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
    const dateIso = toIsoFromUnix(e.dateTime);

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
        { trait_type: "Date", value: dateIso },
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
      dateIso,
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