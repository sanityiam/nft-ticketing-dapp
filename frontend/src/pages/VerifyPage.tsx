import { useState } from "react";
import { getContracts } from "../lib/contracts";
import { connectWallet } from "../lib/ethereum";

export default function VerifyPage() {
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("1");
  const [owner, setOwner] = useState("");
  const [used, setUsed] = useState<boolean | null>(null);
  const [eventId, setEventId] = useState("");
  const [venueVerifier, setVenueVerifier] = useState("");
  const [checking, setChecking] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleConnect() {
    try {
      const res = await connectWallet();
      setAddress(res.address);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function verifyTicket() {
    try {
      setVerifying(true);
      const { ticketingPlatform, eventTicketNFT } = await getContracts();

      const currentOwner = await eventTicketNFT.ownerOf(BigInt(tokenId));
      const currentUsed = await ticketingPlatform.ticketUsed(BigInt(tokenId));
      const currentEventId = await ticketingPlatform.ticketEventId(BigInt(tokenId));
      const eventData = await ticketingPlatform.eventsById(currentEventId);

      setOwner(currentOwner);
      setUsed(currentUsed);
      setEventId(currentEventId.toString());
      setVenueVerifier(eventData.venueVerifier);
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Verify failed");
    } finally {
      setVerifying(false);
    }
  }

  async function checkIn() {
    try {
      if (!address) {
        alert("Please connect the verifier wallet first");
        return;
      }

      if (venueVerifier && address.toLowerCase() !== venueVerifier.toLowerCase()) {
        alert("Connected wallet is not the assigned venue verifier for this event");
        return;
      }

      setChecking(true);

      const { ticketingPlatform, eventTicketNFT } = await getContracts();
      const attendee = await eventTicketNFT.ownerOf(BigInt(tokenId));

      const tx = await ticketingPlatform.checkIn(BigInt(tokenId), attendee);
      await tx.wait();

      alert("Ticket checked in");
      await verifyTicket();
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Check-in failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="badge">Venue validation</div>
      <h2 className="section-title" style={{ marginTop: 16 }}>
        Verify & Check-In
      </h2>

      <div className="notice">
        Use this page to verify token ownership and confirm whether a ticket has already been used.
      </div>

      <div className="button-row">
        <button onClick={handleConnect}>Connect MetaMask</button>
      </div>

      <div className="info-grid">
        <div className="info-row">
          <div className="label">Verifier Wallet</div>
          <div className="value">{address || "Not connected"}</div>
        </div>
      </div>

      <hr />

      <div className="form-stack">
        <input
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Token ID"
        />
      </div>

      <div className="button-row">
        <button onClick={verifyTicket} disabled={verifying}>
          {verifying ? "Verifying..." : "Verify"}
        </button>
        <button onClick={checkIn} disabled={checking}>
          {checking ? "Checking in..." : "Check In"}
        </button>
      </div>

      <div className="info-grid" style={{ marginTop: 24 }}>
        <div className="info-row">
          <div className="label">Event ID</div>
          <div className="value">{eventId || "-"}</div>
        </div>

        <div className="info-row">
          <div className="label">Owner</div>
          <div className="value">{owner || "-"}</div>
        </div>

        <div className="info-row">
          <div className="label">Used</div>
          <div className={`value ${used ? "success" : ""}`}>
            {used === null ? "-" : used ? "Yes" : "No"}
          </div>
        </div>

        <div className="info-row">
          <div className="label">Assigned Venue Verifier</div>
          <div className="value">{venueVerifier || "-"}</div>
        </div>
      </div>
    </div>
  );
}