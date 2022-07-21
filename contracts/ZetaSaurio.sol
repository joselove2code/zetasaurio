// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
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
contract ZetaSaurio is ERC721Enumerable, Ownable {
    using Strings for uint256;

    address public manager;

    string public baseURI = "";

    uint256 public saleStartTimestamp;
    uint256 public presaleStartTimestamp;
    uint256 public constant maxSupply = 9393;
    uint256 public constant batchMintLimit = 5;
    uint256 public constant presaleMintPerAddressLimit = 3;
    uint256 public constant salePrice = 0.2 ether; // 0.2 BNB
    uint256 public constant presalePrice = 0.15 ether; // 0.15 BNB
    uint256 public constant presaleDuration = 259200; // 72 hours

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

    function schedulePresale(uint256 _presaleStartTimestamp) public onlyOwner {
        presaleStartTimestamp = _presaleStartTimestamp;
    }

    function scheduleSale(uint256 _saleStartTimestamp) public onlyOwner {
        saleStartTimestamp = _saleStartTimestamp;
    }

    function presaleIsActive() public view returns (bool) {
        return presaleStartTimestamp >= block.timestamp && block.timestamp < (presaleStartTimestamp + presaleDuration);
    }

    function saleIsActive() public view returns (bool) {
        return saleStartTimestamp != 0 && saleStartTimestamp <= block.timestamp;
    }

    function price() public view virtual returns (uint256) {
        return presaleIsActive() ? presalePrice : salePrice;
    }

    function enoughPresaleMintingsLeft(uint256 _mintAmount) public view returns (bool) {
        return mintedPerAddress[msg.sender] + _mintAmount < presaleMintPerAddressLimit;
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
        require(payable(msg.sender).send(address(this).balance));
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

    function mint(uint256 _mintAmount) public payable {
        uint256 supply = totalSupply();

        require(_mintAmount > 0, "Must mint at least one NFT");
        require(saleIsActive() || presaleIsActive(), "Sale is not active");
        require(supply + _mintAmount <= maxSupply, "Supply left is not enough");
        require(msg.value >= price() * _mintAmount, "Not enough funds to purchase");
        require(_mintAmount <= batchMintLimit, "Can't mint these many NFTs at once");

        if (presaleIsActive()) {
            require(hasPresaleAccess[msg.sender], "Presale access denied");
            require(enoughPresaleMintingsLeft(_mintAmount), "Not enough presale mintings left");
        }

        for (uint256 i = 1; i <= _mintAmount; i++) {
            mintedPerAddress[msg.sender]++;
            _safeMint(msg.sender, supply + i);
        }
    }
}
