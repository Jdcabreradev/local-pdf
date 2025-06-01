// test-api.ts
interface ApiResponse {
  success: boolean;
  answer?: string;
  error?: string;
}

async function callChatApi(question: string, thread: string = "shadow"): Promise<ApiResponse> {
  try {
    const response = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        thread
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testWithLoop() {
  console.log("=== Testing PDF Agent Persistence via API ===");
  
  try {
    // First query - will process PDF
    console.log("\n--- Query 1 (First time) ---");
    const result1 = await callChatApi("¿Cuál es el tema principal del documento?", "shadow");
    
    if (result1.success) {
      console.log("Respuesta 1:", result1.answer);
    } else {
      console.log("Error en Query 1:", result1.error);
    }

    // Second query - should skip processing
    console.log("\n--- Query 2 (Should use cache) ---");
    const result2 = await callChatApi("¿Hay alguna conclusión importante?", "shadow");
    
    if (result2.success) {
      console.log("Respuesta 2:", result2.answer);
    } else {
      console.log("Error en Query 2:", result2.error);
    }

    // Third query - should still use cache
    console.log("\n--- Query 3 (Should still use cache) ---");
    const result3 = await callChatApi("¿Cuántas páginas tiene el documento?", "shadow");
    
    if (result3.success) {
      console.log("Respuesta 3:", result3.answer);
    } else {
      console.log("Error en Query 3:", result3.error);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the test
testWithLoop();

// Export for potential reuse
export { callChatApi, testWithLoop };