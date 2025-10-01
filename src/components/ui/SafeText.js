// src/components/ui/SafeText.js
// Veilige Text component die Chinese font fallback voorkomt

import React from 'react';
import { Text, Platform } from 'react-native';

const getSafeFontFamily = () => {
  return Platform.select({
    ios: 'System',
    android: 'sans-serif', // Gebruikt Roboto op Android, geen Chinese glyphs
    default: 'System'
  });
};

const SafeText = React.forwardRef(({ children, style, ...props }, ref) => {
  const safeStyle = [
    { fontFamily: getSafeFontFamily() },
    style
  ];
  
  return (
    <Text ref={ref} style={safeStyle} {...props}>
      {children}
    </Text>
  );
});

SafeText.displayName = 'SafeText';

export default SafeText;