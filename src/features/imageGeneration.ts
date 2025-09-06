// src/features/imageGeneration.ts
export async function generateSceneImage(prompt: string, day: number): Promise<string | null> {
  // 3日ごとに画像生成（Day 1, 4, 7, 10, 13, 16, 19, 22, 25, 28）
  if (day !== 1 && day % 3 !== 1) {
    return null;
  }

  try {
    const requestBody = {
      model: 'grok-2-image-1212',
      prompt: `fantasy RPG scene: ${prompt}`,
      n: 1,
    };

    console.log(`🎨 画像生成リクエスト (Day ${day}):`, requestBody);

    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`画像生成失敗: ${response.status}`);
      console.error(`エラー詳細:`, errorBody);
      return null;
    }

    const result = await response.json();
    console.log(`✨ 画像生成成功 (Day ${day}): ${result.data[0].url}`);
    return result.data[0].url;
  } catch (error) {
    console.error('画像生成エラー:', error);
    return null;
  }
}

// 使用例
// const imageUrl = await generateSceneImage("村の平和な朝", 1);
