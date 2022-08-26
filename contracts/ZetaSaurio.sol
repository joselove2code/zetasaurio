// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/*
      .".".".
    (`       `)               _.-=-.
     '._.--.-;             .-`  -'  '.
    .-'`.o )  \           /  .-_.--'  `\
   `;---) \    ;         /  / ;' _-_.-' `
     `;"`  ;    \        ; .  .'   _-' \
      (    )    |        |  / .-.-'    -`
       '-.-'     \       | .' ` '.-'-\`
        /_./\_.|\_\      ;  ' .'-'.-.
        /         '-._    \` /  _;-,
       |         .-=-.;-._ \  -'-,
       \        /      `";`-`,-"`)
        \       \     '-- `\.\
         '.      '._ '-- '--'/
           `-._     `'----'`;
               `"""--.____,/
                      \\  \
                      // /`
                  ___// /__
                (`(`(---"-`)
*/
contract ZetaSaurio is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    struct Partnership {
        // The human-readable identifier of the partnership
        string label;
        // The discount percent given to the partner
        uint256 discountPercent;
        // The amount of discounted tokens given to the partner
        uint256 discountedSupply;
        // The amount of free to mint tokens given to the partner
        uint256 freeToMintSupply;
        // The timestamp until which the supply will be reserved
        uint reservedUntilTimestamp;
        // Just a marker to know if a patnership exists
        bool exists;
    }

    address[] partners;
    string public baseURI = "";
    uint public saleStartTimestamp;
    uint public presaleEndTimestamp;
    uint public presaleStartTimestamp;
    uint256 public constant maxSupply = 9393;
    uint256 public constant batchMintLimit = 5;
    uint256 public constant presaleMintPerAddressLimit = 3;
    uint256 public constant salePrice = 0.2 ether; // 0.2 BNB
    uint256 public constant presalePrice = 0.15 ether; // 0.15 BNB
    mapping(address => bool) public hasPresaleAccess;
    mapping(address => uint256) public mintedPerAddress;
    mapping(address => Partnership) public partnerships;

    constructor() ERC721("ZetaSaurio", "ZS") {}

    /**
     * @dev Base URI for computing {tokenURI} in {ERC721} parent contract.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function partnershipExists(address _partner) public view returns (bool) {
        return partnerships[_partner].exists;
    }

    function partnershipSupplyIsReserved(address _partner) public view returns (bool) {
        return partnerships[_partner].reservedUntilTimestamp >= block.timestamp;
    }

    function partnershipTotalSupply(address _partner) public view returns (uint256) {
        return partnerships[_partner].discountedSupply + partnerships[_partner].freeToMintSupply;
    }

    function createPartnership(
        address _partner,
        string memory _label,
        uint256 _discountPercent,
        uint256 _discountedSupply,
        uint256 _freeToMintSupply,
        uint _reservedUntilTimestamp
    ) public onlyOwner {
        require(!partnershipExists(_partner), "Partnership already exists");
        
        partners.push(_partner);

        partnerships[_partner] = Partnership(
            _label,
            _discountPercent,
            _discountedSupply,
            _freeToMintSupply,
            _reservedUntilTimestamp,
            true
        );
    }

    function deletePartnership(address _partner) public onlyOwner {        
        require(partnershipExists(_partner), "Partnership does not exist");

        partnerships[_partner].exists = false;

        for (uint256 index = 0; index < partners.length; index++) {
            if (partners[index] == _partner) {
                partners[index] = partners[partners.length - 1];
                partners.pop();
                break;
            }
        }
    }

    function schedulePresale(uint _presaleStartTimestamp, uint _presaleEndTimestamp) public onlyOwner {
        presaleEndTimestamp = _presaleEndTimestamp;
        presaleStartTimestamp = _presaleStartTimestamp;
    }

    function scheduleSale(uint _saleStartTimestamp) public onlyOwner {
        saleStartTimestamp = _saleStartTimestamp;
    }

    function presaleIsActive() public view returns (bool) {
        return presaleStartTimestamp <= block.timestamp && block.timestamp < presaleEndTimestamp;
    }

    function saleIsActive() public view returns (bool) {
        return saleStartTimestamp != 0 && saleStartTimestamp <= block.timestamp;
    }

    function price() public view virtual returns (uint256) {
        uint256 currentPrice = presaleIsActive() ? presalePrice : salePrice;

        if (partnershipExists(msg.sender)) {
            return currentPrice * partnerships[msg.sender].discountPercent / 100;
        }

        return currentPrice;
    }

    function reservedSupply() public view virtual returns (uint256) {
        uint256 supply = 0;

        for (uint256 i = 0; i < partners.length; i++) {
            if(partnershipSupplyIsReserved(partners[i])) {
                supply += partnershipTotalSupply(partners[i]);
            }
        }

        return supply;
    }

    function enoughPresaleMintingsLeft(address _user, uint256 _mintAmount) public view returns (bool) {
        return mintedPerAddress[_user] + _mintAmount <= presaleMintPerAddressLimit;
    }

    function grantPresaleAccess(address[] calldata _users) public onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            hasPresaleAccess[_users[i]] = true;
        }
    }

    function revokePresaleAccess(address[] calldata _users) public onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            hasPresaleAccess[_users[i]] = false;
        }
    }

    function validateSale(uint256 _mintAmount) internal view {
        require(saleIsActive() || presaleIsActive(), "Sale is not active");
        require(_mintAmount > 0, "Must mint at least one NFT");
        require(totalSupply() + reservedSupply() + _mintAmount <= maxSupply, "Supply left is not enough");
        require(msg.value >= _mintAmount * price(), "Not enough funds to purchase");        
    }

    function validatePresale(address _user, uint256 _mintAmount) internal view {
        if (presaleIsActive()) {
            require(hasPresaleAccess[_user], "Presale access denied");
            require(enoughPresaleMintingsLeft(_user, _mintAmount), "Not enough presale mintings left");
        }
    }

    function validateAndUpdatePartnership(uint256 _mintAmount) internal {
        if (partnershipExists(msg.sender)) {
            require(partnerships[msg.sender].discountedSupply >= _mintAmount, "Not enough partner mints left");
            partnerships[msg.sender].discountedSupply -= _mintAmount;
        }
    }

    function mintMany(address _user, uint256 _mintAmount) internal {
        uint256 supply = totalSupply();
        mintedPerAddress[_user] += _mintAmount;

        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(_user, supply + i);
        }
    }

    function mint(address _user, uint256 _mintAmount) public payable nonReentrant {
        validateSale(_mintAmount);
        validatePresale(_user, _mintAmount);
        validateAndUpdatePartnership(_mintAmount);

        mintMany(_user, _mintAmount);
    }

    function validateAndUpdateFreeMint(uint256 _mintAmount) internal {
        require(partnershipExists(msg.sender), "Only partners have access to free mints");        
        require(totalSupply() + _mintAmount + reservedSupply() <= maxSupply, "Supply left is not enough");
        require(partnerships[msg.sender].freeToMintSupply > _mintAmount, "Not enough partner free mints left");

        partnerships[msg.sender].freeToMintSupply -= _mintAmount;
    }

    function freeMint(address _user, uint256 _mintAmount) public payable nonReentrant {
        validateAndUpdateFreeMint(_mintAmount);

        mintMany(_user, _mintAmount);
    }

    function reserve(address _user, uint256 _mintAmount) public onlyOwner {
        require(totalSupply() + _mintAmount + reservedSupply() <= maxSupply, "Supply left is not enough");

        mintMany(_user, _mintAmount);
    }

    function withdraw() public payable onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "Failed to withdraw");
    }
}
