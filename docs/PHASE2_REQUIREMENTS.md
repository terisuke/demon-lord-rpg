# 🚀 PHASE 2 開発指示書

## 現在の状況
基本的なAI統合は完了しましたが、「真のAI駆動型RPG」にはまだ改善が必要です。

## 🔥 優先度P0: 即座に修正（今日中）

### 1. generateObject問題の完全解決

```typescript
// src/services/GrokService.ts の修正

static async generateChoices(
  day: number,
  narrative: string,
  gameState: any
): Promise<string[]> {
  const prompt = `
現在Day ${day}/30。状況: ${narrative}
プレイヤー（${gameState.playerRole}）の選択肢を4個だけ生成。
各選択肢は20文字以内。改行区切りで出力:
`;

  try {
    const { text } = await generateText({
      model: xai('grok-3-mini'),
      prompt,
      temperature: 0.7,
      maxTokens: 150,
    });

    // シンプルな改行分割
    const choices = text
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 4);

    return choices.length > 0 ? choices : [
      "様子を見る",
      "村長に相談",
      "準備を進める",
      "情報を集める"
    ];
  } catch (error) {
    console.error('選択肢生成エラー:', error);
    return ["続ける", "休む", "探索する", "話を聞く"];
  }
}
```

### 2. リアルタイムフィードバック

```typescript
// src/game/GameLoop.ts に追加

// プレイヤーアクションの即座の影響
private applyImmediateEffects(action: string): string {
  let effect = "";
  
  // キーワードに応じた即座の反応
  if (action.includes("攻撃") || action.includes("戦う")) {
    this.gameState.reputation -= 10;
    effect = "【攻撃的な行動により評判が下がった】";
  }
  
  if (action.includes("助ける") || action.includes("守る")) {
    this.gameState.reputation += 10;
    effect = "【英雄的な行動により評判が上がった】";
  }
  
  if (action.includes("盗む") || action.includes("奪う")) {
    this.gameState.gold += 50;
    this.gameState.reputation -= 20;
    effect = "【盗みにより金を得たが、評判が大きく下がった】";
  }
  
  if (action.includes("買う") || action.includes("購入")) {
    if (this.gameState.gold >= 50) {
      this.gameState.gold -= 50;
      effect = "【買い物により50ゴールド消費】";
    } else {
      effect = "【所持金が足りない！】";
    }
  }
  
  return effect;
}
```

## 📊 優先度P1: 本日中に実装

### 3. ゲームバランス調整

```typescript
// src/config/gameBalance.ts - 新規作成

export const GAME_BALANCE = {
  // 日数による難易度カーブ
  difficultyByDay: {
    1: { tension: 0.1, eventChance: 0.1 },
    10: { tension: 0.3, eventChance: 0.3 },
    20: { tension: 0.6, eventChance: 0.5 },
    25: { tension: 0.8, eventChance: 0.7 },
    30: { tension: 1.0, eventChance: 1.0 }
  },
  
  // 評判による影響
  reputationEffects: {
    veryLow: { min: -100, max: -50, choiceBonus: -2 },
    low: { min: -49, max: -10, choiceBonus: -1 },
    neutral: { min: -9, max: 9, choiceBonus: 0 },
    good: { min: 10, max: 49, choiceBonus: 1 },
    hero: { min: 50, max: 100, choiceBonus: 2 }
  },
  
  // エンディング条件（明確化）
  endings: {
    "真の英雄": {
      conditions: { reputation: 80, gold: 500, flags: ["defeated_demon"] },
      description: "魔王を倒し、村を救った真の英雄"
    },
    "賢者の勝利": {
      conditions: { reputation: 50, flags: ["found_weakness", "gathered_allies"] },
      description: "知恵と仲間の力で魔王を退けた"
    },
    "金の力": {
      conditions: { gold: 1000, flags: ["hired_mercenaries"] },
      description: "莫大な富で傭兵を雇い、村を守った"
    },
    "裏切り者": {
      conditions: { reputation: -50, flags: ["joined_demon"] },
      description: "魔王側について村を売った"
    },
    "逃亡者": {
      conditions: { flags: ["fled_village"] },
      description: "村を捨てて逃げ出した"
    },
    "普通の結末": {
      conditions: {},
      description: "村人として最後まで戦った"
    }
  }
};
```

### 4. プレイヤー役割システムの実装

