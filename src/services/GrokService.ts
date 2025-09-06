// src/services/GrokService.ts
import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { GAME_CONFIG } from '../config/gameConfig';
import { AIError, handleError } from '../utils/errorHandler';

export class GrokService {
  /**
   * プレイヤーのアクションに基づいて動的な物語を生成
   */
  static async generateNarrative(day: number, action: string, gameState: any): Promise<string> {
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
  static async generateChoices(day: number, narrative: string, gameState: any): Promise<string[]> {
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
      const baseChoices = ['村長と相談する', '武器を探しに行く', '情報を集める'];

      if (day > 20) {
        baseChoices.push('魔王軍の偵察', '避難準備を始める');
      } else if (day > 10) {
        baseChoices.push('訓練を積む', '仲間を探す');
      } else {
        baseChoices.push('村を探索する', '休息を取る');
      }

      return baseChoices.slice(0, 4);
    }
  }

  /**
   * 重要なイベントの判定
   */
  static async checkForSpecialEvent(day: number, gameState: any): Promise<string | null> {
    // 設定ファイルから特別イベント日を取得
    if (!GAME_CONFIG.SPECIAL_EVENT_DAYS.includes(day as any)) {
      return null;
    }

    const specialDays: Record<number, string> = {
      5: '商人が村を訪れる',
      10: '偵察隊が魔王軍の動きを報告',
      15: '村に不穏な噂が広がる',
      20: '魔王軍の先遣隊が目撃される',
      25: '最後の準備期間',
      29: '決戦前夜',
      30: '魔王襲来！',
    };

    const eventDescription = specialDays[day];
    if (eventDescription) {
      const prompt = `
【特別イベント】${eventDescription}
【プレイヤー情報】役割: ${gameState.playerRole}, 評判: ${gameState.reputation}

このイベントの詳細な描写を2-3文で生成してください。
緊張感と没入感を重視し、プレイヤーの役割に応じた視点で。
`;

      try {
        const { text } = await generateText({
          model: xai(GAME_CONFIG.MODELS.SPECIAL_EVENTS),
          prompt,
          temperature: 0.7,
        });
        return text;
      } catch (error) {
        console.error('イベント生成エラー:', handleError(error, 'checkForSpecialEvent'));
        return eventDescription;
      }
    }

    return null;
  }

  /**
   * AIが行動を評価してゲーム状態の変更を決定（Few-shot prompting）
   */
  static async evaluateStateChanges(
    action: string,
    currentGameState: any,
    day: number,
    narrative?: string
  ): Promise<{
    reputation: number;
    gold: number;
    storyFlags: Record<string, boolean>;
    reasoning: string;
  }> {
    const prompt = `
あなたは魔王RPGのゲームマスターです。プレイヤーの行動を評価し、ゲーム状態への影響を判定してください。

【Few-shot Examples】

例1:
行動: "村長と相談して魔王対策を話し合う"
現在状態: {役割: "hero", 評判: 10, 所持金: 100}
Day: 3
結果: {
  "reputation": 15,
  "gold": 100, 
  "storyFlags": {"talked_to_elder": true},
  "reasoning": "村長との相談で信頼を得た。評判が上昇し、重要な情報フラグが立つ。"
}

例2:
行動: "商人から高価な武器を購入する"
現在状態: {役割: "merchant", 評判: 5, 所持金: 500}
Day: 8  
結果: {
  "reputation": 8,
  "gold": 200,
  "storyFlags": {"has_weapon": true, "merchant_dealings": true},
  "reasoning": "商人としての経験で良い取引ができた。金は減ったが評判と装備が向上。"
}

例3:
行動: "ドラゴンを討伐する"
現在状態: {役割: "hero", 評判: 25, 所持金: 200}
Day: 15
結果: {
  "reputation": 55,
  "gold": 3500,
  "storyFlags": {"dragon_slayer": true, "legendary_deed": true},
  "reasoning": "伝説的な偉業により大幅な評判向上と報酬を獲得。英雄としての地位が確立。"
}

【現在の評価対象】
行動: "${action}"
現在状態: {役割: "${currentGameState.playerRole}", 評判: ${currentGameState.reputation}, 所持金: ${currentGameState.gold}}
Day: ${day}/30
${narrative ? `物語の状況: ${narrative}` : ''}

【評価指針】
1. 役割に応じた得意分野で成果が上がりやすい
2. 危険な行動は高リスク高リターン
3. Day進行に応じて緊急度が高まる
4. 既存のstoryFlagsとの整合性を保つ
5. 評判変動: -50〜+50、金銭変動: -1000〜+5000の範囲内

JSON形式で返してください。説明テキストは不要です：
{
  "reputation": 数値,
  "gold": 数値,
  "storyFlags": {},
  "reasoning": "判定理由を1文で"
}`;

    try {
      const { text } = await generateText({
        model: xai(GAME_CONFIG.MODELS.NARRATIVE), // 複雑な評価にはgrok-4を使用
        prompt,
        temperature: 0.3, // 一貫性を重視
        maxTokens: 300,
      });

      // JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // 範囲制限を適用
        result.reputation = Math.max(-50, Math.min(50, result.reputation || 0));
        result.gold = Math.max(-1000, Math.min(5000, result.gold || 0));
        result.storyFlags = result.storyFlags || {};
        result.reasoning = result.reasoning || 'AI評価完了';

        console.log(`🧠 AI State Evaluation: ${result.reasoning}`);
        console.log(`📊 Changes: 評判${result.reputation > 0 ? '+' : ''}${result.reputation}, 金${result.gold > 0 ? '+' : ''}${result.gold}`);
        
        return result;
      }
      
      throw new AIError('Invalid JSON response from AI evaluation');
      
    } catch (error) {
      console.error('State evaluation error:', handleError(error, 'evaluateStateChanges'));
      
      // Fallback: 軽微な変化
      return {
        reputation: Math.floor(Math.random() * 10) - 5, // -5〜+5
        gold: Math.floor(Math.random() * 100) - 50,     // -50〜+50
        storyFlags: {},
        reasoning: 'AI評価エラー、ランダム変化を適用'
      };
    }
  }
}
