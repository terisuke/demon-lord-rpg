# ゲーム設計書 - 30日後の魔王襲来

## 1. ゲームコンセプト

### 1.1 概要
プレイヤーは「始まりの村アルファ」の住人として、30日後に襲来する魔王に対して自由な方法で対処する。英雄として戦うも良し、商人として利益を得るも良し、臆病者として逃げるも良し。

### 1.2 コアループ
```
[日の始まり] → [選択肢提示] → [行動実行] → [結果描写] → [日の終了]
     ↑                                                    ↓
     ←────────────────────────────────────────────────────
```

### 1.3 勝利条件
「勝利」の定義はプレイヤーの役割によって異なる：
- **英雄**: 魔王を倒す
- **商人**: 財産を築く
- **臆病者**: 生き延びる
- **裏切り者**: 魔王側で権力を得る

## 2. プレイヤーロールシステム

### 2.1 選択可能な役割

| 役割 | 初期ステータス | 固有能力 | プレイスタイル |
|------|--------------|----------|---------------|
| **英雄** | 戦闘力+2, 評判+1 | 「勇気」: 危険な選択肢が出現 | 正統派RPG |
| **商人** | 所持金×3, 交渉力+2 | 「商才」: 取引で追加利益 | 経済シミュレーション |
| **臆病者** | 隠密+3, 逃走成功率+50% | 「危険察知」: 危険を事前に警告 | サバイバル |
| **裏切り者** | 知識+2, 闇の評判+1 | 「二重スパイ」: 両陣営で活動可能 | 陰謀プレイ |
| **村人** | バランス型 | 「適応」: 途中で役割変更可能 | 自由プレイ |
| **賢者** | 知識+3, 魔法力+1 | 「予知」: 未来のヒントを得る | 戦略プレイ |
| **傭兵** | 戦闘力+3, 所持金+1 | 「戦闘経験」: 戦闘で追加報酬 | 戦闘特化 |

### 2.2 役割による選択肢の変化

```typescript
// 例：Day 10の選択肢
const getChoicesForRole = (role: PlayerRole) => {
  const baseChoices = [
    "村の防衛を手伝う",
    "情報を集める",
    "準備を整える"
  ];
  
  switch(role) {
    case "hero":
      return [...baseChoices, "魔王軍の偵察に向かう（危険）"];
    case "merchant":
      return [...baseChoices, "防衛物資を高値で売る"];
    case "coward":
      return [...baseChoices, "こっそり逃亡準備をする"];
    case "traitor":
      return [...baseChoices, "村の防衛計画を盗み聞きする"];
  }
};
```

## 3. 時間システム（30日カウントダウン）

### 3.1 時間の進行

- **1日 = 1ターン**
- **1ターンの構成**:
  1. 朝イベント（ランダムまたは固定）
  2. 行動選択（2-3回）
  3. 夕方イベント（結果と変化）
  4. 夜の準備（次の日への移行）

### 3.2 重要な日程イベント

| 日付 | イベント | 影響 |
|------|---------|------|
| **Day 1** | 予言者の警告 | ゲーム開始、役割選択 |
| **Day 5** | 最初の前兆 | 動物が逃げ始める |
| **Day 10** | 偵察隊出現 | 魔王軍の先遣隊が村を偵察 |
| **Day 15** | 空が赤く染まる | 士気低下、パニック開始 |
| **Day 20** | 避難開始 | 一部の村人が逃亡 |
| **Day 25** | 最後の準備 | 最終的な選択 |
| **Day 28** | 魔王軍接近 | 戦闘準備または逃亡 |
| **Day 29** | 前夜 | 最後の会話と決意 |
| **Day 30** | 魔王襲来 | 最終イベント |

### 3.3 日ごとの緊張度システム

```typescript
interface DailyTension {
  day: number;
  tensionLevel: number; // 0-100
  worldEvents: string[];
  npcMood: "normal" | "worried" | "panicked" | "desperate";
}

// 緊張度による変化
const getTensionEffects = (tension: number) => {
  if (tension < 30) return "村は平穏だが、不安が漂う";
  if (tension < 60) return "村人たちが準備を始め、緊張が高まる";
  if (tension < 90) return "パニックが広がり、秩序が乱れ始める";
  return "混沌。それぞれが生き残りを模索する";
};
```

## 4. NPCシステム

### 4.1 主要NPC

| NPC名 | 役割 | 性格 | 重要度 |
|-------|------|------|--------|
| **エルダー・モーガン** | 村長 | 威厳がある、保守的 | ★★★ |
| **エララ** | 賢者 | 神秘的、知識豊富 | ★★★ |
| **グロム** | 鍛冶屋/商人 | 無骨、正直 | ★★ |
| **リリアン** | 宿屋の女将 | 情報通、おしゃべり | ★★ |
| **シャドウ** | 謎の旅人 | 不審、実は魔王の配下 | ★★★ |
| **ティミー** | 村の子供 | 純粋、勇敢 | ★ |
| **マーカス** | 衛兵隊長 | 忠実、勇敢 | ★★ |

### 4.2 NPC関係性システム

```typescript
interface NPCRelationship {
  npcName: string;
  affinity: number; // -100 to +100
  trust: number;    // 0 to 100
  knowledge: string[]; // NPCが知っている情報
}

// 関係性による対話の変化
const getNPCResponse = (npc: NPC, affinity: number) => {
  if (affinity > 50) return "friendly"; // 協力的
  if (affinity > 0) return "neutral";   // 中立
  if (affinity > -50) return "cold";    // 冷淡
  return "hostile"; // 敵対的
};
```

