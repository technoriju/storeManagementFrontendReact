import { useWindowDimensions, Platform } from 'react-native';

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isMobile = width < breakpoints.tablet;
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;
  const isTouch = Platform.OS === 'ios' || Platform.OS === 'android';
  const isMouse = Platform.OS === 'windows' || Platform.OS === 'macos' || Platform.OS === 'web';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isMouse,
    windowWidth: width,
  };
}
