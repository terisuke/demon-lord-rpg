import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';
import { z } from 'zod';

/**
 * Elder Morgan - 村長
 * 威厳のある村の長老。政治的決定と村の運営を担当
 */
export class ElderMorganAgent extends Agent<{ llm: VercelAIProvider }> {
  constructor() {
    super({
      name: 'Elder_Morgan',
      instructions: `
あなたはアルファ村の村長、**エルダー・モーガン**です。

## あなたの性格と特徴
- 年齢: 65歳の威厳ある老人
- 性格: 保守的で慎重、しかし村人を深く愛している
- 経験: 40年以上村を統治してきた豊富な経験
- 知識: 古い伝承や魔王に関する知識を持つ
- 責任感: 村人全員の命を預かる重責を感じている

## あなたの役割
- 村の政治的決定を下す
- 村人に指示や情報を提供する  
- 魔王襲来に関する古い予言や知識を伝える
- プレイヤーの行動に対して村長として適切に判断する
- 村の防衛計画の責任者

## 話し方
- 丁寧で格調高い言葉遣い
- 「〜である」「〜であろう」などの古風な表現
- プレイヤーの役割に応じて態度を変化させる
- 重要な決定は慎重に、しかし必要時は断固として

## 知っている情報
- 30日後の魔王襲来の予言
- 村の歴史と古い伝承
- 村人たちの性格や能力
- 過去の魔王襲来の記録（50年前）
- 村の防衛施設と戦力

## 対応方針
- 英雄役: 期待と信頼を込めて接する
- 商人役: 村への貢献を期待しつつ警戒
- 臆病者役: 理解を示しつつ勇気を促す
- 裏切り者役: 本性を見抜き注意深く監視
- 村人役: 親しみやすく指導的に
- 賢者役: 知識人として敬意を払う
- 傭兵役: 実力を認めつつ警戒を保つ

常にJSON形式で応答し、状況に応じた具体的なアドバイスや指示を含めてください。
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-3-mini'), // コスト最適化
      tools: [
        {
          id: 'issue_village_decree',
          name: 'issue_village_decree',
          description: '村の布告を発布する',
          parameters: z.object({
            decree: z.string().describe('布告の内容'),
            urgency: z.enum(['low', 'medium', 'high']).describe('緊急度'),
          }),
          execute: async (params: {
            decree: string;
            urgency: 'low' | 'medium' | 'high';
          }): Promise<string> => {
            return `村長令を発布しました: ${params.decree} (緊急度: ${params.urgency})`;
          },
        },
        {
          id: 'consult_village_records',
          name: 'consult_village_records',
          description: '村の記録を調査する',
          parameters: z.object({
            topic: z.string().describe('調査するトピック'),
          }),
          execute: async (params: { topic: string }): Promise<string> => {
            const records: Record<string, string> = {
              demon_lord:
                '50年前の魔王襲来では村の半数が犠牲になった。勇者カレンが魔王を封印した。',
              defense: '村には古い見張り塔と地下避難所がある。武器は限られている。',
              prophecy:
                '賢者エララの予言書に「黒き翼が再び舞う時、選ばれし者が道を決める」とある。',
            };
            return records[params.topic] || '該当する記録は見つかりませんでした。';
          },
        },
      ],
    });
  }
}

/**
 * Merchant Grom - 商人兼鍛冶屋
 * 実直な性格で商売と武器製作を担当
 */
export class MerchantGromAgent extends Agent<{ llm: VercelAIProvider }> {
  constructor() {
    super({
      name: 'Merchant_Grom',
      instructions: `
あなたは村の商人兼鍛冶屋、**グロム**です。

## あなたの性格と特徴
- 年齢: 45歳の筋骨たくましい男性
- 性格: 実直で正直、商売熱心だが村人想い
- 職業: 商人として交易、鍛冶屋として武器防具製作
- 経験: 20年以上の商売と鍛冶の経験
- 信念: 正直な商売と品質の良い製品作り
- 家族: 妻と二人の子供がいる

## あなたの役割
- 武器・防具・道具の販売と製作
- 他の村や街との交易情報提供
- 魔王襲来への準備として装備の強化
- 村の経済活動の中心人物
- プレイヤーとの取引交渉

## 話し方
- 関西弁風の親しみやすい口調
- 「〜やで」「〜やなあ」などの語尾
- 商売の話になると熱心になる
- 家族の話をよくする
- 実用的で現実的な助言をする

## 扱っている商品と情報
- 武器: 剣、槍、弓、矢
- 防具: 革鎧、鉄の盾
- 道具: ランタン、ロープ、薬草
- 食料: パン、肉、保存食
- 交易情報: 近隣の村の状況、物価情報
- 素材: 鉄鉱石、革、木材

## 価格設定（魔王襲来が近づくと値上がり）
- Day 1-10: 通常価格
- Day 11-20: 1.5倍
- Day 21-30: 3倍（需要急増）

## 対応方針
- 英雄役: 武器を安く提供、質の良いものを推薦
- 商人役: 仲間として特別価格で取引
- 臆病者役: 防護用品を重点的に推薦
- 裏切り者役: 警戒しつつも商売は継続
- 村人役: 近所付き合いとして親切に
- 賢者役: 知識と引き換えに貴重品を提示
- 傭兵役: プロとして良い装備を推薦

常にJSON形式で応答し、具体的な商品や価格、アドバイスを含めてください。
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-3-mini'), // コスト最適化
      tools: [
        {
          id: 'check_inventory',
          name: 'check_inventory',
          description: '在庫を確認する',
          parameters: z.object({
            item: z.string().describe('確認したいアイテム名'),
          }),
          execute: async (params: { item: string }): Promise<string> => {
            const inventory: Record<string, { stock: number; price: number; quality: string }> = {
              sword: { stock: 5, price: 100, quality: 'good' },
              shield: { stock: 3, price: 80, quality: 'excellent' },
              armor: { stock: 2, price: 200, quality: 'good' },
              bow: { stock: 4, price: 60, quality: 'fair' },
              potion: { stock: 10, price: 25, quality: 'good' },
            };

            const item = inventory[params.item.toLowerCase()];
            return item
              ? `${params.item}: 在庫${item.stock}個、価格${item.price}G、品質${item.quality}`
              : `申し訳ないが、${params.item}は在庫切れやで`;
          },
        },
        {
          id: 'craft_item',
          name: 'craft_item',
          description: 'アイテムを製作する',
          parameters: z.object({
            item: z.string().describe('製作するアイテム'),
            quality: z.enum(['basic', 'good', 'excellent']).describe('品質レベル'),
          }),
          execute: async (params: {
            item: string;
            quality: 'basic' | 'good' | 'excellent';
          }): Promise<string> => {
            const craftTime = {
              basic: '2時間',
              good: '半日',
              excellent: '1日',
            };

            return `${params.item}（${params.quality}品質）の製作を開始するで。完成まで${craftTime[params.quality]}かかるな。`;
          },
        },
      ],
    });
  }
}

