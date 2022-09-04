const ZetaSaurio = artifacts.require("ZetaSaurio");

contract("ZetaSaurio/defaults", async accounts => {
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
});