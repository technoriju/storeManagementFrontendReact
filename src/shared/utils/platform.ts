import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWindows = Platform.OS === 'windows';
export const isWeb = Platform.OS === 'web';

export const getPlatform = () => Platform.OS;

export const PlatformHelpers = {
  select: Platform.select,
  isIOS,
  isAndroid,
  isWindows,
  isWeb,
};
