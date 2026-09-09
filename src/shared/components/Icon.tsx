import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '../theme/theme';

export type IconName = 
  | 'home'
  | 'settings'
  | 'user'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-up'
  | 'layers'
  | 'git-merge'
  | 'send'
  | 'grid'
  | 'file-text'
  | 'corner-down-left'
  | 'file'
  | 'monitor'
  | 'tag'
  | 'gift'
  | 'percent'
  | 'log-out'
  | 'cube'
  | 'people'
  | 'business'
  | 'list'
  | 'cart'
  | 'menu'
  | 'dot';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const getIconComponent = (name: string) => {
  if (name === 'dot') return LucideIcons.Circle;
  
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
    
  return (LucideIcons as any)[pascalName] || LucideIcons.HelpCircle;
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color,
  style 
}) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.text;
  const LucideIcon = getIconComponent(name);

  return (
    <View style={style}>
      <LucideIcon size={size} color={iconColor} />
    </View>
  );
};
