// src/services/GrokService.ts
import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { GAME_CONFIG } from '../config/gameConfig';
import { AIError, handleError } from '../utils/errorHandler';

export class GrokService {
  /**
   * プレイヤーのアクションに基づいて動的な物語を生成
   */
  static async generateNarrative(
    day: number,
    action: string,
    gameState: any
  ): Promise<string> {
    const prompt = `
あなたは魔王RPGの物語を紡ぐストーリーテラーです。

【世界設定】
- 舞台: 始まりの村アルファ（人口500人の小さな村）
- 危機: 30日後に魔王が襲来する予言
- 現在: Day ${day}/30

【プレイヤー】
- 役割: ${gameState.playerRole}
- 評判: ${gameState.reputation}
- 所持金: ${gameState.gold}ゴールド
- これまでの行動: ${Object.keys(gameState.storyFlags).join(', ') || 'まだ何もしていない'}

【プレイヤーの行動】
"${action}"

【指示】
この行動の結果を、没入感のある物語として2-3文で描写してください：
- プレイヤー視点で体験を描く
- 具体的な場面や感覚を含める  
- 村人や環境の反応を表現
- 魔王襲来の緊張感を織り込む
- 批評や解説ではなく、物語の一部として語る

例：「あなたは〜した。すると〜が起こり、〜を感じた。」
`;

    try {
      const { text } = await generateText({
        model: xai(GAME_CONFIG.MODELS.NARRATIVE),
        prompt,
        temperature: 0.8, // 創造性を高める
        maxTokens: 200,
      });

      if (!text || text.trim().length === 0) {
        throw new AIError('空の応答が返されました');
      }

      return text;
    } catch (error) {
      const fallbackText = `${action}を試みた。結果は...予想外のものだった。（Day ${day}/30）`;
      console.error('物語生成エラー:', handleError(error, 'generateNarrative'));
      return fallbackText;
    }
  }

  /**
   * 状況に応じた動的な選択肢を生成
   */
  static async generateChoices(
    day: number,
    narrative: string,
    gameState: any
  ): Promise<string[]> {
    const prompt = `
【現在の状況】
Day ${day}/30
${narrative}

【プレイヤー状態】
- 役割: ${gameState.playerRole}
- 評判: ${gameState.reputation}
- 所持金: ${gameState.gold}

【指示】
この状況で取りうる選択肢を3-4個生成してください。
以下のJSON形式で返してください：

{"choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"]}

選択肢の条件：
- 各選択肢は15文字以内
- 現在の状況に適した行動
- ${gameState.playerRole}らしい選択肢を含める
${day > 20 ? '- 魔王襲来への対策を含める' : ''}

JSONのみを返してください。他のテキストは不要です。
`;

    try {
      const { text } = await generateText({
        model: xai(GAME_CONFIG.MODELS.CHOICES),
        prompt,
        temperature: 0.7,
        maxTokens: 200,
      });

      // JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.choices || !Array.isArray(parsed.choices)) {
          throw new AIError('無効な選択肢形式');
        }
        return parsed.choices;
      }

      throw new AIError('JSON形式が見つからない');

    } catch (error) {
      console.error('選択肢生成エラー:', handleError(error, 'generateChoices'));
      // フォールバック（日数に応じた動的な選択肢）
      const baseChoices = [
        "村長と相談する",
        "武器を探しに行く",
        "情報を集める",
      ];
      
      if (day > 20) {
        baseChoices.push("魔王軍の偵察", "避難準備を始める");
      } else if (day > 10) {
        baseChoices.push("訓練を積む", "仲間を探す");
      } else {
        baseChoices.push("村を探索する", "休息を取る");
      }
      
      return baseChoices.slice(0, 4);
    }
  }

  /**
   * 重要なイベントの判定
   */
  static async checkForSpecialEvent(
    day: number,
    gameState: any
  ): Promise<string | null> {
    // 設定ファイルから特別イベント日を取得
    if (!GAME_CONFIG.SPECIAL_EVENT_DAYS.includes(day)) {
      return null;
    }

    const specialDays = {
      5: "商人が村を訪れる",
      10: "偵察隊が魔王軍の動きを報告", 
      15: "村に不穏な噂が広がる",
      20: "魔王軍の先遣隊が目撃される",
      25: "最後の準備期間",
      29: "決戦前夜",
      30: "魔王襲来！"
    };

    if (specialDays[day]) {
      const prompt = `
【特別イベント】${specialDays[day]}
【プレイヤー情報】役割: ${gameState.playerRole}, 評判: ${gameState.reputation}

このイベントの詳細な描写を2-3文で生成してください。
緊張感と没入感を重視し、プレイヤーの役割に応じた視点で。
`;

      try {
        const { text } = await generateText({
          model: xai(GAME_CONFIG.MODELS.SPECIAL_EVENTS),
          prompt,
          temperature: 0.7,
          maxTokens: 150,
        });
        return text;
      } catch (error) {
        console.error('イベント生成エラー:', handleError(error, 'checkForSpecialEvent'));
        return specialDays[day];
      }
    }

    return null;
  }
}
