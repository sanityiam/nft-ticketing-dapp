// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventTicketNFT.sol";

contract TicketingPlatform {
    // NFT contract
    EventTicketNFT public ticketNFT;
    
    constructor(address nftAddress) {
        ticketNFT = EventTicketNFT(nftAddress);
    }

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

    event TicketsMinted(uint256 indexed eventId, uint256 quantity, uint256 firstTokenId, uint256 lastTokenId);
    event TicketCreated(uint256 indexed tokenId, uint256 indexed eventId);
    event TicketPurchased(uint256 indexed eventId, uint256 indexed tokenId, address indexed buyer, uint256 price);

    // Errors
    error EmptyName();
    error EmptyVenue();
    error InvalidDateTime();
    error InvalidMaxSupply();
    error InvalidRoyaltyBps();
    error InvalidVenueVerifier();
    error EventNotFound();
    error NotOrganizer();
    error SupplyExceeded();
    error InvalidPayment();
    error SoldOut();
    error TransferFailed();


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

    // primary pool
    mapping(uint256 => uint256[]) private primaryPool;

    // next listing id
    uint256 public nextListingId = 1;

    // next token id
    uint256 public nextTokenId = 1;

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

    // mint tickets
    function mintTickets(uint256 eventId, uint256 quantity) external returns (uint256 firstTokenId, uint256 lastTokenId) {
        if (quantity == 0) revert InvalidMaxSupply(); // reuse existing error (simple) or change later

        EventData storage e = eventsById[eventId];
        if (e.organizer == address(0)) revert EventNotFound();
        if (e.organizer != msg.sender) revert NotOrganizer();

        if (e.mintedCount + quantity > e.maxSupply) revert SupplyExceeded();

        firstTokenId = nextTokenId;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = nextTokenId;
            nextTokenId += 1;

            ticketEventId[tokenId] = eventId;
            ticketUsed[tokenId] = false;

            ticketNFT.mint(address(this), tokenId);
            primaryPool[eventId].push(tokenId);

            emit TicketCreated(tokenId, eventId);
        }

        e.mintedCount += quantity;

        lastTokenId = nextTokenId - 1;
        emit TicketsMinted(eventId, quantity, firstTokenId, lastTokenId);
    }

    // buy primary ticket
    function buyPrimary(uint256 eventId) external payable returns (uint256 tokenId) {
        EventData storage e = eventsById[eventId];
        if (e.organizer == address(0)) revert EventNotFound();

        if (msg.value != e.basePrice) revert InvalidPayment();

        uint256 poolSize = primaryPool[eventId].length;
        if (poolSize == 0) revert SoldOut();

        tokenId = primaryPool[eventId][poolSize - 1];
        primaryPool[eventId].pop();

        // transfer NFT to buyer
        ticketNFT.transferFrom(address(this), msg.sender, tokenId);

        // pay organizer
        (bool ok, ) = e.organizer.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit TicketPurchased(eventId, tokenId, msg.sender, msg.value);
    }

    // sanity check function
    function version() external pure returns (string memory) {
        return "TicketingPlatform v0.1 (data structures)";
    }
}