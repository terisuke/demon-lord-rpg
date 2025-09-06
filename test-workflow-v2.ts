import { createWorkflow, andThen, andAgent } from '@voltagent/core';

console.log('🧪 Volt Agent Workflow Test v2');

async function testWorkflow() {
  try {
    console.log('Testing createWorkflow...');
    
    // createWorkflowではなくcreateWorkflowを試す
    const workflow = createWorkflow({
      name: 'testWorkflow',
      steps: [
        {
          name: 'step1',
          execute: async (context: any) => {
            console.log('Step 1 executing with context:', context);
            return { ...context, step1: 'completed' };
          }
        },
        {
          name: 'step2',
          execute: async (context: any) => {
            console.log('Step 2 executing with context:', context);
            return { ...context, step2: 'completed', result: 'Success!' };
          }
        }
      ]
    });
    
    // ワークフローがオブジェクトの場合
    console.log('Workflow type:', typeof workflow);
    console.log('Workflow properties:', Object.keys(workflow));
    
    // 実行を試みる
    if (typeof workflow.execute === 'function') {
      const result = await workflow.execute({ test: 'data' });
      console.log('✅ Workflow Result:', result);
    } else if (typeof workflow.run === 'function') {
      const result = await workflow.run({ test: 'data' });
      console.log('✅ Workflow Result:', result);
    } else {
      console.log('Workflow object:', workflow);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWorkflow();
