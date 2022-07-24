module.exports = promise => ({
  toThrow: async reason => {
    try {
      await promise;
    } catch (error) {
      const assertMessage = `Expected to throw "${reason}"" but threw "${error.reason}"" instead`;
      assert.equal(error.reason, reason, assertMessage);
      return;
    }

    assert.fail(`Expected to throw "${reason}" but didn't`);
  }
});