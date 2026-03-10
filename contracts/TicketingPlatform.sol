// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventTicketNFT.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract TicketingPlatform is ReentrancyGuard, ERC721Holder {
    // nft contract
    EventTicketNFT public ticketNFT;

    constructor(address nftAddress) {
        ticketNFT = EventTicketNFT(nftAddress);
    }

    // events
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
    event TicketCheckedIn(uint256 indexed eventId, uint256 indexed tokenId, address indexed verifier, address attendee);
    event ResaleRulesUpdated(uint256 indexed eventId, bool resaleEnabled, uint256 maxResalePrice, uint16 royaltyBps);
    event ListedForResale(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ResalePurchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, address buyer, uint256 price, uint256 royaltyPaid);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller);

    // errors
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
    error NotVenueVerifier();
    error TicketAlreadyUsed();
    error NotTicketOwner();
    error ResaleDisabled();
    error PriceTooHigh();
    error InvalidPrice();
    error NotApproved();
    error ListingNotFound();
    error ListingInactive();

    // event data structure
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
        uint256 maxResalePrice;

        uint16 royaltyBps; // basis points (500 = 5%)
        address venueVerifier; // address allowed to check-in
    }

    // resale rules
    struct ResaleRules {
        bool resaleEnabled;
        uint256 maxResalePrice;
        uint16 royaltyBps;
    }

    // eventId => EventData
    mapping(uint256 => EventData) public eventsById;

    // eventId => ResaleRules
    mapping(uint256 => ResaleRules) public resaleRulesByEvent;

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

        resaleRulesByEvent[eventId] = ResaleRules({
            resaleEnabled: resaleEnabled,
            maxResalePrice: maxResalePrice,
            royaltyBps: royaltyBps
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
        if (quantity == 0) revert InvalidMaxSupply();

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

    // set resale rules
    function setResaleRules(
        uint256 eventId,
        bool resaleEnabled,
        uint256 maxResalePrice,
        uint16 royaltyBps
    ) external {
        EventData storage e = eventsById[eventId];
        if (e.organizer == address(0)) revert EventNotFound();
        if (e.organizer != msg.sender) revert NotOrganizer();
        if (royaltyBps > 10_000) revert InvalidRoyaltyBps();

        if (!resaleEnabled) {
            maxResalePrice = 0;
        }

        e.resaleEnabled = resaleEnabled;
        e.maxResalePrice = maxResalePrice;
        e.royaltyBps = royaltyBps;

        resaleRulesByEvent[eventId] = ResaleRules({
            resaleEnabled: resaleEnabled,
            maxResalePrice: maxResalePrice,
            royaltyBps: royaltyBps
        });

        emit ResaleRulesUpdated(eventId, resaleEnabled, maxResalePrice, royaltyBps);
    }

    // buy primary ticket
    function buyPrimary(uint256 eventId) external payable nonReentrant returns (uint256 tokenId) {
        EventData storage e = eventsById[eventId];
        if (e.organizer == address(0)) revert EventNotFound();

        if (msg.value != e.basePrice) revert InvalidPayment();

        uint256 poolSize = primaryPool[eventId].length;
        if (poolSize == 0) revert SoldOut();

        tokenId = primaryPool[eventId][poolSize - 1];
        primaryPool[eventId].pop();

        // transfer nft to buyer
        ticketNFT.safeTransferFrom(address(this), msg.sender, tokenId);

        // pay organizer
        (bool ok, ) = e.organizer.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit TicketPurchased(eventId, tokenId, msg.sender, msg.value);
    }

    // resale listing
    function listForResale(uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        uint256 eventId = ticketEventId[tokenId];
        if (eventId == 0) revert EventNotFound();

        ResaleRules memory r = resaleRulesByEvent[eventId];
        if (!r.resaleEnabled) revert ResaleDisabled();

        if (ticketUsed[tokenId]) revert TicketAlreadyUsed();
        if (price == 0) revert InvalidPrice();
        if (r.maxResalePrice != 0 && price > r.maxResalePrice) revert PriceTooHigh();

        // must own ticket
        if (ticketNFT.ownerOf(tokenId) != msg.sender) revert NotTicketOwner();

        // must approve platform to transfer nft
        if (ticketNFT.getApproved(tokenId) != address(this) && !ticketNFT.isApprovedForAll(msg.sender, address(this))) {
            revert NotApproved();
        }

        listingId = nextListingId;
        nextListingId += 1;

        listingsById[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ListedForResale(listingId, tokenId, msg.sender, price);
    }

    // buy resale ticket
    function buyResale(uint256 listingId) external payable nonReentrant returns (uint256 tokenId) {
        Listing storage l = listingsById[listingId];
        if (l.seller == address(0)) revert ListingNotFound();
        if (!l.active) revert ListingInactive();

        tokenId = l.tokenId;

        uint256 eventId = ticketEventId[tokenId];
        if (eventId == 0) revert EventNotFound();

        EventData storage e = eventsById[eventId];
        ResaleRules memory r = resaleRulesByEvent[eventId];

        if (!r.resaleEnabled) revert ResaleDisabled();
        if (ticketUsed[tokenId]) revert TicketAlreadyUsed();

        if (msg.value != l.price) revert InvalidPayment();

        // deactivate listing first
        l.active = false;

        // calculate royalty
        uint256 royalty = (msg.value * uint256(r.royaltyBps)) / 10_000;
        uint256 sellerAmount = msg.value - royalty;

        // transfer nft from seller to buyer
        ticketNFT.safeTransferFrom(l.seller, msg.sender, tokenId);

        // pay seller
        (bool okSeller, ) = l.seller.call{value: sellerAmount}("");
        if (!okSeller) revert TransferFailed();

        // pay organizer royalty
        if (royalty > 0) {
            (bool okOrg, ) = e.organizer.call{value: royalty}("");
            if (!okOrg) revert TransferFailed();
        }

        emit ResalePurchased(listingId, tokenId, l.seller, msg.sender, msg.value, royalty);
    }

    function verifyTicket(uint256 tokenId, address wallet) external view returns (bool ok) {
        uint256 eventId = ticketEventId[tokenId];
        if (eventId == 0) return false;
        if (ticketUsed[tokenId]) return false;
        if (ticketNFT.ownerOf(tokenId
        ) != wallet) return false;
        return true;
    }

    // check in ticket
    function checkIn(uint256 tokenId, address attendee) external {
        uint256 eventId = ticketEventId[tokenId];
        if (eventId == 0) revert EventNotFound();

        EventData storage e = eventsById[eventId];
        if (msg.sender != e.venueVerifier) revert NotVenueVerifier();

        if (ticketUsed[tokenId]) revert TicketAlreadyUsed();

        // user must own the NFT
        if (ticketNFT.ownerOf(tokenId) != attendee) revert NotTicketOwner();

        ticketUsed[tokenId] = true;

        emit TicketCheckedIn(eventId, tokenId, msg.sender, attendee);
    }

    function getPrimaryPoolTokenIds(uint256 eventId) external view returns (uint256[] memory) {
    return primaryPool[eventId];
}

    // sanity check function
    function version() external pure returns (string memory) {
        return "TicketingPlatform v0.1 (data structures)";
    }
}