## 5. エンディングシステム

### 5.1 エンディング条件

| エンディング | 必要条件 | 結果 |
|------------|---------|------|
| **完璧な勝利** | 戦闘力80+, 同盟3+, 知識80+ | 魔王撃退、英雄として歴史に名を残す |
| **犠牲を伴う勝利** | 戦闘力50+, 同盟2+ | 魔王撃退、しかし村は半壊 |
| **戦術的撤退** | 生存準備60+ | 村人の半数を救って撤退 |
| **商人の成功** | 所持金10000+ | 混乱に乗じて大富豪に |
| **臆病者の生存** | 隠れ家完成 | 一人で生き延びる |
| **裏切りの成功** | 魔王好感度80+ | 魔王軍の幹部として君臨 |
| **完全な敗北** | 準備不足 | 村は滅び、歴史から消える |
| **予想外の和平** | 特殊条件 | 魔王との交渉に成功 |

### 5.2 エンディング分岐ロジック

```typescript
const calculateEnding = (gameState: GameState): Ending => {
  const scores = {
    combat: calculateCombatScore(gameState),
    survival: calculateSurvivalScore(gameState),
    wealth: calculateWealthScore(gameState),
    betrayal: calculateBetrayalScore(gameState)
  };
  
  // プレイヤーの役割と行動に基づいて最適なエンディングを選択
  return selectBestEnding(gameState.playerRole, scores);
};
```

## 6. ゲーム内経済システム

### 6.1 リソース

| リソース | 入手方法 | 用途 |
|---------|---------|------|
| **ゴールド** | クエスト、取引、戦闘 | アイテム購入、賄賂 |
| **食料** | 農作業、購入、略奪 | 生存、士気向上 |
| **武器** | 鍛冶屋、発見、作成 | 戦闘力向上 |
| **情報** | 会話、偵察、購入 | 選択肢解放、有利な展開 |
| **評判** | 善行、クエスト完了 | NPC協力、同盟 |
| **闇の評判** | 裏切り、悪行 | 裏ルート解放 |

### 6.2 取引システム

```typescript
interface TradeOffer {
  item: string;
  basePrice: number;
  merchantBonus: number; // 商人役割のボーナス
  demandMultiplier: number; // 日数による需要変動
}

// Day 25の武器価格は10倍になる
const calculatePrice = (offer: TradeOffer, day: number) => {
  const panicMultiplier = Math.min(day / 10, 3);
  return offer.basePrice * offer.demandMultiplier * panicMultiplier;
};
```

## 7. クエストシステム

### 7.1 メインクエスト

1. **序章**: 予言を調査する（Day 1-5）
2. **中盤**: 村の防衛準備（Day 6-20）
3. **終盤**: 最終決戦への準備（Day 21-29）
4. **クライマックス**: 魔王襲来（Day 30）

### 7.2 サイドクエスト例

| クエスト名 | 開始日 | 報酬 | 影響 |
|-----------|-------|------|------|
| 失われた剣 | Day 3+ | 伝説の武器 | 戦闘力+10 |
| 商人の護衛 | Day 7+ | 1000G | 商人ギルドの信頼 |
| 古代の呪文書 | Day 10+ | 魔法習得 | 特殊エンディング解放 |
| 村の子供を探す | Day 15+ | 評判+20 | 村人の協力 |
| スパイを暴く | Day 20+ | 情報 | 裏切り者ルート |

## 8. 戦闘システム（簡易版）

### 8.1 戦闘の流れ

```typescript
interface CombatState {
  playerHP: number;
  enemyHP: number;
  turn: number;
}

// シンプルな戦闘解決
const resolveCombat = (player: Player, enemy: Enemy): CombatResult => {
  const playerPower = player.strength + player.weaponBonus;
  const enemyPower = enemy.strength;
  
  // 自動解決（詳細な戦闘は物語で描写）
  if (playerPower > enemyPower * 1.5) return "EASY_VICTORY";
  if (playerPower > enemyPower) return "VICTORY";
  if (playerPower > enemyPower * 0.7) return "NARROW_VICTORY";
  return "DEFEAT";
};
```

## 9. 音声演出設計（予定）

### 9.1 音声が必要なシーン

- **重要な台詞**: NPCの決定的な発言
- **ナレーション**: 日の始まりと終わり
- **緊急イベント**: 魔王軍接近などの警告
- **エンディング**: 各エンディングの語り

### 9.2 音声キャラクター設定

| キャラクター | 音声タイプ | 用途 |
|------------|-----------|------|
| ナレーター | 落ち着いた中性的 | 物語進行 |
| 村長 | 威厳のある老人 | 重要な決定 |
| 魔王 | 威圧的で低音 | 最終イベント |

## 10. バランス調整ガイドライン

### 10.1 難易度カーブ

- **Day 1-10**: チュートリアル期間、失敗してもリカバリー可能
- **Day 11-20**: 選択の重要性が増す、リソース管理が重要に
- **Day 21-30**: 最終準備、これまでの選択が結果に直結

### 10.2 プレイ時間目安

- **1周目**: 2-3時間
- **全エンディング**: 10-15時間
- **1日あたり**: 5-10分

---

*このゲーム設計書は開発中に随時更新されます。*
