const seventyTwoHours = 72 * 60 * 60;
const tenBNB = web3.utils.toWei('10');
const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");
const { NOT_THE_OWNER, NOT_ENOUGH_SUPPLY_LEFT } = require("./utils/errors");
const getCurrentTimestamp = require("./utils/get-current-timestamp");

contract("ZetaSaurio/common", async accounts => {
  let contract;

  beforeEach(async() => {
    contract = await ZetaSaurio.new();
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

  it("should not reserve beyond reserved supply", async () => {
    const account = accounts[0];
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const maxSupply = (await contract.maxSupply()).toNumber();
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    const reservedSupply = freeToMintSupply - discountedSupply;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    await expect(contract.reserve(account, maxSupply - reservedSupply + 1)).toThrow(NOT_ENOUGH_SUPPLY_LEFT);
  });

  it("should reserve correctly", async () => {
    const supplyBefore = await contract.totalSupply();
    await contract.reserve(accounts[0], 5);
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
      .toThrow(NOT_THE_OWNER);
  });

  it("should only allow owner to schedule presale", async () => {
    const now = getCurrentTimestamp();
    const seventyTwoHoursFromNow = now + seventyTwoHours;

    await expect(contract.schedulePresale(now, seventyTwoHoursFromNow, { from: accounts[1] }))
      .toThrow(NOT_THE_OWNER);
  });

  it("should only allow owner to schedule sale", async () => {
    const now = getCurrentTimestamp();

    await expect(contract.scheduleSale(now, { from: accounts[1] }))
      .toThrow(NOT_THE_OWNER);
  });

  it("should only allow owner to withdraw", async () => {
    await expect(contract.withdraw({ from: accounts[1] }))
      .toThrow(NOT_THE_OWNER);
  });

  it("should only allow owner to reserve", async () => {
    await expect(contract.reserve(accounts[1], 30, { from: accounts[1] })).toThrow(NOT_THE_OWNER);
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
});