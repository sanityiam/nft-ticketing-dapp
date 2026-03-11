import { useState } from "react";
import { parseEther } from "ethers";
import { getContracts, readOnChainMetadata } from "../lib/contracts";
import { connectWallet } from "../lib/ethereum";

type TicketCard = {
  tokenId: string;
  tokenUri: string;
  owner: string;
  used: boolean;
  isApproved: boolean;
  resalePriceInput: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  };
};

export default function MyTicketsPage() {
  const [address, setAddress] = useState("");
  const [tickets, setTickets] = useState<TicketCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingTokenId, setActionLoadingTokenId] = useState<string | null>(null);

  async function handleConnect() {
    try {
      const res = await connectWallet();
      setAddress(res.address);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadMyTickets() {
    try {
      setLoading(true);

      const { ticketingPlatform, eventTicketNFT, addresses } = await getContracts();
      const res = await connectWallet();
      const wallet = res.address.toLowerCase();

      setAddress(res.address);

      const nextTokenId = await ticketingPlatform.nextTokenId();
      const maxTokenId = Number(nextTokenId - 1n);

      const ownedTickets: TicketCard[] = [];

      for (let i = 1; i <= maxTokenId; i++) {
        try {
          const owner = await eventTicketNFT.ownerOf(BigInt(i));
          if (owner.toLowerCase() !== wallet) continue;

          const used = await ticketingPlatform.ticketUsed(BigInt(i));

          let tokenUri = "";
          try {
            tokenUri = await eventTicketNFT.tokenURI(BigInt(i));
          } catch {
            tokenUri = "";
          }

          let metadata: TicketCard["metadata"] | undefined = undefined;
          if (tokenUri) {
            try {
              metadata = await readOnChainMetadata(tokenUri);
            } catch {
              metadata = undefined;
            }
          }

          let isApproved = false;
          try {
            const approvedForAll = await eventTicketNFT.isApprovedForAll(
              res.address,
              addresses.contracts.TicketingPlatform
            );
            const approvedAddress = await eventTicketNFT.getApproved(BigInt(i));

            isApproved =
              approvedForAll ||
              approvedAddress.toLowerCase() ===
                addresses.contracts.TicketingPlatform.toLowerCase();
          } catch {
            isApproved = false;
          }

          ownedTickets.push({
            tokenId: i.toString(),
            tokenUri,
            owner,
            used,
            isApproved,
            resalePriceInput: "0.015",
            metadata,
          });
        } catch {
          continue;
        }
      }

      setTickets(ownedTickets);
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  function updateResalePrice(tokenId: string, value: string) {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.tokenId === tokenId
          ? { ...ticket, resalePriceInput: value }
          : ticket
      )
    );
  }

  async function approveMarketplace(tokenId: string) {
    try {
      setActionLoadingTokenId(tokenId);

      const { eventTicketNFT, addresses } = await getContracts();

      const tx = await eventTicketNFT.approve(
        addresses.contracts.TicketingPlatform,
        BigInt(tokenId)
      );
      await tx.wait();

      alert(`Marketplace approved for token ${tokenId}`);

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.tokenId === tokenId
            ? { ...ticket, isApproved: true }
            : ticket
        )
      );
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Approval failed");
    } finally {
      setActionLoadingTokenId(null);
    }
  }

  async function listForResale(tokenId: string) {
    try {
      const ticket = tickets.find((t) => t.tokenId === tokenId);
      if (!ticket) return;

      if (!ticket.resalePriceInput || Number(ticket.resalePriceInput) <= 0) {
        alert("Please enter a valid resale price in ETH");
        return;
      }

      setActionLoadingTokenId(tokenId);

      const { ticketingPlatform } = await getContracts();

      const tx = await ticketingPlatform.listForResale(
        BigInt(tokenId),
        parseEther(ticket.resalePriceInput)
      );
      await tx.wait();

      alert(`Token ${tokenId} listed for resale`);
      await loadMyTickets();
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Listing failed");
    } finally {
      setActionLoadingTokenId(null);
    }
  }

  return (
    <div>
      <div className="badge">Wallet dashboard</div>
      <h2 className="section-title" style={{ marginTop: 16 }}>
        My Tickets
      </h2>

      <div className="button-row">
        <button onClick={handleConnect}>Connect MetaMask</button>
        <button onClick={loadMyTickets} disabled={loading}>
          {loading ? "Loading..." : "Load My Tickets"}
        </button>
      </div>

      <div className="info-grid" style={{ marginTop: 20 }}>
        <div className="info-row">
          <div className="label">Wallet</div>
          <div className="value">{address || "Not connected"}</div>
        </div>

        <div className="info-row">
          <div className="label">Owned Tickets Found</div>
          <div className="value">{tickets.length}</div>
        </div>
      </div>

      {tickets.length === 0 && !loading && (
        <div className="notice" style={{ marginTop: 20 }}>
          No owned tickets found for the connected wallet
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {tickets.map((ticket) => {
          const isBusy = actionLoadingTokenId === ticket.tokenId;

          return (
            <div
              key={ticket.tokenId}
              className="info-row"
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(15, 23, 42, 0.72)",
              }}
            >
              {ticket.metadata?.image ? (
                <img
                  src={ticket.metadata.image}
                  alt={ticket.metadata?.name || `Ticket #${ticket.tokenId}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 14,
                    marginBottom: 14,
                    border: "1px solid rgba(148, 163, 184, 0.15)",
                    background: "#0f172a",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 14,
                    marginBottom: 14,
                    border: "1px solid rgba(148, 163, 184, 0.15)",
                    background: "rgba(15, 23, 42, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  No image available
                </div>
              )}

              <div className="label">Ticket</div>
              <div className="value" style={{ marginBottom: 10 }}>
                {ticket.metadata?.name || `Token #${ticket.tokenId}`}
              </div>

              <div className="label">Token ID</div>
              <div className="value" style={{ marginBottom: 10 }}>
                {ticket.tokenId}
              </div>

              <div className="label">Used</div>
              <div className={`value ${ticket.used ? "success" : ""}`} style={{ marginBottom: 10 }}>
                {ticket.used ? "Yes" : "No"}
              </div>

              <div className="label">Marketplace Approval</div>
              <div className="value" style={{ marginBottom: 10 }}>
                {ticket.isApproved ? "Approved" : "Not approved"}
              </div>

              <div className="label">Owner</div>
              <div className="value" style={{ marginBottom: 10, fontSize: "0.9rem" }}>
                {ticket.owner}
              </div>

              {ticket.metadata?.description && (
                <>
                  <div className="label">Description</div>
                  <div className="value" style={{ marginBottom: 10, fontWeight: 400 }}>
                    {ticket.metadata.description}
                  </div>
                </>
              )}

              <div className="label">Resale Price</div>
              <div className="form-stack" style={{ marginTop: 8 }}>
                <input
                  value={ticket.resalePriceInput}
                  onChange={(e) => updateResalePrice(ticket.tokenId, e.target.value)}
                  placeholder="Resale price"
                />
              </div>

              <div className="button-row" style={{ marginTop: 14 }}>
                <button
                  onClick={() => approveMarketplace(ticket.tokenId)}
                  disabled={isBusy || ticket.used || ticket.isApproved}
                >
                  {isBusy && !ticket.isApproved ? "Approving..." : "Approve Marketplace"}
                </button>

                <button
                  onClick={() => listForResale(ticket.tokenId)}
                  disabled={isBusy || ticket.used || !ticket.isApproved}
                >
                  {isBusy && ticket.isApproved ? "Listing..." : "List for Resale"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}