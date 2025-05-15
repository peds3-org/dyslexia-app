import React from 'react';
import { Link } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
      <Text
        style={{
          fontFamily: 'font-mplus',
          fontSize: 20,
          marginBottom: 20,
          textAlign: 'center',
        }}>
        このページは存在しません。
      </Text>

      <Link href='/' asChild>
        <TouchableOpacity
          style={{
            backgroundColor: '#E86A33',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontFamily: 'font-mplus',
              fontSize: 16,
            }}>
            ホームに戻る
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
