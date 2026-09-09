const NetInfo = {
  fetch: async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: { isConnectionExpensive: false },
  }),
  addEventListener: (listener) => {
    // Call immediately to simulate initial connection
    listener({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: { isConnectionExpensive: false },
    });
    return () => {}; // return unsubscribe function
  },
  useNetInfo: () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: { isConnectionExpensive: false },
  }),
};

export default NetInfo;
export const useNetInfo = NetInfo.useNetInfo;
export const fetch = NetInfo.fetch;
export const addEventListener = NetInfo.addEventListener;
