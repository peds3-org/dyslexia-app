import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, SafeAreaView, Image, Easing, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const INTRO_PAGES = [
  {
    title: 'こんにちは！',
    message: 'ぼくは にんじゃの\nしょうねんです！\nいっしょに たのしく べんきょうしようね！',
    backgroundColor: '#FFE0B2',
    gradientColors: ['#FFE0B2', '#FFCC80'],
    image: require('@assets/temp/ninja_syuriken_man.png'),
    decorations: ['⭐', '🌟', '✨'],
  },
  {
    title: 'なにをするの？',
    message: 'がめんに でてくる もじをよんでみてね！\nきみの よみかたを きかせてね！',
    backgroundColor: '#B2DFDB',
    gradientColors: ['#B2DFDB', '#80CBC4'],
    image: require('@assets/temp/ninja_syuriken_man.png'),
    decorations: ['📚', '✏️', '🎯'],
  },
  {
    title: 'どうやるの？',
    message: 'もじが でてきたら\nおおきな こえで よんでね！\nよみおわったら したの ぼたんをしてね！',
    backgroundColor: '#F8BBD0',
    gradientColors: ['#F8BBD0', '#F48FB1'],
    image: require('@assets/temp/ninja_syuriken_man.png'),
    decorations: ['🎤', '👆', '💫'],
  },
  {
    title: 'だいじょうぶ！',
    message: 'はやく よめなくても\nだいじょうぶ！\nゆっくり たのしく\nがんばろうね！',
    backgroundColor: '#C5CAE9',
    gradientColors: ['#C5CAE9', '#9FA8DA'],
    image: require('@assets/temp/elder-worried.png'),
    decorations: ['💪', '😊', '🌈'],
  },
  {
    title: 'レッツゴー！',
    message: 'わくわく ドキドキ！\nきみの ちからを みせてね！\nいっしょに たのしもう！',
    backgroundColor: '#FFD54F',
    gradientColors: ['#FFD54F', '#FFC107'],
    image: require('@assets/temp/ninja_syuriken_man.png'),
    decorations: ['🚀', '🎉', '🏆'],
  },
];

