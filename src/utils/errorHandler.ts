// src/utils/errorHandler.ts - 統一エラーハンドリング
export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class APIError extends GameError {
  constructor(message: string, public statusCode?: number, context?: any) {
    super(message, 'API_ERROR', context);
  }
}

export class AIError extends GameError {
  constructor(message: string, context?: any) {
    super(message, 'AI_ERROR', context);
  }
}

export class ValidationError extends GameError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

export function handleError(error: unknown, context: string): string {
  console.error(`[${context}] エラー:`, error);
  
  if (error instanceof GameError) {
    return `ゲームエラー: ${error.message}`;
  }
  
  if (error instanceof Error) {
    // API関連エラー
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'ネットワークエラーが発生しました。しばらく待ってから再試行してください。';
    }
    
    // レート制限エラー
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return 'API制限に達しました。少し時間をおいてから再試行してください。';
    }
    
    return `予期しないエラー: ${error.message}`;
  }
  
  return '不明なエラーが発生しました。';
}