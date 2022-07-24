const Zetasaurio = artifacts.require("ZetaSaurio");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Zetasaurio);
};
 