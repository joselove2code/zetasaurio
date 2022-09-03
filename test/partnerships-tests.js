const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");
const getCurrentTimestamp = require("./utils/get-current-timestamp");
const {
  NOT_THE_OWNER,
  NOT_ENOUGH_FUNDS,
  FREE_MINT_ACCESS_DENIED,
  DISCOUNTED_MINT_ACCESS_DENIED,
  NOT_ENOUGH_FREE_MINTS_LEFT,
  NOT_ENOUGH_SUPPLY_LEFT,
  NOT_ENOUGH_PARTNER_MINTS_LEFT,
  PARTNERSHIP_ALREADY_EXISTS,
  PARTNERSHIP_DOES_NOT_EXISTS,
} = require("./utils/errors");

const seventyTwoHours = 72 * 60 * 60;

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
    ).toThrow(NOT_THE_OWNER);
  });

  it("should only allow owner to delete partnerships", async () => {
    const partner = accounts[2];

    await expect(
      contract.deletePartnership(partner,{ from: accounts[1] })
    ).toThrow(NOT_THE_OWNER);
  });

  it("should not allow non partners to free mint", async () => {
    const account = accounts[0];

    await expect(contract.freeMint(account, 3)).toThrow(FREE_MINT_ACCESS_DENIED);
  });

  it("should not allow non partners access discounted mint", async () => {
    const account = accounts[0];

    await expect(contract.mintAsPartner(account, 3)).toThrow(DISCOUNTED_MINT_ACCESS_DENIED);
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

  it("partnership supply should be reserved until reserved timestamp", async () => {
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

  it("partnership supply should not be reserved beyond reserved timestamp", async () => {
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

  it("partnership total supply should add up correctly before reserved timestamp", async () => {
    const partner = accounts[2];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + 1;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );
    const partnershipTotalSupply = await contract.partnershipReservedSupply(partner);

    assert.equal(150, partnershipTotalSupply);
  });

  it("partnership total supply should add up correctly after reserved timestamp", async () => {
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
    const partnershipTotalSupply = await contract.partnershipReservedSupply(partner);

    assert.equal(0, partnershipTotalSupply);
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
    ).toThrow(PARTNERSHIP_ALREADY_EXISTS);
  });

  it("should not allow to delete non-existent partnership", async () => {
    const partner = accounts[2];

    await expect(
      contract.deletePartnership(partner)
    ).toThrow(PARTNERSHIP_DOES_NOT_EXISTS);
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

  it("should not allow to free mint beyond supply", async () => {
    const partner = accounts[0];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    const maxSupply = await contract.maxSupply();
    const supplyLeftPlusOne = maxSupply - discountedSupply + 1;
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    await expect(contract.freeMint(partner, supplyLeftPlusOne)).toThrow(NOT_ENOUGH_SUPPLY_LEFT);
  });

  it("should not allow to free mint beyond free mint supply", async () => {
    const partner = accounts[0];
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

    await expect(contract.freeMint(partner, freeToMintSupply + 1)).toThrow(NOT_ENOUGH_FREE_MINTS_LEFT);
  });

  it("should allow to free mint beyond reserved supply after reserved timestamp", async () => {
    const partner = accounts[0];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 100;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() - 1;
    const maxSupply = await contract.maxSupply();
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    await expect(contract.freeMint(partner, maxSupply)).toThrow(NOT_ENOUGH_FREE_MINTS_LEFT);
  });

  it("should decrement free mint supply correctly", async () => {
    const partner = accounts[0];
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

    await contract.freeMint(partner, 20);
    const partnership = await contract.partnerships(partner);

    assert.equal(30, partnership.freeToMintSupply);
  });

  it("should not allow partners to mint beyond their discounted supply", async () => {
    const partner = accounts[0];
    const label = "BoredApeYachtClub";
    const discountPercent = 20;
    const discountedSupply = 4;
    const freeToMintSupply = 50;
    const reservedUntilTimestamp = getCurrentTimestamp() + seventyTwoHours;
    const saleTimestamp = getCurrentTimestamp() - 1;

    await contract.scheduleSale(saleTimestamp);
    
    await contract.createPartnership(
      partner,
      label,
      discountPercent,
      discountedSupply,
      freeToMintSupply,
      reservedUntilTimestamp
    );

    await expect(
      contract.mintAsPartner(partner, discountedSupply + 1, { value: web3.utils.toWei('1') })
    ).toThrow(NOT_ENOUGH_PARTNER_MINTS_LEFT);
  });

  it("should pay enough for discounted mint", async () => {
    const now = getCurrentTimestamp();
    const partner = accounts[0];
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

    await contract.scheduleSale(now);
    const price = await contract.price();
    const priceOf3Minus1 = 3 * price - web3.utils.toWei('0.01');

    await expect(
      contract.mintAsPartner(partner, 3, { value: priceOf3Minus1 })
    ).toThrow(NOT_ENOUGH_FUNDS);
  });

  it("should decrement discounted mint supply correctly", async () => {
    const now = getCurrentTimestamp();
    const partner = accounts[0];
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

    await contract.scheduleSale(now);
    const price = await contract.price();
    const priceOf3 = 3 * price;

    await contract.mintAsPartner(partner, 3, { value: priceOf3 });
    const partnership = await contract.partnerships(partner);

    assert.equal(97, partnership.discountedSupply);
  });
  
});