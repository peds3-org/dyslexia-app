import React from 'react';
import { Stack } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';

export default function BeginnerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerLeft: () => <DrawerToggleButton tintColor='#fff' />,
      }}>
      <Stack.Screen
        name='index'
        options={{
          headerShown: true,
          headerTitle: 'きょうの れんしゅう',
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTitleStyle: {
            fontFamily: 'font-mplus-bold',
            fontSize: 18,
            color: '#fff',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
          },
        }}
      />
      <Stack.Screen
        name='game'
        options={{
          headerShown: false,
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name='home'
        options={{
          headerShown: false,
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name='story'
        options={{
          headerShown: false,
          headerTitle: '',
        }}
      />
    </Stack>
  );
}
