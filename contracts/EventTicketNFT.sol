// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface ITicketMetadataProvider {
    function getTokenMetadataData(uint256 tokenId)
        external
        view
        returns (
            uint256 eventId,
            string memory eventName,
            string memory venue,
            uint256 dateTime,
            bool used,
            bool listed,
            bool exists
        );
}

contract EventTicketNFT is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public metadataProvider;

    constructor() ERC721("EventTicket", "ETIX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    function setMetadataProvider(address provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        metadataProvider = provider;
    }

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        require(metadataProvider != address(0), "Metadata provider not set");

        (
            uint256 eventId,
            string memory eventName,
            string memory venue,
            uint256 dateTime,
            bool used,
            bool listed,
            bool exists
        ) = ITicketMetadataProvider(metadataProvider).getTokenMetadataData(tokenId);

        require(exists, "Metadata not found");

        string memory dateLabel = _formatDateTime(dateTime);
        string memory status = used ? "USED" : (listed ? "LISTED" : "VALID");
        string memory image = _buildImage(
            tokenId,
            eventId,
            eventName,
            venue,
            dateLabel,
            status
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"', eventName, ' Ticket #', tokenId.toString(),
                        '","description":"NFT ticket for ', eventName,
                        ' at ', venue,
                        '. Event ID ', eventId.toString(),
                        '. Ownership, resale and used-status are enforced on-chain.",',
                        '"image":"', image, '",',
                        '"attributes":[',
                            '{"trait_type":"Event ID","value":"', eventId.toString(), '"},',
                            '{"trait_type":"Event","value":"', _escapeJson(eventName), '"},',
                            '{"trait_type":"Venue","value":"', _escapeJson(venue), '"},',
                            '{"trait_type":"Date","value":"', dateLabel, '"},',
                            '{"trait_type":"Used","value":"', used ? "Yes" : "No", '"},',
                            '{"trait_type":"Listed","value":"', listed ? "Yes" : "No", '"},',
                            '{"trait_type":"Status","value":"', status, '"}',
                        ']}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _buildImage(
        uint256 tokenId,
        uint256 eventId,
        string memory eventName,
        string memory venue,
        string memory dateLabel,
        string memory status
    ) internal pure returns (string memory) {
        string memory safeName = _escapeXml(eventName);
        string memory safeVenue = _escapeXml(venue);
        string memory safeDate = _escapeXml(dateLabel);

        string memory statusColor = keccak256(bytes(status)) == keccak256(bytes("USED"))
            ? "#ef4444"
            : keccak256(bytes(status)) == keccak256(bytes("LISTED"))
            ? "#f59e0b"
            : "#22c55e";

        string memory svg = string(
            abi.encodePacked(
                '<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#0f172a"/>',
                '<stop offset="100%" stop-color="#1e1b4b"/>',
                '</linearGradient>',
                '<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0%" stop-color="#1e293b"/>',
                '<stop offset="100%" stop-color="#111827"/>',
                '</linearGradient>',
                '</defs>',

                '<rect width="1200" height="1200" rx="48" fill="url(#bg)"/>',
                '<rect x="60" y="60" width="1080" height="1080" rx="36" fill="url(#panel)" stroke="#7c3aed" stroke-width="4"/>',

                '<text x="100" y="145" fill="#a78bfa" font-size="28" font-family="Arial, sans-serif" font-weight="700">NFT TICKETING DAPP</text>',

                '<text x="100" y="245" fill="#ffffff" font-size="56" font-family="Arial, sans-serif" font-weight="700">', safeName, '</text>',
                '<text x="100" y="305" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">', safeVenue, '</text>',
                '<text x="100" y="350" fill="#94a3b8" font-size="24" font-family="Arial, sans-serif">', safeDate, '</text>',

                '<rect x="100" y="405" width="1000" height="2" fill="#334155"/>',

                '<rect x="100" y="465" width="470" height="260" rx="24" fill="#0b1220" stroke="#334155"/>',
                '<text x="130" y="525" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">EVENT ID</text>',
                '<text x="130" y="605" fill="#ffffff" font-size="62" font-family="Arial, sans-serif" font-weight="700">', eventId.toString(), '</text>',

                '<rect x="630" y="465" width="470" height="260" rx="24" fill="#0b1220" stroke="#334155"/>',
                '<text x="660" y="525" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">TOKEN ID</text>',
                '<text x="660" y="605" fill="#ffffff" font-size="62" font-family="Arial, sans-serif" font-weight="700">#', tokenId.toString(), '</text>',

                '<rect x="100" y="785" width="1000" height="260" rx="24" fill="#0b1220" stroke="#334155"/>',
                '<text x="130" y="850" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">STATUS</text>',
                '<text x="130" y="940" fill="', statusColor, '" font-size="72" font-family="Arial, sans-serif" font-weight="700">', status, '</text>',

                '</svg>'
            )
        );

        return string(
            abi.encodePacked(
                "data:image/svg+xml;base64,",
                Base64.encode(bytes(svg))
            )
        );
    }

    function _formatDateTime(uint256 timestamp) internal pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = _daysToDate(timestamp / 86400);
        uint256 secsInDay = timestamp % 86400;
        uint256 hour = secsInDay / 3600;
        uint256 minute = (secsInDay % 3600) / 60;

        return string(
            abi.encodePacked(
                year.toString(), "-",
                _two(month), "-",
                _two(day), " / ",
                _two(hour), ":",
                _two(minute)
            )
        );
    }

    function _two(uint256 value) internal pure returns (string memory) {
        if (value < 10) {
            return string(abi.encodePacked("0", value.toString()));
        }
        return value.toString();
    }

    function _daysToDate(uint256 _days) internal pure returns (uint256 year, uint256 month, uint256 day) {
        int256 __days = int256(_days);

        int256 L = __days + 68569 + 2440588;
        int256 N = (4 * L) / 146097;
        L = L - (146097 * N + 3) / 4;
        int256 _year = (4000 * (L + 1)) / 1461001;
        L = L - (1461 * _year) / 4 + 31;
        int256 _month = (80 * L) / 2447;
        int256 _day = L - (2447 * _month) / 80;
        L = _month / 11;
        _month = _month + 2 - 12 * L;
        _year = 100 * (N - 49) + _year + L;

        year = uint256(_year);
        month = uint256(_month);
        day = uint256(_day);
    }

    function _escapeXml(string memory input) internal pure returns (string memory) {
        bytes memory data = bytes(input);
        bytes memory out = new bytes(data.length * 6);
        uint256 j = 0;

        for (uint256 i = 0; i < data.length; i++) {
            bytes1 c = data[i];
            if (c == "&") {
                out[j++] = "&"; out[j++] = "a"; out[j++] = "m"; out[j++] = "p"; out[j++] = ";";
            } else if (c == "<") {
                out[j++] = "&"; out[j++] = "l"; out[j++] = "t"; out[j++] = ";";
            } else if (c == ">") {
                out[j++] = "&"; out[j++] = "g"; out[j++] = "t"; out[j++] = ";";
            } else {
                out[j++] = c;
            }
        }

        bytes memory finalOut = new bytes(j);
        for (uint256 k = 0; k < j; k++) {
            finalOut[k] = out[k];
        }

        return string(finalOut);
    }

    function _escapeJson(string memory input) internal pure returns (string memory) {
        return input;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}