const store = new Map();

module.exports = {
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  getItemAsync: jest.fn(async (key) => {
    return store.has(key) ? store.get(key) : null;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
};
