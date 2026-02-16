// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TicketingPlatform {
    // Events
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string name,
        string venue,
        uint256 dateTime,
        uint256 basePrice,
        uint256 maxSupply,
        bool resaleEnabled,
        uint256 maxResalePrice,
        uint16 royaltyBps,
        address venueVerifier
    );

    // Errors
    error EmptyName();
    error EmptyVenue();
    error InvalidDateTime();
    error InvalidMaxSupply();
    error InvalidRoyaltyBps();
    error InvalidVenueVerifier();

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

    // create event
    function createEvent(
        string calldata name,
        string calldata venue,
        uint256 dateTime,
        uint256 basePrice,
        uint256 maxSupply,
        bool resaleEnabled,
        uint256 maxResalePrice,
        uint16 royaltyBps,
        address venueVerifier
    ) external returns (uint256 eventId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(venue).length == 0) revert EmptyVenue();
        if (dateTime == 0) revert InvalidDateTime();
        if (maxSupply == 0) revert InvalidMaxSupply();
        if (royaltyBps > 10_000) revert InvalidRoyaltyBps();
        if (venueVerifier == address(0)) revert InvalidVenueVerifier();

        if (!resaleEnabled) {
            maxResalePrice = 0;
        }

        eventId = nextEventId;
        nextEventId += 1;

        eventsById[eventId] = EventData({
            eventId: eventId,
            organizer: msg.sender,
            name: name,
            venue: venue,
            dateTime: dateTime,
            basePrice: basePrice,
            maxSupply: maxSupply,
            mintedCount: 0,
            resaleEnabled: resaleEnabled,
            maxResalePrice: maxResalePrice,
            royaltyBps: royaltyBps,
            venueVerifier: venueVerifier
        });

        emit EventCreated(
            eventId,
            msg.sender,
            name,
            venue,
            dateTime,
            basePrice,
            maxSupply,
            resaleEnabled,
            maxResalePrice,
            royaltyBps,
            venueVerifier
        );
    }

    // sanity check function
    function version() external pure returns (string memory) {
        return "TicketingPlatform v0.1 (data structures)";
    }
}