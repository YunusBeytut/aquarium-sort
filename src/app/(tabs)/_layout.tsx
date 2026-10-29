import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Analytics } from '@/services/analytics';
import { useGameStore } from '@/store/gameStore';

type IconName = 'fish' | 'shop' | 'collection' | 'settings';

type IconProps = {
  name: IconName;
  color: ColorValue;
  size: number;
  focused: boolean;
};

const BAR_BG = '#0a3350';

function TabIcon({ name, color: colorProp, size, focused }: IconProps) {
  const color = typeof colorProp === 'string' ? colorProp : '#7fdbff';
  const fill = focused ? color : 'none';
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'fish' && (
        <>
          <Path d="M2 12C5 7 11 6 15 9L21 5V19L15 15C11 18 5 17 2 12Z" fill={fill} {...common} />
          <Circle cx={8} cy={11.5} r={1.1} fill={focused ? BAR_BG : color} />
        </>
      )}
      {name === 'shop' && (
        <>
          <Path d="M5 8H19L18 20H6L5 8Z" fill={fill} {...common} />
          <Path d="M9 8V6.5A3 3 0 0 1 15 6.5V8" fill="none" {...common} />
        </>
      )}
      {name === 'collection' && (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={1.8} fill={fill} {...common} />
          <Rect x={13} y={4} width={7} height={7} rx={1.8} fill={fill} {...common} />
          <Rect x={4} y={13} width={7} height={7} rx={1.8} fill={fill} {...common} />
          <Rect x={13} y={13} width={7} height={7} rx={1.8} fill={fill} {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Path d="M4 6H20M4 12H20M4 18H20" fill="none" {...common} />
          <Circle cx={8} cy={6} r={2.2} fill={focused ? color : BAR_BG} {...common} />
          <Circle cx={16} cy={12} r={2.2} fill={focused ? color : BAR_BG} {...common} />
          <Circle cx={10} cy={18} r={2.2} fill={focused ? color : BAR_BG} {...common} />
        </>
      )}
    </Svg>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const eggCount = useGameStore((s) => s.eggs.normal + s.eggs.rare);

  return (
    <Tabs
      // Sekme odaklanınca ekran adı Analytics'e gider (e.target: "shop-xxxx").
      screenListeners={{
        focus: (e) => Analytics.screen((e.target ?? 'tab').split('-')[0]),
      }}
      screenOptions={{
        headerShown: false,
        // Sekme geçişinde gri yerine oyun rengi; sekmeler önceden hazırlanır, geçişte yükleme beklenmez.
        sceneStyle: { backgroundColor: '#0b3d5c' },
        lazy: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: '#7fdbff',
        tabBarInactiveTintColor: '#7f9db3',
        tabBarStyle: {
          backgroundColor: BAR_BG,
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.aquarium'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="fish" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('tabs.shop'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="shop" color={color} size={size} focused={focused} />
          ),
          tabBarBadge: eggCount > 0 ? eggCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ffd54f', color: '#0b3d5c' },
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: t('tabs.collection'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="collection" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="settings" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}