import { GameMasterAgent } from './agents/GameMasterAgent';
import { ElderMorganAgent, MerchantGromAgent, ElaraSageAgent } from './agents/NPCAgents';
import { GameWorkflowManager } from './workflows/gameWorkflow';
import { GameState, PlayerRole, GameEvent } from './types';
import { GameStateSchema, PlayerRoleSchema } from './schemas';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

export class DemonLordRPG {
  private gameMaster: GameMasterAgent;
  private npcAgents: {
    gameMaster: GameMasterAgent;
    elderMorgan: any;
    merchantGrom: any;
    elaraSage: any;
  };
  private workflowManager: GameWorkflowManager;
  private currentGameState: GameState | null = null;
  private rl: readline.Interface;

  constructor() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY が設定されていません');
    }

    // NPCエージェントを初期化
    const elderMorgan = new ElderMorganAgent();
    const merchantGrom = new MerchantGromAgent();
    const elaraSage = new ElaraSageAgent();

    // GameMasterエージェントを初期化（Supervisor/Sub-agentパターン）
    this.gameMaster = new GameMasterAgent({
      Elder_Morgan: elderMorgan,
      Merchant_Grom: merchantGrom,
      Elara_Sage: elaraSage,
    });

    // npcAgentsオブジェクトを設定
    this.npcAgents = {
      gameMaster: this.gameMaster,
      elderMorgan,
      merchantGrom,
      elaraSage,
    };

    // ワークフローマネージャー（インスタンス化）
    this.workflowManager = new GameWorkflowManager(this.npcAgents);

    // コンソール入力用のインターフェース
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('🏰 Volt Agent Supervisor/Sub-agentシステムが初期化されました');
    console.log(
      `📋 登録Agents: GameMaster(Supervisor) + ${Object.keys(this.npcAgents)
        .filter((k) => k !== 'gameMaster')
        .join(', ')}`
    );
  }

  /**
   * ゲーム開始
   */
  async startGame(): Promise<void> {
    console.log('🏰================================🏰');
    console.log('    30日後の魔王襲来 RPG');
    console.log('🏰================================🏰');
    console.log('');

    try {
      // プレイヤー情報の収集
      const playerName = await this.askQuestion('あなたの名前を入力してください: ');
      const playerRole = await this.selectRole();

      // バリデーション
      if (!playerName || playerName.trim().length === 0) {
        throw new Error('名前を入力してください');
      }

      console.log('');
      console.log('🎮 マルチエージェントシステムでゲームを開始します...');
      console.log('');

      // 新しいゲームを開始
      this.currentGameState = await this.gameMaster.startNewGame(playerName.trim(), playerRole);

      console.log('🌟 Day 1ワークフローを実行中...');

      // Day 1ワークフローを実行
      try {
        const day1Result = await this.workflowManager.runDay1Start(
          playerName.trim(),
          playerRole,
          this.currentGameState
        );

        console.log('✅ ワークフロー完了');

        // ワークフロー結果を反映
        if (day1Result.updatedGameState) {
          this.currentGameState = day1Result.updatedGameState;
        }

        console.log('');
        console.log('📜 ' + (day1Result.message || '予言が告げられました...'));
        console.log('');

        // Day 1のオープニングイベントを生成
        const day1Event = await this.gameMaster.generateDay1Opening(this.currentGameState);
        await this.playEvent(day1Event);

        // メインゲームループ
        await this.gameLoop();
      } catch (error) {
        console.error('❌ Day1ワークフロー実行中にエラーが発生:', error);
        console.log('フォールバックモードでゲームを継続します...');

        // フォールバック: 通常のDay1イベント
        const day1Event = await this.gameMaster.generateDay1Opening(this.currentGameState);
        await this.playEvent(day1Event);
        await this.gameLoop();
      }
    } catch (error) {
      console.error('❌ ゲーム開始中にエラーが発生しました:', error);
    }
  }

  /**
   * メインゲームループ
   */
  private async gameLoop(): Promise<void> {
    while (this.currentGameState && this.currentGameState.currentDay <= 30) {
      try {
        console.log('');
        console.log(`📅 Day ${this.currentGameState.currentDay}/30`);
        console.log(`📍 現在地: ${this.getLocationName(this.currentGameState.location)}`);
        console.log(`💰 所持金: ${this.currentGameState.playerStats.wealth}G`);
        console.log(`⭐ 評判: ${this.currentGameState.playerStats.reputation}`);
        console.log('');

        const playerInput = await this.askQuestion(
          '何をしますか？ (行動を自由に入力してください | help でヘルプ): '
        );

        if (playerInput.toLowerCase() === 'quit' || playerInput.toLowerCase() === 'exit') {
          console.log('ゲームを終了します...');
          break;
        }

        if (playerInput.toLowerCase() === 'status') {
          this.showStatus();
          continue;
        }

        if (playerInput.toLowerCase() === 'help') {
          this.showHelp();
          continue;
        }

        // 特別なコマンドをチェック
        const specialResult = await this.handleSpecialCommands(playerInput);
        if (specialResult) {
          console.log('');
          console.log('📖 ' + specialResult.narrative);
          console.log('');
          continue;
        }

        console.log('🤖 マルチエージェント処理中...');

        // プレイヤー行動ワークフローを実行
        try {
          const workflowResult = await this.workflowManager.runPlayerAction(
            this.currentGameState!.playerName,
            this.currentGameState!.playerRole,
            playerInput,
            this.currentGameState!.currentDay
          );

          // 結果を表示
          console.log('');
          console.log('📖 ' + workflowResult.narrative);
          console.log('');

          // 選択肢がある場合は表示
          if (workflowResult.choices && workflowResult.choices.length > 0) {
            console.log('💭 次の行動を選択してください:');
            workflowResult.choices.forEach((choice: any, index: number) => {
              console.log(`${index + 1}. ${choice.text}`);
            });

            const choiceInput = await this.askQuestion('選択 (数字): ');
            const choiceIndex = parseInt(choiceInput) - 1;

            if (choiceIndex >= 0 && choiceIndex < workflowResult.choices.length) {
              const selectedChoice = workflowResult.choices[choiceIndex];
              console.log(`✅ 「${selectedChoice.text}」を選択しました`);

              // 選択肢の結果を適用
              if (selectedChoice.consequences?.immediate) {
                this.applyConsequences(selectedChoice.consequences.immediate);
              }
            }
          }

          // 状態変更を適用
          if (workflowResult.stateChanges) {
            this.currentGameState = this.applyStateChangesToGameState(
              this.currentGameState!,
              workflowResult.stateChanges
            );
          }
        } catch (error) {
          console.error('❌ ワークフロー処理中にエラーが発生:', error);
          console.log('フォールバックモードで処理します...');

          // フォールバック: 従来のGameMaster処理
          const result = await this.gameMaster.processPlayerAction(
            this.currentGameState!,
            playerInput
          );
          console.log('');
          console.log('📖 ' + result.narrative);
          console.log('');
          this.currentGameState = result.updatedGameState;
        }

        // 1日が終了したかチェック（簡易実装）
        // TODO: より詳細な時間進行システムを実装
        if (Math.random() > 0.7) {
          // 30%の確率で日が進む
          this.currentGameState.currentDay += 1;

          if (this.currentGameState.currentDay > 30) {
            await this.endGame();
            break;
          }
        }
      } catch (error) {
        console.error('❌ ゲームループ中にエラーが発生しました:', error);
        console.log('もう一度お試しください。');
      }
    }
  }

  /**
   * イベントをプレイ
   */
  private async playEvent(event: GameEvent): Promise<void> {
    console.log('');
    console.log('🌟 ' + event.title);
    console.log('');
    console.log(event.description);
    console.log('');

    if (event.choices.length > 0) {
      console.log('💭 選択肢:');
      event.choices.forEach((choice, index) => {
        console.log(`${index + 1}. ${choice.text}`);
      });

      const choiceInput = await this.askQuestion('選択してください (数字): ');
      const choiceIndex = parseInt(choiceInput) - 1;

      if (choiceIndex >= 0 && choiceIndex < event.choices.length) {
        const selectedChoice = event.choices[choiceIndex];
        console.log(`✅ 「${selectedChoice.text}」を選択しました`);

        // 選択肢の結果を適用
        if (selectedChoice.consequences && selectedChoice.consequences.immediate) {
          this.applyConsequences(selectedChoice.consequences.immediate);
        }
      } else {
        console.log('❌ 無効な選択です。最初の選択肢を自動選択します。');
        this.applyConsequences(event.choices[0].consequences.immediate);
      }
    }
  }

  /**
   * 結果を適用
   */
  private applyConsequences(consequences: any[]): void {
    if (!this.currentGameState || !consequences) return;

    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'stat':
          if (consequence.target in this.currentGameState.playerStats) {
            const currentValue = (this.currentGameState.playerStats as any)[consequence.target];
            (this.currentGameState.playerStats as any)[consequence.target] =
              currentValue + consequence.change;
            console.log(
              `📊 ${consequence.target} が ${consequence.change > 0 ? '+' : ''}${consequence.change} 変化しました`
            );
          }
          break;
        case 'flag':
          this.currentGameState.gameFlags[consequence.target] = consequence.change;
          break;
      }
    }
  }

  /**
   * 役割選択
   */
  private async selectRole(): Promise<PlayerRole> {
    console.log('');
    console.log('🎭 あなたの役割を選択してください:');
    console.log('1. 英雄 - 正義感が強く、村を守る意志を持つ');
    console.log('2. 商人 - 利益を重視し、混乱から富を築く');
    console.log('3. 臆病者 - 生き延びることだけを考える');
    console.log('4. 裏切り者 - 魔王側に付くことを考える');
    console.log('5. 村人 - 平凡だが、状況に応じて変化できる');
    console.log('6. 賢者 - 知識を重視し、真理を探求する');
    console.log('7. 傭兵 - 戦闘を得意とし、報酬で動く');

    const choice = await this.askQuestion('選択してください (1-7): ');

    const roleMap: Record<string, PlayerRole> = {
      '1': 'hero',
      '2': 'merchant',
      '3': 'coward',
      '4': 'traitor',
      '5': 'villager',
      '6': 'sage',
      '7': 'mercenary',
    };

    return roleMap[choice] || 'villager';
  }

  /**
   * ステータス表示
   */
  private showStatus(): void {
    if (!this.currentGameState) return;

    console.log('');
    console.log('📊 === ステータス ===');
    console.log(`名前: ${this.currentGameState.playerName}`);
    console.log(`役割: ${this.getRoleName(this.currentGameState.playerRole)}`);
    console.log(`Day: ${this.currentGameState.currentDay}/30`);
    console.log(`場所: ${this.getLocationName(this.currentGameState.location)}`);
    console.log('--- 能力値 ---');
    console.log(`レベル: ${this.currentGameState.playerStats.level}`);
    console.log(`体力: ${this.currentGameState.playerStats.health}/100`);
    console.log(`腕力: ${this.currentGameState.playerStats.strength}/100`);
    console.log(`知識: ${this.currentGameState.playerStats.knowledge}/100`);
    console.log(`評判: ${this.currentGameState.playerStats.reputation}/100`);
    console.log(`所持金: ${this.currentGameState.playerStats.wealth}G`);
    console.log(`仲間: ${this.currentGameState.playerStats.allies.join(', ') || 'なし'}`);
    console.log('================');
    console.log('');
  }

  /**
   * ゲーム終了処理
   */
  private async endGame(): Promise<void> {
    console.log('');
    console.log('🏰 === Day 30: 魔王襲来！ ===');
    console.log('');
    console.log('魔王軍が村に到着しました...');
    console.log('あなたの30日間の準備が試される時です！');
    console.log('');
    console.log('🎊 ゲーム終了！');
    console.log('（完全なエンディング判定は今後実装予定）');

    this.rl.close();
  }

  /**
   * 場所名の変換
   */
  private getLocationName(location: string): string {
    const locationNames: Record<string, string> = {
      village_center: '村の中心',
      blacksmith: '鍛冶屋',
      tavern: '宿屋',
      forest: '森',
      market: '市場',
    };
    return locationNames[location] || location;
  }

  /**
   * 役割名の変換
   */
  private getRoleName(role: PlayerRole): string {
    const roleNames: Record<PlayerRole, string> = {
      hero: '英雄',
      merchant: '商人',
      coward: '臆病者',
      traitor: '裏切り者',
      villager: '村人',
      sage: '賢者',
      mercenary: '傭兵',
    };
    return roleNames[role];
  }

  /**
   * 特別なコマンドを処理
   */
  private async handleSpecialCommands(input: string): Promise<{ narrative: string } | null> {
    const command = input.toLowerCase();

    if (command.includes('trade') || command.includes('shop') || command.includes('buy')) {
      try {
        const tradeResult = await this.workflowManager.runTrade(
          this.currentGameState!.playerName,
          this.currentGameState!.playerRole,
          undefined, // プレイヤーに商品を選ばせる
          this.currentGameState!.playerStats.wealth,
          this.currentGameState!.currentDay,
          this.currentGameState!.playerStats.wealth
        );
        return { narrative: tradeResult.narrative || 'グロムの店を訪れました。' };
      } catch (error) {
        return { narrative: 'グロムは忙しそうで、後で来てほしいと言います。' };
      }
    }

    if (
      command.includes('magic') ||
      command.includes('prophecy') ||
      command.includes('elara') ||
      command.includes('sage')
    ) {
      try {
        const consultResult = await this.workflowManager.runMagicConsultation(
          this.currentGameState!.playerName,
          this.currentGameState!.playerRole,
          input, // プレイヤーの質問をそのまま渡す
          this.currentGameState!.currentDay
        );
        return { narrative: consultResult.narrative || 'エララの塔を訪れました。' };
      } catch (error) {
        return { narrative: 'エララは瞑想中で、後で来てほしいと言います。' };
      }
    }

    if (
      command.includes('elder') ||
      command.includes('morgan') ||
      command.includes('village chief')
    ) {
      try {
        // Elder Morganとの直接対話
        const npc = this.npcAgents['Elder_Morgan'];
        const response = await npc.generateText([
          {
            role: 'user',
            content: `プレイヤー「${this.currentGameState!.playerName}」（役割: ${this.currentGameState!.playerRole}）がDay ${this.currentGameState!.currentDay}にあなたを訪れました。プレイヤーは「${input}」と言いました。村長として適切に応答してください。`,
          },
        ]);

        return { narrative: response.text || 'モーガン村長とお話ししました。' };
      } catch (error) {
        return { narrative: 'モーガン村長は会議中で、後で来てほしいと言います。' };
      }
    }

    return null; // 特別なコマンドではない
  }

  /**
   * ヘルプを表示
   */
  private showHelp(): void {
    console.log('');
    console.log('🏰 === ゲームヘルプ ===');
    console.log('');
    console.log('📝 基本コマンド:');
    console.log('  status - ステータス表示');
    console.log('  help - このヘルプを表示');
    console.log('  quit/exit - ゲーム終了');
    console.log('');
    console.log('🤝 NPCとの対話:');
    console.log('  "elder morgan" - 村長モーガンと話す');
    console.log('  "trade" or "shop" - 商人グロムと取引');
    console.log('  "magic" or "elara" - 賢者エララに相談');
    console.log('');
    console.log('⚡ 行動例:');
    console.log('  "村を探索する" - 自由な行動');
    console.log('  "訓練をする" - 能力向上');
    console.log('  "情報を集める" - 知識獲得');
    console.log('  "武器を作る" - アイテム作成');
    console.log('');
    console.log('🎯 目標: 30日後の魔王襲来に備えよう！');
    console.log('===============================');
    console.log('');
  }

  /**
   * 状態変更をゲームステートに適用
   */
  private applyStateChangesToGameState(gameState: GameState, changes: any): GameState {
    const newState = { ...gameState };

    if (changes.stats) {
      Object.keys(changes.stats).forEach((stat) => {
        if (stat in newState.playerStats) {
          (newState.playerStats as any)[stat] = Math.max(
            0,
            Math.min(100, (newState.playerStats as any)[stat] + changes.stats[stat])
          );
        }
      });
    }

    if (changes.flags) {
      newState.gameFlags = { ...newState.gameFlags, ...changes.flags };
    }

    if (changes.location) {
      newState.location = changes.location;
    }

    if (changes.day) {
      newState.currentDay = Math.min(30, Math.max(1, changes.day));
    }

    if (changes.wealth !== undefined) {
      newState.playerStats.wealth = Math.max(0, changes.wealth);
    }

    return newState;
  }

  /**
   * 質問をする
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// ゲーム実行用のメイン関数
export async function startDemonLordRPG(): Promise<void> {
  try {
    const game = new DemonLordRPG();
    await game.startGame();
  } catch (error) {
    console.error('❌ ゲーム実行中にエラーが発生しました:', error);
    process.exit(1);
  }
}
