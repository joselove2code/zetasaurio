const expect = require("./utils/expect");
const ZetaSaurio = artifacts.require("ZetaSaurio");
const notTheOwnerError = "Ownable: caller is not the owner";

contract("ZetaSaurio/presale-access", async accounts => {
  let contract;

  beforeEach(async() => {
    contract = await ZetaSaurio.new();
  });

  it("should only allow owner to grant presale access", async () => {
    await expect(contract.grantPresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

  it("should only allow owner to revoke presale access", async () => {
    await expect(contract.revokePresaleAccess([], { from: accounts[1] }))
      .toThrow(notTheOwnerError);
  });

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
});