```typescript
// src/game/PlayerRoles.ts - 新規作成

export interface PlayerRole {
  name: string;
  description: string;
  startingStats: {
    gold: number;
    reputation: number;
    strength: number;
    intelligence: number;
    charisma: number;
  };
  specialActions: string[];
}

export const PLAYER_ROLES: Record<string, PlayerRole> = {
  hero: {
    name: "英雄",
    description: "正義感溢れる戦士",
    startingStats: { gold: 100, reputation: 20, strength: 10, intelligence: 5, charisma: 5 },
    specialActions: ["英雄的な演説をする", "勇敢に立ち向かう", "村人を鼓舞する"]
  },
  merchant: {
    name: "商人",
    description: "金で問題を解決する",
    startingStats: { gold: 500, reputation: 0, strength: 3, intelligence: 7, charisma: 10 },
    specialActions: ["取引を持ちかける", "賄賂を渡す", "価格交渉する"]
  },
  wizard: {
    name: "魔法使い",
    description: "知識と魔法の使い手",
    startingStats: { gold: 50, reputation: 10, strength: 2, intelligence: 15, charisma: 3 },
    specialActions: ["魔法を使う", "古代の書物を調べる", "魔法陣を描く"]
  },
  thief: {
    name: "盗賊",
    description: "影から行動する者",
    startingStats: { gold: 200, reputation: -20, strength: 7, intelligence: 8, charisma: 5 },
    specialActions: ["こっそり盗む", "情報を盗み聞く", "罠を仕掛ける"]
  },
  coward: {
    name: "臆病者",
    description: "生き残ることが最優先",
    startingStats: { gold: 150, reputation: -10, strength: 4, intelligence: 6, charisma: 10 },
    specialActions: ["逃げる", "隠れる", "言い訳をする", "他人のせいにする"]
  }
};
```

## 🎮 優先度P2: 明日実装

### 5. セーブ/ロード機能

```typescript
// src/services/SaveService.ts

export class SaveService {
  private static SAVE_KEY = 'demon-lord-rpg-save';
  
  static saveGame(gameLoop: GameLoop): void {
    const saveData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      day: gameLoop.currentDayNumber,
      state: gameLoop.gameStateData,
    };
    
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
    console.log('💾 ゲームをセーブしました');
  }
  
  static loadGame(): any | null {
    const data = localStorage.getItem(this.SAVE_KEY);
    if (!data) return null;
    
    try {
      const saveData = JSON.parse(data);
      console.log('💾 セーブデータを読み込みました');
      return saveData;
    } catch (error) {
      console.error('セーブデータの読み込みに失敗:', error);
      return null;
    }
  }
  
  static hasSaveData(): boolean {
    return !!localStorage.getItem(this.SAVE_KEY);
  }
}
```

### 6. UI/UX改善

- ローディング中のプログレスバー
- 選択肢のアニメーション改善
- サウンドエフェクト（クリック音など）
- ダークモード/ライトモード切り替え
- 文字サイズ調整機能

## 📈 成功指標（KPI）

| 指標 | 現在 | 目標 | 測定方法 |
|------|-----|------|---------|
| 平均プレイ時間 | 不明 | 20分以上 | アナリティクス |
| Day30到達率 | 不明 | 30%以上 | 完了率追跡 |
| エンディング種類到達 | 1種類 | 全6種類 | 実績システム |
| 自由入力使用率 | 不明 | 50%以上 | 入力ログ |
| エラー発生率 | 高 | 1%未満 | エラー監視 |

## 🔧 テスト項目

### 必須テストケース
```
1. [ ] 通常プレイでDay 30まで到達できる
2. [ ] 自由入力で「魔王と友達になる」が処理される
3. [ ] 画像生成がDay 1, 10, 20, 30で動作
4. [ ] 5種類以上の異なるエンディングに到達可能
5. [ ] 1000回のAPI呼び出しでエラー率1%未満
6. [ ] セーブ/ロードが正常動作
7. [ ] 評判が-100〜+100の範囲で変動
8. [ ] 所持金が0以下でも続行可能
```

## 📝 報告要項

### 本日18:00までに報告
1. P0修正の完了状況
2. P1実装の進捗率
3. 動作するデモのURL
4. 発生した問題と解決策
5. プレイテストの感想

### デモ動画の作成
- Day 1〜5のプレイ動画（3分）
- 自由入力の動作例
- 異なるエンディング2種類

---

**締切: 本日18:00**
**次回レビュー: 明日10:00**

開発チームは上記に従って実装を進めてください。
定期的な進捗報告を忘れずに！