import { createWorkflowChain } from '@voltagent/core';

console.log('🧪 Volt Agent Workflow Test');
console.log('createWorkflowChain type:', typeof createWorkflowChain);

async function testWorkflow() {
  if (createWorkflowChain) {
    console.log('✅ createWorkflowChain exists');
    
    try {
      // 簡単なワークフローを作成してテスト
      const testWorkflow = createWorkflowChain()
        .andThen((context: any) => {
          console.log('Step 1 context:', context);
          return { ...context, step1: 'completed' };
        })
        .andThen((context: any) => {
          console.log('Step 2 context:', context);
          return { ...context, step2: 'completed', result: 'Success!' };
        });
      
      // 実行
      const result = await testWorkflow.execute({ test: 'data', initial: true });
      console.log('✅ Workflow Result:', result);
      
    } catch (error) {
      console.error('❌ Workflow Error:', error);
    }
  } else {
    console.log('❌ createWorkflowChain not found');
  }
}

testWorkflow();
