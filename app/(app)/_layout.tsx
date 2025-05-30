import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService from '@src/services/authService';

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const user = authService.getUser();

  const handleLogout = async () => {
    await authService.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Image source={require('../../assets/ninja/beginner/normal.png')} style={styles.profileImage} />
        <Text style={styles.userName}>{user?.display_name || 'にんじゃ'}</Text>
      </View>

      <DrawerItem
        label='タイトルへもどる'
        icon={({ color, size }) => <MaterialCommunityIcons name='home' color={color} size={size} />}
        onPress={() => {
          // ルートのindex.tsxに直接遷移
          // Expoのファイルベースルーティングでは、
          // グループ外への遷移は相対パスで指定する必要がある
          router.push('../');
        }}
      />

      <DrawerItem
        label='しんちょく'
        icon={({ color, size }) => <MaterialCommunityIcons name='chart-line' color={color} size={size} />}
        onPress={() => router.push('/(app)/progress')}
      />

      <DrawerItem
        label='ことばのずかん'
        icon={({ color, size }) => <MaterialCommunityIcons name='book-open' color={color} size={size} />}
        onPress={() => router.push('/(app)/dictionary')}
      />

      <DrawerItem
        label='おんせいれんしゅう'
        icon={({ color, size }) => <MaterialCommunityIcons name='microphone' color={color} size={size} />}
        onPress={() => router.push('/(app)/voice-practice')}
      />

      <DrawerItem
        label='AIせってい'
        icon={({ color, size }) => <MaterialCommunityIcons name='robot' color={color} size={size} />}
        onPress={() => router.push('/(app)/ai-setup')}
      />

      <View style={styles.divider} />

      <DrawerItem
        label='親御さんへ'
        icon={({ color, size }) => <MaterialCommunityIcons name='account-child' color={color} size={size} />}
        onPress={() => router.push('/(app)/parental')}
      />

      <View style={styles.divider} />

      <DrawerItem
        label='ログアウト'
        icon={({ color, size }) => <MaterialCommunityIcons name='logout' color={color} size={size} />}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerStyle: {
            backgroundColor: '#F5F5F5',
            width: 280,
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#333',
          drawerActiveBackgroundColor: '#E86A33',
          drawerActiveTintColor: '#FFFFFF',
          drawerInactiveTintColor: '#333',
        }}>
        <Drawer.Screen
          name='index'
          options={{
            title: 'ホーム',
            drawerLabel: 'ホーム',
          }}
        />
        <Drawer.Screen
          name='initial-test'
          options={{
            title: 'しょきしんだん',
            drawerItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='beginner'
          options={{
            title: 'しょきゅう',
            drawerItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='intermediate'
          options={{
            title: 'ちゅうきゅう',
            drawerItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='advanced'
          options={{
            title: 'じょうきゅう',
            drawerItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='progress'
          options={{
            title: 'しんちょく',
          }}
        />
        <Drawer.Screen
          name='dictionary'
          options={{
            title: 'ことばのずかん',
          }}
        />
        <Drawer.Screen
          name='voice-practice'
          options={{
            title: 'おんせいれんしゅう',
          }}
        />
        <Drawer.Screen
          name='ai-setup'
          options={{
            title: 'AIせってい',
          }}
        />
        <Drawer.Screen
          name='parental'
          options={{
            title: '親御さんへ',
            headerShown: false,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 10,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'font-mplus-bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
});
