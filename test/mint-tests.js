const seventyTwoHours = 72 * 60 * 60;
const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");
const getCurrentTimestamp = () => Math.floor(new Date().getTime() / 1000);

contract("ZetaSaurio/mint", async accounts => {
  let contract;

  beforeEach(async() => {
    contract = await ZetaSaurio.new();
  });

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