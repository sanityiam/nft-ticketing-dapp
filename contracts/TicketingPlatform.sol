pragma solidity ^0.8.20;

contract TicketingPlatform {
    // Event data structure
    struct EventData {
        uint256 eventId;
        address organizer;

        string name;
        string venue;
        uint256 dateTime;

        uint256 basePrice; // wei
        uint256 maxSupply;
        uint256 mintedCount;

        bool resaleEnabled;
        uint256 maxResalePrice; // 0 = no cap

        uint16 royaltyBps; // basis points (500 = 5%)
        address venueVerifier; // address allowed to check-in
    }

    // eventId => EventData
    mapping(uint256 => EventData) public eventsById;

    // next event id
    uint256 public nextEventId = 1;

    // Ticket flags
    // tokenId => eventId
    mapping(uint256 => uint256) public ticketEventId;

    // tokenId => used?
    mapping(uint256 => bool) public ticketUsed;

    // Resale listing
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address seller;
        uint256 price; // wei
        bool active;
    }

    // listingId => Listing
    mapping(uint256 => Listing) public listingsById;

    // next listing id
    uint256 public nextListingId = 1;

    // sanity check function
    function version() external pure returns (string memory) {
        return "TicketingPlatform v0.1 (data structures)";
    }
}
