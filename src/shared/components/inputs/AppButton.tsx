import React, { useState } from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  PressableProps,
  ViewStyle,
  TextStyle,
  Platform,
  StyleProp
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { moderateScale } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppButton: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  ...props
}) => {
  const theme = useTheme();
  const { isMouse } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);

  const getBackgroundColor = (pressed: boolean, hovered: boolean) => {
    if (disabled) return theme.colors.textDisabled;
    
    let baseColor = theme.colors.primary;
    if (variant === 'secondary') baseColor = theme.colors.secondary;
    if (variant === 'outline' || variant === 'text') baseColor = theme.colors.transparent;

    // Apply interaction feedback
    if (pressed) {
      if (variant === 'outline' || variant === 'text') return theme.colors.primary + '1A'; // 10% opacity
      return baseColor + 'CC'; // 80% opacity
    }
    
    if (hovered && isMouse) {
      if (variant === 'outline' || variant === 'text') return theme.colors.primary + '0D'; // 5% opacity
      return baseColor + 'E6'; // 90% opacity
    }

    return baseColor;
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textSecondary;
    if (variant === 'outline' || variant === 'text') {
      return variant === 'outline' ? theme.colors.primary : theme.colors.text;
    }
    return theme.colors.background; // Usually white for filled buttons
  };

  const isDesktopEnv = isMouse || Platform.OS === 'web';

  const getHeight = () => {
    if (isDesktopEnv) {
      if (size === 'small') return 30;
      if (size === 'large') return 42;
      return 36; // medium desktop
    }
    if (size === 'small') return moderateScale(32);
    if (size === 'large') return moderateScale(48);
    return moderateScale(40); // medium
  };

  const getFontSize = () => {
    if (isDesktopEnv) {
      if (size === 'small') return 12;
      if (size === 'large') return 14;
      return 13;
    }
    if (size === 'small') return 13;
    if (size === 'large') return 16;
    return 14;
  };

  const getPaddingHorizontal = () => {
    if (isDesktopEnv) {
      if (size === 'small') return 10;
      if (size === 'large') return 18;
      return 14;
    }
    return 16;
  };

  // onHoverIn and onHoverOut are supported by react-native-web and react-native-windows
  return (
    <Pressable
      disabled={disabled || isLoading}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed, isHovered),
          height: getHeight(),
          paddingHorizontal: getPaddingHorizontal(),
          borderColor: variant === 'outline' ? theme.colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
      {...(props as any)}
    >
      {({ pressed }) => (
        isLoading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <>
            {icon && iconPosition === 'left' ? <>{icon}</> : null}
            <Text
              style={[
                styles.text,
                {
                  color: getTextColor(),
                  fontSize: getFontSize(),
                  fontWeight: theme.typography.weights.medium as any,
                  opacity: pressed && !isMouse ? 0.7 : 1, // Touch opacity feedback on mobile
                  marginLeft: icon && iconPosition === 'left' ? 6 : 0,
                  marginRight: icon && iconPosition === 'right' ? 6 : 0,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' ? <>{icon}</> : null}
          </>
        )
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
  },
});


