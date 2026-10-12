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
  | 'dot'
  | 'layout'
  | 'box'
  | 'plus-square'
  | 'alert-circle'
  | 'trending-down'
  | 'columns'
  | 'triangle'
  | 'award'
  | 'maximize'
  | 'upload'
  | 'shopping-bag'
  | 'corner-up-left'
  | 'file-minus'
  | 'file-plus'
  | 'briefcase'
  | 'refresh-cw'
  | 'dollar-sign'
  | 'users'
  | 'user-plus'
  | 'archive'
  | 'pie-chart'
  | 'share-2'
  | 'shuffle'
  | 'user-check'
  | 'calendar'
  | 'bar-chart-2'
  | 'clock'
  | 'filter'
  | 'clipboard'
  | 'activity'
  | 'shield'
  | 'key'
  | 'trash-2'
  | 'truck'
  | 'x'
  | 'copy';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const ICON_ALIASES: Record<string, any> = {
  dot: (LucideIcons as any).Circle,
  home: (LucideIcons as any).Home || (LucideIcons as any).House,
  house: (LucideIcons as any).House || (LucideIcons as any).Home,
  cube: (LucideIcons as any).Box || (LucideIcons as any).Package,
  people: (LucideIcons as any).Users,
  business: (LucideIcons as any).Briefcase || (LucideIcons as any).Building2,
  cart: (LucideIcons as any).ShoppingCart,
};

const getIconComponent = (name: string) => {
  if (ICON_ALIASES[name]) return ICON_ALIASES[name];
  
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
    
  return (LucideIcons as any)[pascalName] || (LucideIcons as any).HelpCircle;
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


