// Script to clear authentication data
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAuthData = async () => {
  try {
    // Clear all Supabase related keys
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') ||
      key.includes('session')
    );
    
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Cleared authentication keys:', supabaseKeys);
    } else {
      console.log('No authentication keys found');
    }
    
    // Also clear all data if needed
    // await AsyncStorage.clear();
    
    console.log('Authentication data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Export for use in app
export default clearAuthData;