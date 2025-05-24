import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Clipboard, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import aiService from '../../src/services/aiService';

export function AIDockerGuide() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // 指示をクリップボードにコピー
  const copyToClipboard = (text: string) => {
    Clipboard.setString(text.replace(/\n   /g, '\n'));
    Alert.alert('コピーしました', 'コマンドをクリップボードにコピーしました。');
  };

  // セクションの展開/折りたたみ
  const toggleSection = (index: number) => {
    if (expandedSection === index) {
      setExpandedSection(null);
    } else {
      setExpandedSection(index);
    }
  };

  // Dockerの手順を取得
  const dockerInstructions: string[] = aiService.getDockerInstructions
    ? aiService.getDockerInstructions()
    : [
        '1. Docker をインストール:\n   macOS: https://docs.docker.com/desktop/install/mac/\n   Windows: https://docs.docker.com/desktop/install/windows/',
        '2. Docker イメージをダウンロード:\n   docker pull dyslexia/ai-model:latest',
        '3. サーバーを起動:\n   docker run -p 8080:8080 dyslexia/ai-model:latest',
      ];

  // Docker詳細情報を取得
  const dockerDetails: { title: string; content: string }[] = aiService.getDockerDetails
    ? aiService.getDockerDetails()
    : [
        {
          title: 'なぜ Docker が必要なの？',
          content:
            'AI モデルは大きなファイルで、スマートフォンでは処理が重いことがあります。Docker を使うと、パソコンで AI を動かして、スマートフォンから使うことができます。',
        },
        {
          title: 'どんな準備が必要？',
          content: 'Docker をインストールして、イメージをダウンロードし、サーバーを起動するだけです。詳しい手順は上の指示に書いてあります。',
        },
        {
          title: 'トラブルシューティング',
          content:
            'サーバーが起動しない場合は、Docker が正しくインストールされているか確認してください。ポート 8080 が他のアプリで使われていないか確認することも大切です。',
        },
      ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name='arrow-left' size={24} color='#41644A' />
          <Text style={styles.backButtonText}>もどる</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Docker つかいかた</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Docker コンテナのつかいかた</Text>
          <Text style={styles.sectionDescription}>
            AIモデルは Docker コンテナとして ていきょう されています。 つぎの てじゅんで じっこうしてください。
          </Text>
        </View>

        <View style={styles.instructionsContainer}>
          {dockerInstructions.map((instruction, index) => {
            const [title, command] = instruction.split(':\n   ');
            return (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionTitle}>{title}:</Text>
                <View style={styles.commandContainer}>
                  <Text style={styles.commandText}>{command}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(command)}>
                    <MaterialCommunityIcons name='content-copy' size={18} color='#41644A' />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>くわしい せつめい</Text>

          {dockerDetails.map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <TouchableOpacity style={styles.detailHeader} onPress={() => toggleSection(index)}>
                <Text style={styles.detailHeaderText}>{detail.title}</Text>
                <MaterialCommunityIcons name={expandedSection === index ? 'chevron-up' : 'chevron-down'} size={24} color='#41644A' />
              </TouchableOpacity>

              {expandedSection === index && <Text style={styles.detailContent}>{detail.content}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.tipContainer}>
          <MaterialCommunityIcons name='lightbulb-outline' size={24} color='#F9A826' />
          <Text style={styles.tipText}>
            AI モデルは 2びょうくらいの おとを きいて 「あ」や「い」などの ひらがなを よみとります。 いろいろな もじを こえに だして
            ためしてみてください。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// デフォルトエクスポートを追加
export default AIDockerGuide;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#41644A',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333333',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionItem: {
    marginBottom: 16,
  },
  instructionTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  commandContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  commandText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333333',
    flex: 1,
  },
  copyButton: {
    padding: 6,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#333333',
    marginBottom: 12,
  },
  detailItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeaderText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 16,
    color: '#41644A',
  },
  detailContent: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    paddingVertical: 8,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  tipText: {
    fontFamily: 'font-mplus',
    fontSize: 14,
    color: '#5D4037',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});
