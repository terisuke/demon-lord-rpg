import { createWorkflowChain } from '@voltagent/core';

console.log('createWorkflowChain type:', typeof createWorkflowChain);

if (createWorkflowChain) {
  console.log('✅ createWorkflowChain exists');
  
  // 簡単なワークフローを作成してテスト
  const testWorkflow = createWorkflowChain()
    .andThen((context) => {
      console.log('Step 1:', context);
      return { ...context, step1: 'completed' };
    })
    .andThen((context) => {
      console.log('Step 2:', context);
      return { ...context, step2: 'completed' };
    });
  
  // 実行
  testWorkflow.execute({ test: 'data' })
    .then(result => {
      console.log('✅ Workflow Result:', result);
    })
    .catch(error => {
      console.error('❌ Workflow Error:', error.message);
    });
} else {
  console.log('❌ createWorkflowChain not found');
}
