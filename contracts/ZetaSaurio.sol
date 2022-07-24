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

    address public manager;

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

    function schedulePresale(uint _presaleStartTimestamp, uint _presaleEndTimestamp   ) public onlyOwner {
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
        return presaleIsActive() ? presalePrice : salePrice;
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

    function withdraw() public payable onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }

    /**
     * Reserve zetas for the team and giveaways.
     */
    function reserve(uint256 _amount) public onlyOwner {
        uint256 supply = totalSupply();

        for (uint256 i = 1; i <= _amount; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function mint(address _user, uint256 _mintAmount) public payable nonReentrant {
        uint256 supply = totalSupply();

        require(saleIsActive() || presaleIsActive(), "Sale is not active");
        require(_mintAmount > 0, "Must mint at least one NFT");
        require(supply + _mintAmount <= maxSupply, "Supply left is not enough");
        require(msg.value >= _mintAmount * price(), "Not enough funds to purchase");
        require(_mintAmount <= batchMintLimit, "Can't mint these many NFTs at once");

        if (presaleIsActive()) {
            require(hasPresaleAccess[_user], "Presale access denied");
            require(enoughPresaleMintingsLeft(_user, _mintAmount), "Not enough presale mintings left");
        }

        mintedPerAddress[_user] = _mintAmount;
        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(_user, supply + i);
        }
    }
}
