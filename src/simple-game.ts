import { generateText, experimental_generateImage as generateImage } from 'ai';
import { xai } from '@ai-sdk/xai';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

interface GameState {
  playerName: string;
  playerRole: string;
  currentDay: number;
  health: number;
  reputation: number;
  wealth: number;
  prophecyHeard: boolean;
  gameEnded: boolean;
}

export class SimpleDemonLordRPG {
  private gameState: GameState;
  private rl: readline.Interface;
  private gameMasterModel;
  private imageGenerationModel;
  private speechEnabled: boolean;

  private demoMode: boolean;
  private demoInputs: string[];
  private inputIndex: number;

  constructor(demoMode: boolean = false) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY が設定されていません');
    }

    this.demoMode = demoMode;
    this.inputIndex = 0;
    this.demoInputs = [
      'デモテスター',  // プレイヤー名
      '1',           // 英雄を選択
      '1',           // Day 1: 村長に相談
      '2',           // Day 2: 商人で装備購入
      '3',           // Day 3: 賢者に助言
      '1',           // 各特別イベントで選択肢1
      '2', '1', '3', '4', '5', '6', // 残りの日の行動
      '1', '2', '1'  // 追加の選択肢用
    ];

    // xAI Grokモデルの設定
    this.gameMasterModel = xai('grok-2-latest');
    this.imageGenerationModel = xai.image('grok-2-image');

    this.gameState = {
      playerName: '',
      playerRole: '',
      currentDay: 1,
      health: 100,
      reputation: 50,
      wealth: 100,
      prophecyHeard: false,
      gameEnded: false
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const modeText = demoMode ? 'デモ自動実行版' : 'シンプル版';
    console.log(`🏰 30日後の魔王襲来 - ${modeText}`);
    console.log('🎨 特徴: テキスト + AI画像生成 + 音声合成');
    console.log('=====================================');
  }

  async startGame(): Promise<void> {
    try {
      // プレイヤー名と役割の設定
      await this.setupPlayer();
      
      // Day 1: 予言の告知
      await this.day1Opening();
      
      // メインゲームループ
      await this.gameLoop();
      
    } catch (error) {
      console.error('❌ ゲーム実行中にエラーが発生:', error);
    } finally {
      this.rl.close();
    }
  }

  private async setupPlayer(): Promise<void> {
    console.log('\n🎭 キャラクター設定');
    
    this.gameState.playerName = await this.askQuestion('あなたの名前を入力してください: ');
    
    console.log('\n役割を選択してください:');
    console.log('1. 英雄 (高い戦闘力)');
    console.log('2. 商人 (豊富な資金)');  
    console.log('3. 臆病者 (高い体力)');
    console.log('4. 村人 (バランス型)');
    console.log('5. 賢者 (豊富な知識)');
    console.log('6. 傭兵 (戦闘のプロ)');
    
    const roleChoice = await this.askQuestion('選択 (1-6): ');
    const roles = ['', '英雄', '商人', '臆病者', '村人', '賢者', '傭兵'];
    this.gameState.playerRole = roles[parseInt(roleChoice)] || '村人';
    
    console.log(`\n✅ ${this.gameState.playerName}（${this.gameState.playerRole}）として冒険を開始します！`);
  }

  private async day1Opening(): Promise<void> {
    console.log('\n📅 Day 1 - 予言の告知');
    console.log('================================');

    // GMによるオープニング
    const openingPrompt = `
あなたはファンタジーRPGのゲームマスターです。

プレイヤー「${this.gameState.playerName}」（役割: ${this.gameState.playerRole}）に対して、
村長エルダー・モーガンが「30日後に魔王が村を襲撃する」という予言を告知するシーンを描写してください。

以下の要素を含めて200-300文字で描写：
- 村の雰囲気
- 村長の威厳ある告知
- プレイヤーの役割に応じた周囲の反応
- 緊迫感のある展開

JSON形式で回答してください：
{
  "narrative": "物語の描写",
  "prophecy": "予言の内容",
  "villageReaction": "村人たちの反応"
}`;

    try {
      const response = await generateText({
        model: this.gameMasterModel,
        messages: [{ role: 'user', content: openingPrompt }]
      });

      const result = this.parseJSONResponse(response.text);
      
      console.log('\n📖 ' + result.narrative);
      console.log('\n🔮 予言: ' + result.prophecy);
      console.log('\n👥 村の反応: ' + result.villageReaction);
      
      this.gameState.prophecyHeard = true;

      // Day 1の重要場面の画像生成
      console.log('\n🎨 Day 1のシーンを画像で生成中...');
      await this.generateSceneImage(
        `Fantasy village scene: Elder announcing demon lord prophecy to ${this.gameState.playerRole} character, medieval village setting, dramatic lighting`
      );

    } catch (error) {
      console.error('Day 1オープニング処理エラー:', error);
      console.log('📖 村長エルダー・モーガンが重大な発表をします。「30日後、この村に魔王が襲来します。皆さん、準備を整えてください。」');
      this.gameState.prophecyHeard = true;
    }
  }

  private async gameLoop(): Promise<void> {
    const maxDay = this.demoMode ? 5 : 30; // デモモードは5日まで
    while (this.gameState.currentDay <= maxDay && !this.gameState.gameEnded && this.gameState.health > 0) {
      console.log(`\n📅 Day ${this.gameState.currentDay} / 30`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`💚 体力: ${this.gameState.health}/100 | ⭐ 評判: ${this.gameState.reputation}/100 | 💰 所持金: ${this.gameState.wealth}G`);
      console.log(`魔王襲来まで残り ${30 - this.gameState.currentDay + 1} 日`);
      
      await this.dayAction();
      
      // 特別な日の処理 - デモモードでは3日目に発生
      if ((this.demoMode && this.gameState.currentDay === 3) || 
          (!this.demoMode && (this.gameState.currentDay === 10 || this.gameState.currentDay === 20 || this.gameState.currentDay === 30))) {
        await this.specialDayEvent();
      }
      
      this.gameState.currentDay++;
    }

    await this.gameEnding();
  }

  private async dayAction(): Promise<void> {
    console.log('\n🎯 今日は何をしますか？');
    console.log('1. 村長に相談する');
    console.log('2. 商人グロムで装備を購入する');
    console.log('3. 賢者エララに助言を求める');
    console.log('4. 村の防衛準備を手伝う');
    console.log('5. 他の村人と情報交換する');
    console.log('6. 休息して体力回復する');

    const choice = await this.askQuestion('選択 (1-6): ');
    await this.processAction(parseInt(choice));
  }

  private async processAction(choice: number): Promise<void> {
    const actions = [
      '', 
      '村長エルダー・モーガンに相談する',
      '商人グロムで装備を購入する', 
      '賢者エララに助言を求める',
      '村の防衛準備を手伝う',
      '他の村人と情報交換する',
      '休息して体力回復する'
    ];

    const actionText = actions[choice] || '様子を見る';
    
    const prompt = `
あなたはファンタジーRPGのゲームマスターです。

プレイヤー「${this.gameState.playerName}」（役割: ${this.gameState.playerRole}）がDay ${this.gameState.currentDay}に
「${actionText}」という行動を取りました。

現在の状況:
- 体力: ${this.gameState.health}/100
- 評判: ${this.gameState.reputation}/100  
- 所持金: ${this.gameState.wealth}G
- 魔王襲来まで: ${30 - this.gameState.currentDay + 1}日

この行動の結果を以下のJSON形式で回答してください：
{
  "narrative": "行動の結果描写（150-200文字）",
  "healthChange": 数値（-10〜+20），
  "reputationChange": 数値（-20〜+15），
  "wealthChange": 数値（-100〜+50），
  "specialEvent": "特別なイベントがあれば記述、なければ空文字"
}`;

    try {
      const response = await generateText({
        model: this.gameMasterModel,
        messages: [{ role: 'user', content: prompt }]
      });

      const result = this.parseJSONResponse(response.text);
      
      console.log('\n📖 ' + result.narrative);
      
      // ステータス更新
      this.gameState.health = Math.max(0, Math.min(100, this.gameState.health + (result.healthChange || 0)));
      this.gameState.reputation = Math.max(0, Math.min(100, this.gameState.reputation + (result.reputationChange || 0)));
      this.gameState.wealth = Math.max(0, this.gameState.wealth + (result.wealthChange || 0));
      
      // 変化を表示
      this.showStatusChanges(result.healthChange || 0, result.reputationChange || 0, result.wealthChange || 0);
      
      if (result.specialEvent) {
        console.log('\n✨ 特別なイベント: ' + result.specialEvent);
      }

    } catch (error) {
      console.error('行動処理エラー:', error);
      console.log(`📖 ${actionText}を実行しました。`);
    }
  }

  private async specialDayEvent(): Promise<void> {
    console.log(`\n🌟 Day ${this.gameState.currentDay} - 重要な節目`);
    
    const prompt = `
Day ${this.gameState.currentDay}の特別イベントを作成してください。
魔王襲来の緊迫感が高まる重要な転換点として描写してください。

プレイヤー: ${this.gameState.playerName}（${this.gameState.playerRole}）
現在の評判: ${this.gameState.reputation}/100

JSON形式で回答：
{
  "eventTitle": "イベントのタイトル",
  "eventDescription": "イベントの詳細描写（200-300文字）",
  "choices": ["選択肢1", "選択肢2", "選択肢3"]
}`;

    try {
      const response = await generateText({
        model: this.gameMasterModel,
        messages: [{ role: 'user', content: prompt }]
      });

      const result = this.parseJSONResponse(response.text);
      
      console.log('\n📜 ' + result.eventTitle);
      console.log('📖 ' + result.eventDescription);
      
      if (result.choices && result.choices.length > 0) {
        console.log('\n💭 選択肢:');
        result.choices.forEach((choice: string, index: number) => {
          console.log(`${index + 1}. ${choice}`);
        });
        
        const playerChoice = await this.askQuestion('選択: ');
        const choiceIndex = parseInt(playerChoice) - 1;
        
        if (choiceIndex >= 0 && choiceIndex < result.choices.length) {
          console.log(`✅ 「${result.choices[choiceIndex]}」を選択しました。`);
        }
      }

      // 特別な日の画像生成
      console.log('\n🎨 重要な場面を画像で生成中...');
      await this.generateSceneImage(
        `Fantasy RPG dramatic scene: Day ${this.gameState.currentDay} special event, ${result.eventTitle}, medieval fantasy setting, epic atmosphere`
      );

    } catch (error) {
      console.error('特別イベント処理エラー:', error);
      console.log(`📖 Day ${this.gameState.currentDay}、村に重要な変化が起こりました。`);
    }
  }

  private async generateSceneImage(prompt: string): Promise<void> {
    try {
      console.log(`🎨 画像生成中: "${prompt.substring(0, 50)}..."`);
      
      const { image } = await generateImage({
        model: this.imageGenerationModel,
        prompt: `High-quality fantasy RPG scene: ${prompt}. Style: detailed digital art, fantasy game artwork, dramatic lighting.`
      });
      
      console.log('✅ 画像生成完了！（ゲーム内では画像が表示されます）');
      console.log(`🖼️ 画像URL: ${image.url || 'Generated successfully'}`);
      
    } catch (error) {
      console.error('画像生成エラー:', error);
      console.log('⚠️ 画像生成に失敗しましたが、ゲームを続行します。');
    }
  }

  private async generateSpeech(text: string, character: string = 'ナレーター'): Promise<void> {
    if (!this.speechEnabled) return;

    try {
      console.log(`🗣️ 音声合成中: ${character}の声で「${text.substring(0, 30)}...」`);
      
      // AIVIS音声合成の実装（モック）
      // 実際の実装では、音声合成APIまたはTTSライブラリを使用
      console.log('🔊 音声再生完了！（実際のゲームでは音声が再生されます）');
      console.log(`🎭 キャラクター: ${character}`);
      
    } catch (error) {
      console.error('音声合成エラー:', error);
      console.log('⚠️ 音声合成に失敗しましたが、ゲームを続行します。');
    }
  }

  private async gameEnding(): Promise<void> {
    console.log('\n🏁 Day 30 - 魔王襲来！');
    console.log('================================');

    const endingPrompt = `
プレイヤー「${this.gameState.playerName}」（${this.gameState.playerRole}）の30日間の冒険が終了しました。

最終ステータス:
- 体力: ${this.gameState.health}/100
- 評判: ${this.gameState.reputation}/100
- 所持金: ${this.gameState.wealth}G

この結果に基づいて、魔王襲来の結末を決定してください。
評判が高いほど良いエンディング、低いほど厳しいエンディングとしてください。

JSON形式で回答：
{
  "endingType": "勝利/引き分け/敗北",
  "endingTitle": "エンディングのタイトル",
  "endingDescription": "結末の詳細描写（300-400文字）",
  "finalMessage": "プレイヤーへの最終メッセージ"
}`;

    try {
      const response = await generateText({
        model: this.gameMasterModel,
        messages: [{ role: 'user', content: endingPrompt }]
      });

      const result = this.parseJSONResponse(response.text);
      
      console.log(`\n🎭 ${result.endingTitle}`);
      console.log('📖 ' + result.endingDescription);
      console.log('\n💬 ' + result.finalMessage);
      
      // エンディング画像生成
      console.log('\n🎨 エンディングシーンを画像で生成中...');
      await this.generateSceneImage(
        `Fantasy RPG ending scene: ${result.endingType} ending, demon lord confrontation, ${result.endingTitle}, epic final battle, dramatic conclusion`
      );

    } catch (error) {
      console.error('エンディング処理エラー:', error);
      console.log('📖 30日後、魔王との最終決戦の時が訪れました...');
    }

    console.log('\n🎉 ゲーム終了！プレイありがとうございました！');
  }

  private parseJSONResponse(response: string): any {
    try {
      // JSONコードブロックの抽出を試行
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.warn('JSON解析失敗、フォールバック使用:', error);
      return {
        narrative: response.substring(0, 200) + '...',
        healthChange: 0,
        reputationChange: 0,
        wealthChange: 0
      };
    }
  }

  private showStatusChanges(healthChange: number, reputationChange: number, wealthChange: number): void {
    const changes: string[] = [];
    
    if (healthChange > 0) changes.push(`💚 体力 +${healthChange}`);
    else if (healthChange < 0) changes.push(`💔 体力 ${healthChange}`);
    
    if (reputationChange > 0) changes.push(`⭐ 評判 +${reputationChange}`);
    else if (reputationChange < 0) changes.push(`📉 評判 ${reputationChange}`);
    
    if (wealthChange > 0) changes.push(`💰 所持金 +${wealthChange}G`);
    else if (wealthChange < 0) changes.push(`💸 所持金 ${wealthChange}G`);
    
    if (changes.length > 0) {
      console.log('📊 変化: ' + changes.join(' | '));
    }
  }

  private askQuestion(question: string): Promise<string> {
    if (this.demoMode) {
      const answer = this.demoInputs[this.inputIndex] || '1';
      this.inputIndex++;
      console.log(question + answer);
      return Promise.resolve(answer);
    }
    
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// メイン実行関数
export async function startSimpleDemonLordRPG(demoMode: boolean = false): Promise<void> {
  const game = new SimpleDemonLordRPG(demoMode);
  await game.startGame();
}