/**
 * Elara the Sage - 賢者
 * 魔法と予言に詳しい知識人
 */
export class ElaraSageAgent extends Agent<{ llm: VercelAIProvider }> {
  constructor() {
    super({
      name: 'Elara_Sage',
      instructions: `
あなたは村の賢者、**エララ**です。

## あなたの性格と特徴
- 年齢: 35歳の美しく神秘的な女性
- 性格: 知的で冷静、しかし村人を思いやる心を持つ
- 職業: 賢者として魔法の研究と予言の解釈
- 知識: 古代魔法、予言、魔王の歴史に精通
- 能力: 簡単な魔法と予言の能力
- 住居: 村はずれの塔で研究生活

## あなたの役割  
- 魔法に関する助言と指導
- 予言の解釈と未来への洞察
- 魔王に関する古代知識の提供
- プレイヤーに魔法的な支援を提供
- 古代文書の翻訳と研究

## 話し方
- 上品で知的な言葉遣い
- 時々詩的で比喩的な表現を使う
- 「〜ですわ」「〜でしょうね」などの丁寧語
- 重要なことは謎かけのように話すことがある
- 知識を分かちあうことを好む

## 保有する知識と能力
- 古代魔法: 治癒、防護、占術の魔法
- 予言解釈: 未来の出来事への洞察
- 歴史知識: 魔王の正体と過去の戦い
- 古代文字: 失われた言語の翻訳
- 薬草学: 魔法的な薬の調合

## 対応方針
- 英雄役: 運命の導き手として支援
- 商人役: 知識の価値を認め情報交換
- 臆病者役: 優しく勇気を与える助言
- 裏切り者役: 心の闇を見抜き警告
- 村人役: 親しみやすく教導的に
- 賢者役: 同じ知識人として対等に交流
- 傭兵役: 力と知識の両立を評価

常にJSON形式で応答し、魔法的な知識や予言的な洞察を含めてください。
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-3-mini'), // コスト最適化
      tools: [
        {
          id: 'cast_divination',
          name: 'cast_divination',
          description: '占術を行う',
          parameters: z.object({
            question: z.string().describe('占いたい内容'),
            type: z.enum(['near_future', 'danger', 'success_chance']).describe('占いの種類'),
          }),
          execute: async (params: {
            question: string;
            type: 'near_future' | 'danger' | 'success_chance';
          }): Promise<string> => {
            const divinations = {
              near_future: '星々は変化の兆しを告げています。慎重な行動が吉となるでしょう。',
              danger: '暗雲が立ち込めています。警戒を怠らず、仲間を信じることが肝要です。',
              success_chance:
                '運命は貴方の意志にかかっています。準備を整えれば道は開けるでしょう。',
            };

            return `占術の結果: ${divinations[params.type]}`;
          },
        },
        {
          id: 'research_ancient_lore',
          name: 'research_ancient_lore',
          description: '古代知識を研究する',
          parameters: z.object({
            topic: z.string().describe('研究するトピック'),
          }),
          execute: async (params: { topic: string }): Promise<string> => {
            const lore: Record<string, string> = {
              demon_lord: '魔王は1000年ごとに蘇る古代の邪悪。真の封印には4つの聖なる石が必要。',
              ancient_magic: '失われた魔法の多くは、純粋な心と強い意志によってのみ発動する。',
              prophecy:
                '予言書には「異なる道を歩む者が一つとなる時、新たな運命が紡がれる」とあります。',
            };

            return (
              lore[params.topic] ||
              '該当する古代知識は見つかりませんが、更なる研究が必要かもしれません。'
            );
          },
        },
      ],
    });
  }
}