const IntroPage = ({ page, index }: { page: (typeof INTRO_PAGES)[0]; index: number }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const decorationAnims = useRef(
    page.decorations.map(() => ({
      rotate: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // キャラクターの浮遊アニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // タイトルのバウンスアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // デコレーションのアニメーション
    decorationAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(anim.rotate, {
            toValue: 1,
            duration: 3000 + i * 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.scale, {
              toValue: 1.2,
              duration: 1000 + i * 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: 1000 + i * 200,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });

    // 最後のページの場合、特別なアニメーション
    if (index === INTRO_PAGES.length - 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, []);

  const isLastPage = index === INTRO_PAGES.length - 1;

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: page.backgroundColor,
      }}>
      {/* グラデーション風の背景効果 */}
      <View
        style={{
          position: 'absolute',
          width: SCREEN_WIDTH * 1.5,
          height: SCREEN_WIDTH * 1.5,
          borderRadius: SCREEN_WIDTH * 0.75,
          backgroundColor: page.gradientColors[1],
          opacity: 0.3,
          top: -SCREEN_WIDTH * 0.5,
          left: -SCREEN_WIDTH * 0.25,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: SCREEN_WIDTH * 1.2,
          height: SCREEN_WIDTH * 1.2,
          borderRadius: SCREEN_WIDTH * 0.6,
          backgroundColor: page.gradientColors[1],
          opacity: 0.2,
          bottom: -SCREEN_WIDTH * 0.4,
          right: -SCREEN_WIDTH * 0.2,
        }}
      />

      {/* 背景のデコレーション */}
      {page.decorations.map((decoration, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            fontSize: 30,
            opacity: 0.3,
            top: Math.random() * 100 + 50,
            left: Math.random() * (SCREEN_WIDTH - 50),
            transform: [
              {
                rotate: decorationAnims[i].rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
              { scale: decorationAnims[i].scale },
            ],
          }}>
          {decoration}
        </Animated.Text>
      ))}

      <View
        style={{
          width: '90%',
          height: '80%',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 20,
          paddingBottom: 140,
        }}>
        {/* タイトルバブル */}
        <Animated.View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 30,
            paddingHorizontal: 40,
            paddingVertical: 15,
            borderWidth: 4,
            borderColor: '#FFE500',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 8,
            transform: [{ translateY: bounceAnim }, { scale: isLastPage ? scaleAnim : 1 }],
          }}>
          <Text
            style={{
              fontSize: isLastPage ? 38 : 34,
              fontFamily: 'Zen-B',
              color: '#FF6B6B',
              textAlign: 'center',
              textShadowColor: 'rgba(255, 107, 107, 0.3)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
            }}>
            {page.title}
          </Text>
        </Animated.View>

        {/* キャラクター画像 */}
        <View style={{ position: 'relative', width: '80%', height: '40%' }}>
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              transform: [
                { translateY: floatAnim },
                isLastPage
                  ? {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }
                  : { rotate: '0deg' },
              ],
            }}>
            {/* キャラクターの背景円 */}
            <View
              style={{
                position: 'absolute',
                width: '90%',
                height: '90%',
                borderRadius: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                transform: [{ scale: 1.1 }],
              }}
            />
            <Image
              source={page.image}
              style={{
                width: '85%',
                height: '85%',
              }}
              resizeMode='contain'
            />
          </Animated.View>

          {/* キャラクター周りのデコレーション */}
          {isLastPage && (
            <>
              <Animated.Text
                style={{
                  position: 'absolute',
                  fontSize: 35,
                  top: -10,
                  left: 20,
                  transform: [{ scale: scaleAnim }],
                }}>
                ✨
              </Animated.Text>
              <Animated.Text
                style={{
                  position: 'absolute',
                  fontSize: 35,
                  bottom: -10,
                  right: 20,
                  transform: [{ scale: scaleAnim }],
                }}>
                🌟
              </Animated.Text>
              <Animated.Text
                style={{
                  position: 'absolute',
                  fontSize: 35,
                  top: 30,
                  right: 0,
                  transform: [{ scale: scaleAnim }],
                }}>
                💫
              </Animated.Text>
            </>
          )}
        </View>

        {/* メッセージバブル */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 25,
            padding: 25,
            width: '90%',
            borderWidth: 4,
            borderColor: '#FFE500',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 8,
          }}>
          <Text
            style={{
              fontSize: isLastPage ? 26 : 26,
              fontFamily: 'Zen-B',
              color: '#333333',
              textAlign: 'center',
              lineHeight: isLastPage ? 42 : 38,
            }}>
            {page.message}
          </Text>
        </View>

        {/* ページインジケーターはここではなく、ボタンの間に移動 */}
      </View>
    </View>
  );
};

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleStart = () => {
    if (currentPage === INTRO_PAGES.length - 1) {
      onComplete();
    } else {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        {INTRO_PAGES.map((page, index) => (
          <IntroPage key={index} page={page} index={index} />
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}>
        {/* ページインジケーター */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 25,
          }}>
          {INTRO_PAGES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentPage ? 20 : 14,
                height: i === currentPage ? 20 : 14,
                borderRadius: i === currentPage ? 10 : 7,
                marginHorizontal: 6,
                borderWidth: 3,
                borderColor: '#FFE500',
                backgroundColor: i === currentPage ? '#FF6B6B' : '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: i === currentPage ? 0.25 : 0,
                shadowRadius: 4,
                elevation: i === currentPage ? 5 : 0,
              }}
            />
          ))}
        </View>

        {/* ボタン */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            style={{
              paddingVertical: 10,
              paddingHorizontal: 28,
              borderRadius: 30,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderWidth: 3,
              borderColor: '#FFE500',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 5,
              elevation: 6,
            }}
            onPress={handleSkip}>
            <Text
              style={{
                fontSize: 20,
                fontFamily: 'Zen-B',
                color: '#888888',
              }}>
              スキップ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 45,
              borderRadius: 35,
              backgroundColor: currentPage === INTRO_PAGES.length - 1 ? '#FF6B6B' : '#4CAF50',
              borderWidth: 4,
              borderColor: '#FFE500',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 8,
              transform: [{ scale: 1 }],
            }}
            onPress={handleStart}>
            <Animated.Text
              style={{
                fontSize: 26,
                fontFamily: 'Zen-B',
                color: '#FFFFFF',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 1, height: 2 },
                textShadowRadius: 3,
              }}>
              {currentPage === INTRO_PAGES.length - 1 ? 'はじめる！' : 'つぎへ'}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
