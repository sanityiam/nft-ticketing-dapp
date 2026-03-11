import { useEffect, useState } from "react";
import { formatEther } from "ethers";
import { connectWallet } from "../lib/ethereum";
import { getContracts } from "../lib/contracts";

export default function HomePage() {
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [latestEventId, setLatestEventId] = useState<bigint | null>(null);
  const [eventData, setEventData] = useState<any>(null);

  async function handleConnect() {
    try {
      const res = await connectWallet();
      setAddress(res.address);
      setChainId(res.chainId);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadLatestEvent() {
    try {
      const { ticketingPlatform } = await getContracts();
      const nextEventId = await ticketingPlatform.nextEventId();
      const latest = nextEventId - 1n;

      if (latest < 1n) return;

      const data = await ticketingPlatform.eventsById(latest);
      setLatestEventId(latest);
      setEventData(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadLatestEvent();
  }, []);

  return (
    <div>
      <div className="badge">Overview</div>
      <h2 className="section-title" style={{ marginTop: 16 }}>
        Home
      </h2>

      <div className="notice">
        This dApp demonstrates an end-to-end blockchain ticketing flow on Ethereum Sepolia
        This includes event creation, ticket minting, purchasing, resale listing, resale and check-in - all on-chain
      </div>

      <div className="button-row">
        <button onClick={handleConnect}>Connect MetaMask</button>
      </div>

      <div className="info-grid">
        <div className="info-row">
          <div className="label">Wallet</div>
          <div className="value">{address || "Not connected"}</div>
        </div>

        <div className="info-row">
          <div className="label">Chain ID</div>
          <div className="value">{chainId ?? "-"}</div>
        </div>
      </div>

      <hr />

      <div className="info-grid">
        <div className="info-row">
          <div className="label">For Organisers</div>
          <div className="value">Organiser - Create event - Mint tickets</div>
        </div>

        <div className="info-row">
          <div className="label">For Buyers</div>
          <div className="value">Marketplace - Buy primary or resale ticket</div>
        </div>

        <div className="info-row">
          <div className="label">For Verifiers</div>
          <div className="value">Verify page - Validate token - Check in ticket</div>
        </div>
      </div>

      <hr />

      <h3 className="section-title" style={{ fontSize: "1.35rem" }}>
        Latest Event
      </h3>

      {!eventData && <div className="notice">No event found yet</div>}

      {eventData && (
        <div className="info-grid">
          <div className="info-row">
            <div className="label">Event ID</div>
            <div className="value">{latestEventId?.toString()}</div>
          </div>

          <div className="info-row">
            <div className="label">Name</div>
            <div className="value">{eventData.name}</div>
          </div>

          <div className="info-row">
            <div className="label">Venue</div>
            <div className="value">{eventData.venue}</div>
          </div>

          <div className="info-row">
            <div className="label">Base Price</div>
            <div className="value">{formatEther(eventData.basePrice)} ETH</div>
          </div>

          <div className="info-row">
            <div className="label">Minted Count</div>
            <div className="value">{eventData.mintedCount.toString()}</div>
          </div>

          <div className="info-row">
            <div className="label">Max Supply</div>
            <div className="value">{eventData.maxSupply.toString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}