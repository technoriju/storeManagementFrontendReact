import React, { useState } from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  PressableProps,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { moderateScale } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AppButton: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
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

  const getHeight = () => {
    if (size === 'small') return moderateScale(36);
    if (size === 'large') return moderateScale(56);
    return moderateScale(48); // medium
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
          borderColor: variant === 'outline' ? theme.colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
      {...(props as any)}
    >
      {({ pressed }) => (
        isLoading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.weights.medium as any,
                opacity: pressed && !isMouse ? 0.7 : 1, // Touch opacity feedback on mobile
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
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
