import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number) => {
  const { width } = Dimensions.get('window');
  if (Platform.OS === 'web' || width >= 768) return size;
  return (width / guidelineBaseWidth) * size;
};

export const verticalScale = (size: number) => {
  const { height } = Dimensions.get('window');
  if (Platform.OS === 'web' || height >= 1024) return size;
  return (height / guidelineBaseHeight) * size;
};

export const moderateScale = (size: number, factor = 0.5) => {
  const { width } = Dimensions.get('window');
  if (Platform.OS === 'web' || width >= 768) return size;
  return size + (scale(size) - size) * factor;
};

export const normalizeFontSize = (size: number) => {
  const { width } = Dimensions.get('window');
  if (Platform.OS === 'web' || width >= 768) return size;
  const newSize = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
