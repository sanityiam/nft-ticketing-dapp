import { useState } from "react";
import { parseEther } from "ethers";
import { getContracts } from "../lib/contracts";
import { connectWallet } from "../lib/ethereum";

function toUnixFromDatetimeLocal(value: string) {
  return BigInt(Math.floor(new Date(value).getTime() / 1000));
}

export default function OrganizerPage() {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("Dubai Concert");
  const [venue, setVenue] = useState("Coca-Cola Arena");
  const [eventDateTime, setEventDateTime] = useState("");
  const [price, setPrice] = useState("0.01");
  const [maxSupply, setMaxSupply] = useState("10");
  const [quantity, setQuantity] = useState("5");
  const [eventId, setEventId] = useState("1");
  const [createdEventId, setCreatedEventId] = useState("");

  async function handleConnect() {
    try {
      const res = await connectWallet();
      setAddress(res.address);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function createEvent() {
    try {
      if (!eventDateTime) {
        alert("Please choose the event date and time");
        return;
      }

      const { ticketingPlatform, signer } = await getContracts();

      const tx = await ticketingPlatform.createEvent(
        name,
        venue,
        toUnixFromDatetimeLocal(eventDateTime),
        parseEther(price),
        BigInt(maxSupply),
        true,
        parseEther("0.02"),
        500,
        await signer.getAddress()
      );

      const rcpt = await tx.wait();
      const log = rcpt.logs.find((l: any) => l.fragment?.name === "EventCreated");
      const newEventId = log?.args?.eventId?.toString();

      if (newEventId) {
        setEventId(newEventId);
        setCreatedEventId(newEventId);
      }

      alert(`Event created${newEventId ? `: ${newEventId}` : ""}`);
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Create event failed");
    }
  }

  async function mintTickets() {
    try {
      const { ticketingPlatform } = await getContracts();
      const tx = await ticketingPlatform.mintTickets(BigInt(eventId), BigInt(quantity));
      await tx.wait();
      alert("Tickets minted successfully");
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Mint failed");
    }
  }

  return (
    <div>
      <div className="badge">Organizer dashboard</div>
      <h2 className="section-title" style={{ marginTop: 16 }}>Organizer</h2>

      <div className="button-row">
        <button onClick={handleConnect}>Connect MetaMask</button>
      </div>

      <div className="info-grid">
        <div className="info-row">
          <div className="label">Wallet</div>
          <div className="value">{address || "Not connected"}</div>
        </div>

        <div className="info-row">
          <div className="label">Latest Created Event ID</div>
          <div className="value">{createdEventId || "-"}</div>
        </div>
      </div>

      <hr />

      <h3 className="section-title" style={{ fontSize: "1.35rem" }}>Create Event</h3>

      <div className="form-stack">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
        />
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Venue"
        />
        <input
          type="datetime-local"
          value={eventDateTime}
          onChange={(e) => setEventDateTime(e.target.value)}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Base price in ETH"
        />
        <input
          value={maxSupply}
          onChange={(e) => setMaxSupply(e.target.value)}
          placeholder="Max supply"
        />
      </div>

      <div className="button-row">
        <button onClick={createEvent}>Create Event</button>
      </div>

      <hr />

      <h3 className="section-title" style={{ fontSize: "1.35rem" }}>Mint Tickets</h3>

      <div className="form-stack">
        <input
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event ID"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
        />
      </div>

      <div className="button-row">
        <button onClick={mintTickets}>Mint Tickets</button>
      </div>
    </div>
  );
}