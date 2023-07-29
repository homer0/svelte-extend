jest.mock('@homer0/jimple');
jest.unmock('../src/index');

const App = require('../src/app');
const app = require('../src');

describe('index', () => {
  it('should export an instanciated App', () => {
    // Given/When/Then
    expect(app).toBeInstanceOf(App);
    expect(App).toHaveBeenCalledTimes(1);
  });
});
