import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ProgressBarProps {
  level: number;
  collectedCount: number;
  totalRequired: number;
  hideMenuButton?: boolean; // 3本線メニューボタンを非表示にするオプション
  value: number; // 0〜1の間の値
  height?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  level,
  collectedCount,
  totalRequired,
  hideMenuButton = false,
  value,
  height = 10,
  backgroundColor = '#E0E0E0',
  foregroundColor = '#4CAF50',
  style,
  animated = false,
}) => {
  const progress = (collectedCount % 10) / 10;

  const getBeltColor = (level: number) => {
    switch (level) {
      case 1:
        return '#FFFFFF'; // 白帯
      case 2:
        return '#F1C40F'; // 黄帯
      case 3:
        return '#2ECC71'; // 緑帯
      case 4:
        return '#3498db'; // 青帯
      case 5:
        return '#E74C3C'; // 赤帯
      default:
        return '#FFFFFF';
    }
  };

  // 進捗値を0〜1の範囲に強制
  const normalizedValue = Math.min(Math.max(value, 0), 1);

  return (
    <View style={[styles.container, hideMenuButton && styles.containerNoMenu]}>
      {/* レベル表示 - 3本線のメニューアイコンを削除 */}
      <View style={[styles.belt, { backgroundColor: getBeltColor(level) }]}>
        <Text style={styles.levelText}>Lv.{level}</Text>
      </View>

      {/* プログレスバー */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${normalizedValue * 100}%` }]} />
        </View>
        <View style={styles.mojitamaContainer}>
          <MaterialCommunityIcons name='star-four-points' size={16} color='#FFD700' />
          <Text style={styles.mojitamaText}>{collectedCount}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    margin: 10,
  },
  containerNoMenu: {
    // 3本線メニューボタンが表示されないようにするスタイル
    paddingLeft: 10, // 左の余白を調整
  },
  belt: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  levelText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#000',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 10,
  },
  mojitamaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mojitamaText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#FFF',
    marginLeft: 5,
  },
});

export default memo(ProgressBar);
