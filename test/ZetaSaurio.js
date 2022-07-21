const timeMachine = require('ganache-time-traveler');
const expect = require("./expect");

const ZetaSaurio = artifacts.require("ZetaSaurio");

const december19Of2021 = 1639872000;
const tenBNB = web3.utils.toWei('10');
const notTheOwnerError = "Ownable: caller is not the owner";

contract("ZetaSaurio", async accounts => {
  let snapshotId;

  beforeEach(async() => {
    snapshotId = (await timeMachine.takeSnapshot())['result'];
  });

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("should be named ZetaSaurio", async () => {
    const contract = await ZetaSaurio.deployed();
    const name = await contract.name();

    assert.equal(name, "ZetaSaurio");
  });

  it("should have ZS by symbol", async () => {
    const contract = await ZetaSaurio.deployed();
    const symbol = await contract.symbol();

    assert.equal(symbol, "ZS");
  });

  it("should have presale start timestamp equals to 0", async () => {
    const contract = await ZetaSaurio.deployed();
    const presaleStartTimestamp = await contract.presaleStartTimestamp();

    assert.equal(presaleStartTimestamp, 0);
  });

  it("should have sale start timestamp equals to 0", async () => {
    const contract = await ZetaSaurio.deployed();
    const saleStartTimestamp = await contract.saleStartTimestamp();

    assert.equal(saleStartTimestamp, 0);
  });

  it("should have max supply limited to 9393", async () => {
    const contract = await ZetaSaurio.deployed();
    const maxSupply = await contract.maxSupply();

    assert.equal(maxSupply, 9393);
  });

  it("should have price equals to 0.2 BNB by default", async () => {
    const contract = await ZetaSaurio.deployed();
    const price = String(await contract.price());

    assert.equal(price, web3.utils.toWei('0.2'));
  });

  it("should have batch mint limited to 5", async () => {
    const contract = await ZetaSaurio.deployed();
    const batchMintLimit = await contract.batchMintLimit();

    assert.equal(batchMintLimit, 5);
  });

  it("should have presale mint per address limited to 3 ", async () => {
    const contract = await ZetaSaurio.deployed();
    const presaleMintPerAddressLimit = await contract.presaleMintPerAddressLimit();

    assert.equal(presaleMintPerAddressLimit, 3);
  });

  it("should have empty base URI by default", async () => {
    const contract = await ZetaSaurio.deployed();
    const baseURI = await contract.baseURI();

    assert.equal(baseURI, "");
  });

  it("should have presale inactive by default", async () => {
    const contract = await ZetaSaurio.deployed();
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("should have sale inactive by default", async () => {
    const contract = await ZetaSaurio.deployed();
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, false);
  });

  it("should change baseURI correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    const newBaseURI = "A brand new base uri";
    await contract.setBaseURI(newBaseURI);
    const baseURI = await contract.baseURI();

    assert.equal(baseURI, newBaseURI);
  });

  it("should schedule presale correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);

    const presaleStartTimestamp = await contract.presaleStartTimestamp();

    assert.equal(presaleStartTimestamp, december19Of2021);
  });

  it("should schedule sale correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);

    const saleStartTimestamp = await contract.saleStartTimestamp();

    assert.equal(saleStartTimestamp, december19Of2021);
  });

  /**
   * Time constraints
   */
  it("should activate sale just after sale starts", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, true);
  });

  it("shouldn't activate sale before the sale starts", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 - 1);
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, false);
  });

  it("should activate presale just after presale starts", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, true);
  });

  it("should activate presale just before presale ends", async () => {
    const contract = await ZetaSaurio.deployed();
    const presaleDuration = Number(await contract.presaleDuration());
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 + presaleDuration - 1);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, true);
  });

  it("shouldn't activate presale before the presale starts", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 - 1);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("shouldn't activate presale after the presale ends", async () => {
    const contract = await ZetaSaurio.deployed();
    const presaleDuration = Number(await contract.presaleDuration());
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 + presaleDuration);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("should reserve correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    const supplyBefore = await contract.totalSupply();
    await contract.reserve(5);
    const supplyAfter = await contract.totalSupply();

    assert.equal(supplyBefore.toNumber() + 5, supplyAfter.toNumber());
  });

  it("should withdraw correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(1);
    await contract.mint(1, {
      from: accounts[2],
      value: tenBNB,
    });
    
    const ownerBalanceBefore = BigInt(await web3.eth.getBalance(accounts[0]));
    const contractBalanceBefore = BigInt(await web3.eth.getBalance(contract.address));

    const receipt = await contract.withdraw();

    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = BigInt(tx.gasPrice);
    const gasUsed = BigInt(receipt.receipt.gasUsed);
    const gasFee = gasUsed * gasPrice;
    const ownerBalanceAfter = BigInt(await web3.eth.getBalance(accounts[0]));
    const contractBalanceAfter = BigInt(await web3.eth.getBalance(contract.address));
                               
    assert.equal(0n, contractBalanceAfter);
    assert.equal(ownerBalanceBefore + (contractBalanceBefore - contractBalanceAfter) - gasFee, ownerBalanceAfter);
  });

  /**
   * Permissions
   */
  it("should only allow owner to change baseURI", async () => {
    const contract = await ZetaSaurio.deployed();
    const newBaseURI = "A brand new base uri";

    await expect(contract.setBaseURI(newBaseURI, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to schedule presale", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.schedulePresale(december19Of2021, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to schedule sale", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.scheduleSale(december19Of2021, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to grant presale access", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.grantPresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to revoke presale access", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.revokePresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to withdraw", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.withdraw({ from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to reserve", async () => {
    const contract = await ZetaSaurio.deployed();

    await expect(contract.reserve(30, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  /**
   * Presale access management
   */
  it("shouldn't grant presale access by default", async () => {
    const contract = await ZetaSaurio.deployed();

    const account0hasPresaleAccess = await contract.hasPresaleAccess(accounts[0]);
    const account1hasPresaleAccess = await contract.hasPresaleAccess(accounts[1]);
    const account2hasPresaleAccess = await contract.hasPresaleAccess(accounts[2]);
    
    assert.equal(account0hasPresaleAccess, false);
    assert.equal(account1hasPresaleAccess, false);
    assert.equal(account2hasPresaleAccess, false);
  });

  it("should grant presale access correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.grantPresaleAccess([accounts[0], accounts[1], accounts[2]]);

    const account0hasPresaleAccess = await contract.hasPresaleAccess(accounts[0]);
    const account1hasPresaleAccess = await contract.hasPresaleAccess(accounts[1]);
    const account2hasPresaleAccess = await contract.hasPresaleAccess(accounts[2]);

    assert.equal(account0hasPresaleAccess, true);
    assert.equal(account1hasPresaleAccess, true);
    assert.equal(account2hasPresaleAccess, true);
  });

  it("should revoke presale access correctly", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.grantPresaleAccess([accounts[0], accounts[1], accounts[2]]);
    await contract.revokePresaleAccess([accounts[0], accounts[1], accounts[2]]);

    const account0hasPresaleAccess = await contract.hasPresaleAccess(accounts[0]);
    const account1hasPresaleAccess = await contract.hasPresaleAccess(accounts[1]);
    const account2hasPresaleAccess = await contract.hasPresaleAccess(accounts[2]);
    
    assert.equal(account0hasPresaleAccess, false);
    assert.equal(account1hasPresaleAccess, false);
    assert.equal(account2hasPresaleAccess, false);
  });

  it("should price 0.2 BNB on public sale", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 + 666);
    const price = await contract.price();

    assert.equal(price, web3.utils.toWei('0.2'));
  });

  it("should price 0.15 BNB on presale", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021 + 666);
    const price = await contract.price();

    assert.equal(price, web3.utils.toWei('0.15'));
  });

  /**
   * Minting
   */
  it("should not mint when sale is inactive", async () => {
    const contract = await ZetaSaurio.deployed();
    await expect(contract.mint(1)).toThrow("Sale is not active");
  });

  it("should not mint less than 1 NFT", async () => {
    const contract = await ZetaSaurio.deployed();
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    await contract.scheduleSale(december19Of2021);

    await expect(contract.mint(0)).toThrow("Must mint at least one NFT");
  });

  it("should not mint beyond maxSupply", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);
    const maxSupply = (await contract.maxSupply()).toNumber();
    await timeMachine.advanceBlockAndSetTime(december19Of2021);

    await expect(contract.mint(maxSupply + 1)).toThrow("Supply left is not enough");
  });

  it("should require to pay enough for minting", async () => {
    const contract = await ZetaSaurio.deployed();
    const price = await contract.price();
    const priceOf3 = BigInt(String(price)) * 3n;
    await contract.scheduleSale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);

    await expect(contract.mint(3, {
      from: accounts[1],
      value: String(priceOf3 - 1n)
    })).toThrow("Not enough funds to purchase");
  });

  it("should update mintedPerAddress correctly when minting", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.scheduleSale(december19Of2021);
    await contract.mint(3, { value: web3.utils.toWei('0.6')});
    const mintedPerAddress = await contract.mintedPerAddress(accounts[0]);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);

    assert.equal(mintedPerAddress.toNumber(), 3);
  });

  it("shouldn't allow to mint on presale if access haven't been granted", async () => {
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    const price = String(await contract.price());

    await expect(contract.mint(1, {
      value: price,
      from: accounts[1],
    })).toThrow("Presale access denied");
  });

  it("should allow to mint on presale if access have been granted", async () => {    
    const contract = await ZetaSaurio.deployed();
    await contract.schedulePresale(december19Of2021);
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    const price = String(await contract.price());

    await contract.grantPresaleAccess([accounts[1]]);
    await contract.mint(1, {
      value: price,
      from: accounts[1],
    });
    const ownerOfToken = await contract.ownerOf(1);

    assert.equal(ownerOfToken, accounts[1]);
  });

  it("shouldn't allow to mint on presale beyond presaleMintPerAddressLimit", async () => {
    const contract = await ZetaSaurio.deployed();
    await timeMachine.advanceBlockAndSetTime(december19Of2021);
    await contract.schedulePresale(december19Of2021);
    await contract.grantPresaleAccess([accounts[1]]);
    const presaleMintPerAddressLimit = BigInt(await contract.presaleMintPerAddressLimit());
    const price = BigInt(await contract.price());
    const batchPrice = String(presaleMintPerAddressLimit * price);

    await contract.mint(1, { from: accounts[1], value: String(price) });

    await expect(
      contract.mint(Number(presaleMintPerAddressLimit), {
        from: accounts[1],
        value: batchPrice,
      })
    ).toThrow("Not enough presale mintings left");
  });
});