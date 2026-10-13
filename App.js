import React, { useCallback, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5, Octicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

import HomeScreen from './screens/HomeScreen';
import ColorsScreen from './screens/ColorsScreen';
import AnimationsScreen from './screens/AnimationsScreen';
import InteractionsScreen from './screens/InteractionsScreen';
import FadeScreen from './components/FadeScreen';

import { LedProvider } from './context/LedContext';
import ActiveStatusBar from './components/ActiveStatusBar';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LedProvider>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <Tab.Navigator
            sceneContainerStyle={{ backgroundColor: '#050505' }}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#101010ff',
                borderTopColor: 'rgba(255,255,255,0.08)',
                borderTopWidth: 1,
                height: 120,
                paddingBottom: 15,
                paddingTop: 5,
                elevation: 0,
                shadowOpacity: 0,
              },
              tabBarLabelStyle: {
                fontFamily: 'Outfit-Regular',
                fontSize: 11,
              },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Ana Sayfa') {
                  return <Octicons name="home-fill" size={20} color={color} />;
                } else if (route.name === 'Renkler') {
                  return <FontAwesome5 name="palette" size={18} color={color} />;
                } else if (route.name === 'Animasyonlar') {
                  return <FontAwesome5 name="magic" size={18} color={color} />;
                } else if (route.name === 'Etkileşim') {
                  return <Octicons name="zap" size={20} color={color} />;
                }

                return null;
              },
              tabBarActiveTintColor: '#2bee79',
              tabBarInactiveTintColor: 'rgba(106, 106, 106, 0.84)',
            })}
          >
            <Tab.Screen name="Ana Sayfa" children={() => <FadeScreen><HomeScreen /></FadeScreen>} />
            <Tab.Screen name="Renkler" children={() => <FadeScreen><ColorsScreen /></FadeScreen>} />
            <Tab.Screen name="Animasyonlar" children={() => <FadeScreen><AnimationsScreen /></FadeScreen>} />
            <Tab.Screen name="Etkileşim" children={() => <FadeScreen><InteractionsScreen /></FadeScreen>} />
          </Tab.Navigator>
          <ActiveStatusBar />
        </View>
      </NavigationContainer>
    </LedProvider>
  );
}

import { View } from 'react-native';
