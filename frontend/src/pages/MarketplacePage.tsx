import { useState } from "react";
import { formatEther } from "ethers";
import { getContracts, readOnChainMetadata } from "../lib/contracts";
import { connectWallet } from "../lib/ethereum";

type ResaleCard = {
  listingId: string;
  tokenId: string;
  seller: string;
  priceWei: string;
  priceEth: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
};

type EventMarketplaceGroup = {
  eventId: string;
  name: string;
  venue: string;
  dateTime: string;
  basePriceWei: string;
  basePriceEth: string;
  primaryAvailable: number;
  resaleListings: ResaleCard[];
};

export default function MarketplacePage() {
  const [address, setAddress] = useState("");
  const [groups, setGroups] = useState<EventMarketplaceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);

  async function handleConnect() {
    try {
      const res = await connectWallet();
      setAddress(res.address);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadMarketplace() {
    try {
      setLoading(true);

      const { ticketingPlatform, eventTicketNFT } = await getContracts();
      const nextEventId = await ticketingPlatform.nextEventId();
      const nextListingId = await ticketingPlatform.nextListingId();

      const result: EventMarketplaceGroup[] = [];

      for (let eventId = 1n; eventId < nextEventId; eventId++) {
        const e = await ticketingPlatform.eventsById(eventId);
        if (!e.organizer || e.organizer === "0x0000000000000000000000000000000000000000") {
          continue;
        }

        let primaryAvailable = 0;
        try {
          const primaryPoolTokenIds = await ticketingPlatform.getPrimaryPoolTokenIds(eventId);
          primaryAvailable = primaryPoolTokenIds.length;
        } catch {
          primaryAvailable = 0;
        }

        const resaleListings: ResaleCard[] = [];

        for (let listingId = 1n; listingId < nextListingId; listingId++) {
          try {
            const listing = await ticketingPlatform.listingsById(listingId);
            if (!listing.active) continue;

            const listingEventId = await ticketingPlatform.ticketEventId(listing.tokenId);
            if (listingEventId !== eventId) continue;

            let metadata: ResaleCard["metadata"] | undefined = undefined;

            try {
              const tokenUri = await eventTicketNFT.tokenURI(listing.tokenId);
              if (tokenUri) {
                metadata = await readOnChainMetadata(tokenUri);
              }
            } catch {
              metadata = undefined;
            }

            resaleListings.push({
              listingId: listing.listingId.toString(),
              tokenId: listing.tokenId.toString(),
              seller: listing.seller,
              priceWei: listing.price.toString(),
              priceEth: formatEther(listing.price),
              metadata,
            });
          } catch {
            continue;
          }
        }

        result.push({
          eventId: eventId.toString(),
          name: e.name,
          venue: e.venue,
          dateTime: new Date(Number(e.dateTime) * 1000).toLocaleString(),
          basePriceWei: e.basePrice.toString(),
          basePriceEth: formatEther(e.basePrice),
          primaryAvailable,
          resaleListings,
        });
      }

      setGroups(result);
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }

  async function buyPrimary(eventId: string, priceWei: string) {
    try {
      setBuyingKey(`primary-${eventId}`);
      const { ticketingPlatform } = await getContracts();

      const tx = await ticketingPlatform.buyPrimary(BigInt(eventId), {
        value: BigInt(priceWei),
      });
      await tx.wait();

      alert(`Primary ticket purchased for event ${eventId}`);
      await loadMarketplace();
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Primary purchase failed");
    } finally {
      setBuyingKey(null);
    }
  }

  async function buyResale(listingId: string, priceWei: string) {
    try {
      setBuyingKey(`resale-${listingId}`);
      const { ticketingPlatform } = await getContracts();

      const tx = await ticketingPlatform.buyResale(BigInt(listingId), {
        value: BigInt(priceWei),
      });
      await tx.wait();

      alert(`Listing ${listingId} purchased successfully`);
      await loadMarketplace();
    } catch (err: any) {
      console.error(err);
      alert(err.shortMessage || err.message || "Resale purchase failed");
    } finally {
      setBuyingKey(null);
    }
  }

  return (
    <div>
      <div className="badge">Marketplace</div>
      <h2 className="section-title" style={{ marginTop: 16 }}>
        Buy Tickets
      </h2>

      <div className="notice">
        This page is main for both primary and resale tickets purchase
      </div>

      <div className="button-row">
        <button onClick={handleConnect}>Connect MetaMask</button>
        <button onClick={loadMarketplace} disabled={loading}>
          {loading ? "Loading..." : "Load Listings"}
        </button>
      </div>

      <div className="info-grid" style={{ marginTop: 20 }}>
        <div className="info-row">
          <div className="label">Wallet</div>
          <div className="value">{address || "Not connected"}</div>
        </div>

        <div className="info-row">
          <div className="label">Events Found</div>
          <div className="value">{groups.length}</div>
        </div>
      </div>

      {groups.length === 0 && !loading && (
        <div className="notice" style={{ marginTop: 20 }}>
          No marketplace events found
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
        {groups.map((group) => (
          <div
            key={group.eventId}
            className="info-row"
            style={{
              padding: 22,
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.72)",
            }}
          >
            <div className="badge">Event #{group.eventId}</div>

            <h3 className="section-title" style={{ fontSize: "1.35rem", marginTop: 14 }}>
              {group.name}
            </h3>

            <div className="info-grid">
              <div className="info-row">
                <div className="label">Venue</div>
                <div className="value">{group.venue}</div>
              </div>

              <div className="info-row">
                <div className="label">Date & Time</div>
                <div className="value">{group.dateTime}</div>
              </div>

              <div className="info-row">
                <div className="label">Primary Price</div>
                <div className="value">{group.basePriceEth} ETH</div>
              </div>

              <div className="info-row">
                <div className="label">Primary Tickets Available</div>
                <div className="value">{group.primaryAvailable}</div>
              </div>
            </div>

            <div className="button-row" style={{ marginTop: 16 }}>
              <button
                onClick={() => buyPrimary(group.eventId, group.basePriceWei)}
                disabled={group.primaryAvailable === 0 || buyingKey === `primary-${group.eventId}`}
              >
                {buyingKey === `primary-${group.eventId}` ? "Buying..." : "Buy Primary"}
              </button>
            </div>

            <hr />

            <h4 className="section-title" style={{ fontSize: "1.1rem" }}>
              Resale Listings
            </h4>

            {group.resaleListings.length === 0 && (
              <div className="notice">No active resale listings for this event</div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 16,
                marginTop: 12,
              }}
            >
              {group.resaleListings.map((listing) => (
                <div
                  key={listing.listingId}
                  className="info-row"
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "rgba(15, 23, 42, 0.82)",
                  }}
                >
                  {listing.metadata?.image ? (
                    <img
                      src={listing.metadata.image}
                      alt={listing.metadata?.name || `Token #${listing.tokenId}`}
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

                  <div className="label">Listing ID</div>
                  <div className="value" style={{ marginBottom: 10 }}>
                    {listing.listingId}
                  </div>

                  <div className="label">Token ID</div>
                  <div className="value" style={{ marginBottom: 10 }}>
                    {listing.tokenId}
                  </div>

                  <div className="label">Seller</div>
                  <div className="value" style={{ marginBottom: 10, fontSize: "0.9rem" }}>
                    {listing.seller}
                  </div>

                  <div className="label">Price</div>
                  <div className="value" style={{ marginBottom: 10 }}>
                    {listing.priceEth} ETH
                  </div>

                  <div className="button-row">
                    <button
                      onClick={() => buyResale(listing.listingId, listing.priceWei)}
                      disabled={buyingKey === `resale-${listing.listingId}`}
                    >
                      {buyingKey === `resale-${listing.listingId}` ? "Buying..." : "Buy Resale"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}