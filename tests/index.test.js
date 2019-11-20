jest.unmock('/src/index');

require('jasmine-expect');
const App = require('/src/app');
const app = require('/src/index');

describe('index', () => {
  it('should export an instanciated App', () => {
    // Given/When/Then
    expect(app).toBeInstanceOf(App);
    expect(App).toHaveBeenCalledTimes(1);
  });
});
