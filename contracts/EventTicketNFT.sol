// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EventTicketNFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string private _baseTokenURI;

    constructor() ERC721("EventTicket", "ETIX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // set minter
    function setMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    function setBaseURI(string calldata newBase)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
{
    _baseTokenURI = newBase;
}

    // mint ticket
    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
    }
    function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
}
function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory)
{
    _requireOwned(tokenId);

    string memory base = _baseURI();
    if (bytes(base).length == 0) return "";

    return string(
        abi.encodePacked(base, _toString(tokenId), ".json")
    );
}
function _toString(uint256 value)
    internal
    pure
    returns (string memory)
{
    if (value == 0) return "0";

    uint256 temp = value;
    uint256 digits;
    while (temp != 0) {
        digits++;
        temp /= 10;
    }

    bytes memory buffer = new bytes(digits);
    while (value != 0) {
        digits -= 1;
        buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
        value /= 10;
    }

    return string(buffer);
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