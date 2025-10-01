// src/utils/fontFix.js
// Font fallback fix voor Chinese tekens in React Native Text components

import React from 'react';
import { Text, Platform } from 'react-native';

// Font families die geen Chinese fallback hebben
const SAFE_FONT_FAMILIES = {
  ios: 'System',
  android: 'sans-serif', // Standaard Android font, geen Chinese glyphs
  default: 'System'
};

// Icon fonts die we niet willen vervangen
const ICON_FONTS = [
  'Ionicons', 'FontAwesome', 'FontAwesome5', 'MaterialIcons', 
  'MaterialCommunityIcons', 'AntDesign', 'Entypo', 'EvilIcons',
  'Feather', 'Fontisto', 'Foundation', 'Octicons', 'Zocial',
  'SimpleLineIcons'
];

export const getSafeFontFamily = () => {
  return Platform.select(SAFE_FONT_FAMILIES);
};

// Check of een style icon fonts bevat
const containsIconFont = (style) => {
  if (!style) return false;
  const styleArray = Array.isArray(style) ? style : [style];
  return styleArray.some(s => 
    s && ICON_FONTS.some(iconFont => 
      s.fontFamily && s.fontFamily.includes(iconFont)
    )
  );
};

// Wrapper component die fontFamily toevoegt
export const SafeText = ({ children, style, ...props }) => {
  // Als de style icon fonts bevat, niet overschrijven
  if (containsIconFont(style)) {
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  }
  
  const safeStyle = [
    { fontFamily: getSafeFontFamily() },
    style
  ];
  
  return (
    <Text style={safeStyle} {...props}>
      {children}
    </Text>
  );
};

// Utility om bestaande Text components te patchen
export const patchTextComponent = () => {
  if (__DEV__) {
    console.log('🔧 Font fallback patch actief - Chinese tekens zouden moeten verdwijnen');
  }
  
  // Optioneel: override de standaard Text component
  // Dit is een tijdelijke fix voor de huidige build
  const OriginalText = Text;
  
  return React.forwardRef(({ style, ...props }, ref) => {
    // Als de style icon fonts bevat, niet overschrijven
    if (containsIconFont(style)) {
      return <OriginalText ref={ref} style={style} {...props} />;
    }
    
    const patchedStyle = [
      { fontFamily: getSafeFontFamily() },
      style
    ];
    
    return <OriginalText ref={ref} style={patchedStyle} {...props} />;
  });
};

export default {
  SafeText,
  getSafeFontFamily,
  patchTextComponent
};