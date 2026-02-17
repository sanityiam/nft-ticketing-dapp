import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import { loadDeployments } from "./_deployments.js";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function makeSvg(tokenId: bigint, eventName: string, venue: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="900" height="500" viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="500" rx="28" fill="#0B0F17"/>
  <rect x="40" y="40" width="820" height="420" rx="22" fill="#131A2A"/>
  <text x="70" y="120" font-size="46" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="700">${eventName}</text>
  <text x="70" y="175" font-size="26" fill="#A7B2C6" font-family="Arial, sans-serif">${venue}</text>

  <text x="70" y="270" font-size="22" fill="#A7B2C6" font-family="Arial, sans-serif">Ticket ID</text>
  <text x="70" y="315" font-size="44" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="700">#${tokenId.toString()}</text>

  <text x="70" y="410" font-size="18" fill="#6E7A91" font-family="Arial, sans-serif">Verified on-chain • Resale rules enforced by smart contract</text>
</svg>`;
}

async function main() {
  const { ethers } = await network.connect();
  const d = loadDeployments();

  const platform = await ethers.getContractAt("TicketingPlatform", d.contracts.TicketingPlatform);
  const nft = await ethers.getContractAt("EventTicketNFT", d.contracts.EventTicketNFT);

  const outDir = path.join(process.cwd(), "metadata");
  ensureDir(outDir);

  const nextTokenId = await platform.nextTokenId();
  const start = nextTokenId > 50n ? nextTokenId - 50n : 1n;

  console.log(`Generating metadata for tokenIds in range [${start}..${nextTokenId - 1n}]`);

  for (let t = nextTokenId - 1n; t >= start; t--) {
    const eventId = await platform.ticketEventId(t);
    if (eventId === 0n) continue;

    let owner: string;
    try {
      owner = await nft.ownerOf(t);
    } catch {
      continue;
    }

    const e = await platform.eventsById(eventId);

    const json = {
      name: `${e.name} Ticket #${t.toString()}`,
      description:
        `NFT ticket for ${e.name} at ${e.venue}. Ownership is verified on-chain. Resale rules and used status are enforced by the TicketingPlatform smart contract.`,
      image: `__BASE__/metadata/${t.toString()}.svg`,
      attributes: [
        { trait_type: "EventId", value: eventId.toString() },
        { trait_type: "Event", value: e.name },
        { trait_type: "Venue", value: e.venue },
        { trait_type: "Owner", value: owner }
      ]
    };

    fs.writeFileSync(path.join(outDir, `${t.toString()}.json`), JSON.stringify(json, null, 2), "utf8");
    fs.writeFileSync(path.join(outDir, `${t.toString()}.svg`), makeSvg(t, e.name, e.venue), "utf8");
  }

  console.log("metadata/ generated (json + svg).");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});