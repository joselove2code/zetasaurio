const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");

const seventyTwoHours = 72 * 60 * 60;
const notTheOwnerError = "Ownable: caller is not the owner";
const partnershipAlreadyExistsError = "Partnership already exists";
const partnershipDoesNotExistError = "Partnership does not exist";
const getCurrentTimestamp = () => Math.floor(new Date().getTime() / 1000);

contract("ZetaSaurio/partnerships", async accounts => {
  let contract;

  beforeEach(async() => {
    contract = await ZetaSaurio.new();
  });

  it("should only allow owner to create partnerships", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;

    await expect(
      contract.createPartnership(
        partner,
        label,
        discountPercent,
        discountedSupply,
        freeToMintSupply,
        reservedUntilTimestamp,
        { from: accounts[1] }
      )
    ).toThrow(notTheOwnerError);
  });

  it("should only allow owner to delete partnerships", async () => {
    const partner = accounts[2];

    await expect(
      contract.deletePartnership(partner,{ from: accounts[1] })
    ).toThrow(notTheOwnerError);
  });

  it("partnership should not exist before creating it", async () => {
    const partner = accounts[2];
    const partnershipExists = await contract.partnershipExists(partner);

    assert.equal(false, partnershipExists);
  });

  it("partnership should exist after creating it", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );
    const partnershipExists = await contract.partnershipExists(partner);

    assert.equal(true, partnershipExists);
  });

  it("partnership supply should be reserve until reserved timestamp", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp();
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );
    const partnershipSupplyIsReserved = await contract.partnershipSupplyIsReserved(partner);

    assert.equal(true, partnershipSupplyIsReserved);
  });

  it("partnership supply should not be reserve beyond reserved timestamp", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() - 1;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );
    const partnershipSupplyIsReserved = await contract.partnershipSupplyIsReserved(partner);

    assert.equal(false, partnershipSupplyIsReserved);
  });

  it("partnership total supply should add up", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() - 1;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );
    const partnershipTotalSupply = await contract.partnershipTotalSupply(partner);

    assert.equal(150, partnershipTotalSupply);
  });

  it("should not allow to create duplicated partnership", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    await expect(
      contract.createPartnership(
        partner,
        label,
        discountPercent,
        discountedSupply,
        freeToMintSupply,
        reservedUntilTimestamp
      )
    ).toThrow(partnershipAlreadyExistsError);
  });

  it("should not allow to delete non-existent partnership", async () => {
    const partner = accounts[2];

    await expect(
      contract.deletePartnership(partner)
    ).toThrow(partnershipDoesNotExistError);
  });

  it("should create partnership correctly", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    const partner0 = await contract.partners(0);
    assert.equal(partner, partner0);

    const partnership = await contract.partnerships(partner);
    
    assert.equal(label, partnership.label);
    assert.equal(discountPercent, partnership.discountPercent);
    assert.equal(discountedSupply, partnership.discountedSupply);
    assert.equal(freeToMintSupply, partnership.freeToMintSupply);
    assert.equal(reservedUntilTimestamp, partnership.reservedUntilTimestamp);
  });

  it("should delete partnership correctly", async () => {
    const partner1 = accounts[1];
    const label1 = "BoredApeYachtClub";
    const discountPercent1 = 20;
    const discountedSupply1 = 100;
    const freeToMintSupply1 = 50;
    const reservedUntilTimestamp1 = getCurrentTimestamp() + seventyTwoHours;
    
    await contract.createPartnership(
      partner1,
      label1,
      discountPercent1,
      discountedSupply1,
      freeToMintSupply1,
      reservedUntilTimestamp1
    );

    const partner2 = accounts[2];
    const label2 = "ZetaSaurio";
    const discountPercent2 = 39;
    const discountedSupply2 = 39;
    const freeToMintSupply2 = 93;
    const reservedUntilTimestamp2 = getCurrentTimestamp() + seventyTwoHours;

    await contract.createPartnership(
      partner2,
      label2,
      discountPercent2,
      discountedSupply2,
      freeToMintSupply2,
      reservedUntilTimestamp2
    );

    await contract.deletePartnership(partner1);
    
    const partnership1Exists = await contract.partnershipExists(partner1);
    assert.equal(false, partnership1Exists);
    
    const partnership2Exists = await contract.partnershipExists(partner2);
    assert.equal(true, partnership2Exists);

    const partnersCount = await contract.partnersCount();
    assert.equal(1, partnersCount);

    const partners0 = await contract.partners(0);
    assert.equal(partner2, partners0);

    const partnership2 = await contract.partnerships(partner2);
    assert.equal(label2, partnership2.label);
  });
  
});