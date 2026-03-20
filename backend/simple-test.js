// Simple embedding test
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Google Generative AI embedding...');

async function testEmbedding() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ GenAI initialized');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    console.log('✅ Model created');
    
    const result = await model.embedContent({
      content: { parts: [{ text: 'Hello world, this is a test.' }] },
    });
    
    console.log('✅ Embedding successful!');
    console.log('Dimensions:', result.embedding.values.length);
    console.log('First 5 values:', result.embedding.values.slice(0, 5));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testEmbedding();
