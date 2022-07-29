const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");

const seventyTwoHours = 72 * 60 * 60;
const tenBNB = web3.utils.toWei('10');
const notTheOwnerError = "Ownable: caller is not the owner";
const getCurrentTimestamp = () => Math.floor(new Date().getTime() / 1000);

contract("ZetaSaurio", async accounts => {
  let contract;

  beforeEach(async() => {
    contract = await ZetaSaurio.new();
  });

  it("should be named ZetaSaurio", async () => {
    const name = await contract.name();

    assert.equal(name, "ZetaSaurio");
  });

  it("should have ZS by symbol", async () => {
    const symbol = await contract.symbol();

    assert.equal(symbol, "ZS");
  });

  it("should have presale end timestamp equals to 0 by default", async () => {
    const presaleEndTimestamp = await contract.presaleEndTimestamp();

    assert.equal(presaleEndTimestamp, 0);
  });

  it("should have presale start timestamp equals to 0 by default", async () => {
    const presaleStartTimestamp = await contract.presaleStartTimestamp();

    assert.equal(presaleStartTimestamp, 0);
  });

  it("should have sale start timestamp equals to 0 by default", async () => {
    const saleStartTimestamp = await contract.saleStartTimestamp();

    assert.equal(saleStartTimestamp, 0);
  });

  it("should have max supply limited to 9393", async () => {
    const maxSupply = await contract.maxSupply();

    assert.equal(maxSupply, 9393);
  });

  it("should have price equals to 0.2 BNB by default", async () => {
    const price = String(await contract.price());

    assert.equal(price, web3.utils.toWei('0.2'));
  });

  it("should have batch mint limited to 5", async () => {
    const batchMintLimit = await contract.batchMintLimit();

    assert.equal(batchMintLimit, 5);
  });

  it("should have presale mint per address limited to 3 ", async () => {
    const presaleMintPerAddressLimit = await contract.presaleMintPerAddressLimit();

    assert.equal(presaleMintPerAddressLimit, 3);
  });

  it("should have empty base URI by default", async () => {
    const baseURI = await contract.baseURI();

    assert.equal(baseURI, "");
  });

  it("should have presale inactive by default", async () => {
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("should have sale inactive by default", async () => {
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, false);
  });

  it("should change baseURI correctly", async () => {
    const newBaseURI = "A brand new base uri";
    await contract.setBaseURI(newBaseURI);
    const baseURI = await contract.baseURI();

    assert.equal(baseURI, newBaseURI);
  });

  it("should schedule presale correctly", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;

    await contract.schedulePresale(now, seventyTwoHoursFromNow);

    const presaleEndTimestamp = await contract.presaleEndTimestamp();
    const presaleStartTimestamp = await contract.presaleStartTimestamp();

    assert.equal(now, presaleStartTimestamp);
    assert.equal(seventyTwoHoursFromNow, presaleEndTimestamp);
  });

  it("should schedule sale correctly", async () => {
    const now = getCurrentTimestamp();

    await contract.scheduleSale(now);

    const saleStartTimestamp = await contract.saleStartTimestamp();

    assert.equal(saleStartTimestamp, now);
  });

  /**
   * Time constraints
   */
  it("should activate sale just after sale starts", async () => {
    const now = getCurrentTimestamp();

    await contract.scheduleSale(now);
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, true);
  });

  it("shouldn't activate sale before the sale starts", async () => {
    const oneSecondFromNow = getCurrentTimestamp() + 1;

    await contract.scheduleSale(oneSecondFromNow);
    const saleIsActive = await contract.saleIsActive();

    assert.equal(saleIsActive, false);
  });

  it("should activate presale just after presale starts", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;
    
    await contract.schedulePresale(now, seventyTwoHoursFromNow);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, true);
  });

  it("should activate presale just before presale ends", async () => {
    const now = getCurrentTimestamp();
    const oneSecondFromNow = now + 1;
    const seventyTwoHoursAgo = now - seventyTwoHours;

    await contract.schedulePresale(seventyTwoHoursAgo, oneSecondFromNow);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, true);
  });

  it("shouldn't activate presale before the presale starts", async () => {
    const now = getCurrentTimestamp();
    const oneSecondFromNow = now + 1;
    const seventyTwoHoursAndOneSecondFromNow = oneSecondFromNow + seventyTwoHours;

    await contract.schedulePresale(oneSecondFromNow, seventyTwoHoursAndOneSecondFromNow);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("shouldn't activate presale after the presale ends", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursAgo = now - seventyTwoHours;

    await contract.schedulePresale(seventyTwoHoursAgo, now);
    const presaleIsActive = await contract.presaleIsActive();

    assert.equal(presaleIsActive, false);
  });

  it("should reserve correctly", async () => {
    const supplyBefore = await contract.totalSupply();
    await contract.reserve(5);
    const supplyAfter = await contract.totalSupply();

    assert.equal(supplyBefore.toNumber() + 5, supplyAfter.toNumber());
  });

  it("should withdraw correctly", async () => {
    const now = getCurrentTimestamp();
    const account = accounts[2];

    await contract.scheduleSale(now);
    await contract.mint(account, 1, {
      from: account,
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
    const newBaseURI = "A brand new base uri";

    await expect(contract.setBaseURI(newBaseURI, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to schedule presale", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;

    await expect(contract.schedulePresale(now, seventyTwoHoursFromNow, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to schedule sale", async () => {
    const now = getCurrentTimestamp();

    await expect(contract.scheduleSale(now, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to grant presale access", async () => {
    await expect(contract.grantPresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to revoke presale access", async () => {
    await expect(contract.revokePresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to withdraw", async () => {
    await expect(contract.withdraw({ from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to reserve", async () => {
    await expect(contract.reserve(30, { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  /**
   * Presale access management
   */
  it("shouldn't grant presale access by default", async () => {
    const account0hasPresaleAccess = await contract.hasPresaleAccess(accounts[0]);
    const account1hasPresaleAccess = await contract.hasPresaleAccess(accounts[1]);
    const account2hasPresaleAccess = await contract.hasPresaleAccess(accounts[2]);
    
    assert.equal(account0hasPresaleAccess, false);
    assert.equal(account1hasPresaleAccess, false);
    assert.equal(account2hasPresaleAccess, false);
  });

  it("should grant presale access correctly", async () => {
    await contract.grantPresaleAccess([accounts[0], accounts[1], accounts[2]]);

    const account0hasPresaleAccess = await contract.hasPresaleAccess(accounts[0]);
    const account1hasPresaleAccess = await contract.hasPresaleAccess(accounts[1]);
    const account2hasPresaleAccess = await contract.hasPresaleAccess(accounts[2]);

    assert.equal(account0hasPresaleAccess, true);
    assert.equal(account1hasPresaleAccess, true);
    assert.equal(account2hasPresaleAccess, true);
  });

  it("should revoke presale access correctly", async () => {
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
    const now = getCurrentTimestamp();

    await contract.scheduleSale(now);
    const price = await contract.price();

    assert.equal(price, web3.utils.toWei('0.2'));
  });

  it("should price 0.15 BNB on presale", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;
    
    await contract.schedulePresale(now, seventyTwoHoursFromNow);
    const price = await contract.price();

    assert.equal(price, web3.utils.toWei('0.15'));
  });

  /**
   * Minting
   */
  it("should not mint when sale is inactive", async () => {
    const account = accounts[2];

    await expect(contract.mint(account, 1)).toThrow("Sale is not active");
  });

  it("should not mint less than 1 NFT", async () => {
    const now = getCurrentTimestamp();
    const account = accounts[2];

    await contract.scheduleSale(now);

    await expect(contract.mint(account, 0)).toThrow("Must mint at least one NFT");
  });

  it("should not mint beyond maxSupply", async () => {
    const now = getCurrentTimestamp();
    const account = accounts[2];
    const maxSupply = (await contract.maxSupply()).toNumber();

    await contract.scheduleSale(now);

    await expect(contract.mint(account, maxSupply + 1)).toThrow("Supply left is not enough");
  });

  it("should require to pay enough for minting", async () => {
    const now = getCurrentTimestamp();
    const price = await contract.price();
    const priceOf3 = BigInt(String(price)) * 3n;
    const account = accounts[1];

    await contract.scheduleSale(now);

    await expect(contract.mint(account, 3, {
      from: account,
      value: String(priceOf3 - 1n)
    })).toThrow("Not enough funds to purchase");
  });

  it("should update mintedPerAddress correctly when minting", async () => {
    const now = getCurrentTimestamp();
    const account = accounts[2];

    await contract.scheduleSale(now);
    await contract.mint(account, 2, { value: web3.utils.toWei('0.4')});
    let mintedPerAddress = await contract.mintedPerAddress(account);

    assert.equal(mintedPerAddress.toNumber(), 2);

    await contract.mint(account, 2, { value: web3.utils.toWei('0.4')});
    mintedPerAddress = await contract.mintedPerAddress(account);

    assert.equal(mintedPerAddress.toNumber(), 4);
  });

  it("shouldn't allow to mint on presale if access haven't been granted", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;
    const account = accounts[1];

    await contract.schedulePresale(now, seventyTwoHoursFromNow);
    const price = String(await contract.price());

    await expect(contract.mint(account, 1, {
      value: price,
      from: account,
    })).toThrow("Presale access denied");
  });

  it("should allow to mint on presale if access have been granted", async () => {    
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;
    const account = accounts[1];

    await contract.schedulePresale(now, seventyTwoHoursFromNow);
    await contract.grantPresaleAccess([account]);
    
    const price = String(await contract.price());
    await contract.mint(account, 1, {
      value: price,
      from: account,
    });
    const ownerOfToken = await contract.ownerOf(1);

    assert.equal(ownerOfToken, account);
  });

  it("shouldn't allow to mint on presale beyond presaleMintPerAddressLimit", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;
    const presaleMintPerAddressLimit = BigInt(await contract.presaleMintPerAddressLimit());
    const account = accounts[1];

    await contract.schedulePresale(now, seventyTwoHoursFromNow);
    await contract.grantPresaleAccess([accounts[1]]);
    
    const price = BigInt(await contract.price());
    const batchPrice = String(presaleMintPerAddressLimit * price);

    await contract.mint(account, 1, { from: accounts[1], value: String(price) });
    await expect(
      contract.mint(account, Number(presaleMintPerAddressLimit), {
        from: account,
        value: batchPrice,
      })
    ).toThrow("Not enough presale mintings left");
  });
});