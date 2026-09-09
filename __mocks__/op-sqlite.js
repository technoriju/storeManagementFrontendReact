export const open = (params) => {
  console.log('[Web Mock] op-sqlite open called with', params);
  return {
    execute: async (query, args) => {
      console.log('[Web Mock] op-sqlite execute:', query, args);
      return { rows: [] }; // Mock empty result
    },
    executeBatch: async () => {
      return { rowsAffected: 0 };
    },
    close: () => {},
    attach: () => {},
    detach: () => {},
  };
};
