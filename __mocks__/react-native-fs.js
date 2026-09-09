export default {
  DocumentDirectoryPath: '/mock/DocumentDirectoryPath',
  CachesDirectoryPath: '/mock/CachesDirectoryPath',
  readFile: async () => 'mock file content',
  writeFile: async () => {},
  unlink: async () => {},
  exists: async () => false,
  mkdir: async () => {},
  downloadFile: () => ({ promise: Promise.resolve({ statusCode: 200 }) }),
};
