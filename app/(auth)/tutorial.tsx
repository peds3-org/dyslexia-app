import React, { useState, useRef } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity, ScrollView, ImageBackground, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// チュートリアルの各ページのコンテンツ
const TUTORIAL_PAGES = [
  {
    image: require('../../assets/temp/elder-worried.png'),
    title: 'れんしゅうしよう',
    message: 'これから　ひらがなを　べんきょうするよ。\nまず　がめんに　ひらがなが　ひとつ　でてくるよ。',
    backgroundColor: '#FFE0B2',
  },
  {
    image: require('../../assets/temp/ninja_syuriken_man.png'),
    title: 'こえをだそう',
    message: 'でてきた　ひらがなを　こえに　だして　よんでみよう。\nじぶんの　こえで　おおきく　いってみてね。',
    backgroundColor: '#FFCDD2',
  },
  {
    image: require('../../assets/temp/elder-worried.png'),
    title: 'ボタンをおそう',
    message: 'よめたら　「とめる」ボタンを　おそう。\nこれで　きみの　こえが　きろくされるよ。',
    backgroundColor: '#C8E6C9',
  },
  {
    image: require('../../assets/temp/ninja_syuriken_man.png'),
    title: 'きいてみよう',
    message: 'つぎに　せいかいの　おとが　ながれるよ。\nせいかいの　こえを　よくきいて　くらべてみよう。',
    backgroundColor: '#BBDEFB',
  },
  {
    image: require('../../assets/temp/elder-worried.png'),
    title: 'つぎへすすもう',
    message: 'つぎの　ひらがなに　すすもう！\nまちがえても　だいじょうぶ。\nなんどでも　ちょうせんできるよ。',
    backgroundColor: '#E1BEE7',
  },
  {
    image: require('../../assets/temp/ninja_syuriken_man.png'),
    title: 'おとをきく',
    message: 'せつめいを　こえで　ききたいときは　「おとをきく」ボタンを　おしてね。',
    backgroundColor: '#FFE0B2',
  },
];

export default function Tutorial() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ページ切り替え時のフェードアニメーション
  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // 次のページへ
  const handleNext = () => {
    if (currentPage < TUTORIAL_PAGES.length - 1) {
      fadeOut();
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: SCREEN_WIDTH * (currentPage + 1),
          animated: true,
        });
        setCurrentPage(currentPage + 1);
        fadeIn();
      }, 200);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: TUTORIAL_PAGES[currentPage].backgroundColor }}>
      <ImageBackground
        source={require('../../assets/backgrounds/sato.png')}
        style={{
          flex: 1,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
        }}
        resizeMode='cover'>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{
            flex: 1,
          }}>
          {TUTORIAL_PAGES.map((page, index) => (
            <View
              key={index}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
              }}>
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  flex: 1,
                  backgroundColor: page.backgroundColor,
                  borderRadius: 30,
                  borderWidth: 4,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  position: 'relative',
                }}>
                {/* スキップボタン */}
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login')}
                  style={{
                    position: 'absolute',
                    top: insets.top + 10,
                    right: 20,
                    zIndex: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: '#4FC3F7',
                  }}>
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 16,
                      color: '#4FC3F7',
                    }}>
                    スキップ
                  </Text>
                </TouchableOpacity>

                {/* メインコンテンツ */}
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 30,
                    paddingTop: insets.top + 70,
                    paddingBottom: 100,
                  }}>
                  <Image
                    source={page.image}
                    style={{
                      width: 150,
                      height: 150,
                      marginBottom: 20,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 32,
                      color: '#673AB7',
                      marginBottom: 15,
                      textShadowColor: 'rgba(255, 255, 255, 0.8)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 2,
                    }}>
                    {page.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'font-mplus-bold',
                      fontSize: 24,
                      color: '#333333',
                      textAlign: 'center',
                      lineHeight: 36,
                    }}>
                    {page.message}
                  </Text>
                </View>

                {/* ページインジケーターとボタン */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: insets.bottom + 30,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                  }}>
                  {/* ページインジケーター */}
                  <View
                    style={{
                      flexDirection: 'row',
                      marginBottom: 20,
                    }}>
                    {TUTORIAL_PAGES.map((_, dotIndex) => (
                      <View
                        key={dotIndex}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: currentPage === dotIndex ? '#673AB7' : 'rgba(103, 58, 183, 0.3)',
                          marginHorizontal: 5,
                        }}
                      />
                    ))}
                  </View>

                  {/* 次へボタン */}
                  <TouchableOpacity
                    onPress={handleNext}
                    style={{
                      backgroundColor: '#00C853',
                      borderRadius: 30,
                      paddingVertical: 15,
                      paddingHorizontal: 40,
                      width: '85%',
                      maxWidth: 300,
                      alignItems: 'center',
                      borderWidth: 4,
                      borderColor: '#FFEB3B',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}>
                    <Text
                      style={{
                        fontFamily: 'font-mplus-bold',
                        fontSize: 24,
                        color: '#FFFFFF',
                        textShadowColor: 'rgba(0, 0, 0, 0.3)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                      }}>
                      {currentPage === TUTORIAL_PAGES.length - 1 ? 'はじめる' : 'つぎへ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          ))}
        </ScrollView>
      </ImageBackground>
    </View>
  );
}
