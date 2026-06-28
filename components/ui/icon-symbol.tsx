// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'edit',
  'calendar': 'calendar-today',
  'books.vertical.fill': 'menu-book',
  'clock.fill': 'history',
  'chart.bar.fill': 'bar-chart',
  'person.fill': 'person',
  'heart.fill': 'favorite',
  'info.circle': 'info-outline',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',
  'doc.text.fill': 'description',
  'arrow.down.doc.fill': 'file-download',
  'lock.shield.fill': 'privacy-tip',
  'trash.fill': 'delete',
  'square.and.arrow.up.fill': 'ios-share',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
