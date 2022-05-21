module.exports.createProxyMocksDictionary = () =>
  new Proxy(
    {},
    {
      mocks: {},
      mockClear() {
        Object.keys(this.mocks).forEach((fnName) => {
          this.mocks[fnName].mockClear();
        });
      },
      get(target, name) {
        let result;
        if (this[name]) {
          result = this[name];
        } else {
          if (!this.mocks[name]) {
            this.mocks[name] = jest.fn();
          }

          result = this.mocks[name];
        }

        return result;
      },
    },
  );
