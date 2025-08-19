/**
 * Utility functions for Ollama integration
 */

/**
 * Tests connection to an Ollama instance
 * @param baseUrl The base URL of the Ollama instance (e.g., "http://localhost:11434")
 * @returns Promise<boolean> True if connection is successful, false otherwise
 */
export async function testOllamaConnection(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.warn(`Failed to connect to Ollama at ${baseUrl}:`, error);
    return false;
  }
}

/**
 * Gets the list of available models from an Ollama instance
 * @param baseUrl The base URL of the Ollama instance
 * @returns Promise<string[]> Array of model names, empty array if connection fails
 */
export async function getAvailableOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.map((model) => model.name) || [];
  } catch (error) {
    console.warn(`Failed to fetch Ollama models from ${baseUrl}:`, error);
    return [];
  }
}

/**
 * Common Ollama error messages and their user-friendly descriptions
 */
export const OLLAMA_ERROR_MESSAGES = {
  CONNECTION_REFUSED: 'Ollama service is not running. Please start Ollama and try again.',
  MODEL_NOT_FOUND: 'The requested model is not available. Please pull the model first using: ollama pull <model-name>',
  INSUFFICIENT_MEMORY: 'Insufficient memory to load the model. Consider using a smaller model or freeing up system memory.',
  TIMEOUT: 'Ollama request timed out. The model may be loading or the request is taking longer than expected.',
  UNKNOWN: 'An unknown error occurred while communicating with Ollama.',
};

/**
 * Maps common error patterns to user-friendly messages
 * @param error The error object or message
 * @returns User-friendly error message
 */
export function getOllamaErrorMessage(error: any): string {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection refused')) {
    return OLLAMA_ERROR_MESSAGES.CONNECTION_REFUSED;
  }
  
  if (errorMessage.includes('model not found') || errorMessage.includes('404')) {
    return OLLAMA_ERROR_MESSAGES.MODEL_NOT_FOUND;
  }
  
  if (errorMessage.includes('out of memory') || errorMessage.includes('OOM')) {
    return OLLAMA_ERROR_MESSAGES.INSUFFICIENT_MEMORY;
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return OLLAMA_ERROR_MESSAGES.TIMEOUT;
  }
  
  return OLLAMA_ERROR_MESSAGES.UNKNOWN;
}
