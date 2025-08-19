# Ollama Integration To-Do List

## Overview
This document outlines the comprehensive plan to integrate Ollama as a fourth LLM provider alongside the existing Anthropic, OpenAI, and Google GenAI support in the Open SWE project.

## Implementation Phases

### Phase 1: Core Integration (Priority: High)
**Timeline: Week 1-2**

#### 1. Provider Configuration
- [ ] **1.1** Add "ollama" to `PROVIDER_FALLBACK_ORDER` array in `/apps/open-swe/src/utils/llms/model-manager.ts` (line 47-49)
  ```typescript
  export const PROVIDER_FALLBACK_ORDER = [
    "openai",
    "anthropic", 
    "google-genai",
    "ollama",  // Add this line
  ] as const;
  ```
- [ ] **1.2** Update `Provider` type definition - it automatically derives from `PROVIDER_FALLBACK_ORDER` array (no changes needed)
- [ ] **1.3** Update `providerToApiKey` function (lines 74-84) to handle Ollama case:
  ```typescript
  const providerToApiKey = (
    providerName: string,
    apiKeys: Record<string, string>,
  ): string => {
    switch (providerName) {
      case "openai":
        return apiKeys.openaiApiKey;
      case "anthropic":
        return apiKeys.anthropicApiKey;
      case "google-genai":
        return apiKeys.googleApiKey;
      case "ollama":
        return apiKeys.ollamaApiKey || ""; // Optional API key for Ollama
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  };
  ```

#### 2. Model Manager Updates  
- [ ] **2.1** Add Ollama default models to `getDefaultModelForProvider` method (lines 380-404):
  ```typescript
  const defaultModels: Record<Provider, Record<LLMTask, string>> = {
    anthropic: { /* existing */ },
    "google-genai": { /* existing */ },
    openai: { /* existing */ },
    ollama: {
      [LLMTask.PLANNER]: "llama3.1:70b",
      [LLMTask.PROGRAMMER]: "codellama:34b", 
      [LLMTask.REVIEWER]: "llama3.1:8b",
      [LLMTask.ROUTER]: "llama3.1:8b",
      [LLMTask.SUMMARIZER]: "llama3.1:13b",
    },
  };
  ```
- [ ] **2.2** Update `initializeModel` method (lines 161-207) to handle Ollama base URL:
  ```typescript
  // Add after line 183 (after apiKey assignment):
  const baseURL = provider === "ollama" 
    ? process.env.OLLAMA_API_BASE || "http://localhost:11434"
    : undefined;
  
  const modelOptions: InitChatModelArgs = {
    modelProvider: provider,
    max_retries: MAX_RETRIES,
    ...(apiKey ? { apiKey } : {}),
    ...(baseURL ? { baseURL } : {}),
    // ... rest of existing options
  };
  ```
- [ ] **2.3** Circuit breaker pattern will automatically include Ollama since it uses the provider string as the key (no changes needed)

#### 3. LangChain Integration
- [ ] **3.1** Install `@langchain/ollama` package dependency:
  ```bash
  # In /apps/open-swe/ directory:
  yarn add @langchain/ollama
  ```
- [ ] **3.2** No model factory changes needed - LangChain universal chat models (`initChatModel`) handles Ollama automatically when `@langchain/ollama` is installed
- [ ] **3.3** Test compatibility by running a simple chat completion with Ollama in test environment

### Phase 2: UI and Configuration (Priority: High)
**Timeline: Week 2-3**

#### 4. Web Interface Updates
- [ ] **4.1** Add Ollama to `API_KEY_DEFINITIONS` in `/apps/web/src/features/settings-page/api-keys.tsx` (line 41):
  ```typescript
  const API_KEY_DEFINITIONS = {
    llms: [
      { id: "anthropicApiKey", name: "Anthropic" },
      { id: "openaiApiKey", name: "OpenAI" },
      { id: "googleApiKey", name: "Google Gen AI" },
      { id: "ollamaApiKey", name: "Ollama", description: "Optional - for hosted Ollama instances" },
    ],
    // ... rest
  };
  ```
- [ ] **4.2** Add Ollama base URL configuration field - create new form section for Ollama-specific settings
- [ ] **4.3** Optional: Add connection test button for Ollama instances (ping /api/tags endpoint)
- [ ] **4.4** Update form validation to make Ollama API key optional (unlike other providers)

#### 5. Model Options Configuration  
- [ ] **5.1** Extend `MODEL_OPTIONS` array in `/packages/shared/src/open-swe/models.ts`:
  ```typescript
  // Add to existing MODEL_OPTIONS array:
  // Ollama models section
  { 
    provider: "ollama", 
    label: "Code Llama 34B (Local)", 
    value: "ollama:codellama:34b",
    description: "Specialized for code generation"
  },
  { 
    provider: "ollama", 
    label: "Llama 3.1 8B (Local)", 
    value: "ollama:llama3.1:8b",
    description: "Fast general purpose model"
  },
  { 
    provider: "ollama", 
    label: "Llama 3.1 70B (Local)", 
    value: "ollama:llama3.1:70b", 
    description: "High performance model (requires 48GB+ RAM)"
  },
  // Add more as needed
  ```
- [ ] **5.2** Add model size indicators and system requirements in descriptions
- [ ] **5.3** Consider adding model categories (code, chat, reasoning) for better organization

#### 6. Environment Configuration
- [ ] **6.1** Document `OLLAMA_API_BASE` environment variable (default: `http://localhost:11434`)
- [ ] **6.2** Document optional `OLLAMA_API_KEY` for hosted instances  
- [ ] **6.3** Update `.env.example` and deployment documentation with Ollama variables

### Phase 3: Polish and Production Features (Priority: Medium)
**Timeline: Week 3-4**

#### 7. User Experience Enhancements
- [ ] **7.1** Add model availability checking (ping Ollama service)
- [ ] **7.2** Implement model download status indicators
- [ ] **7.3** Add estimated model size and RAM requirements in UI
- [ ] **7.4** Create quick setup guide for local Ollama installation

#### 8. Error Handling and Validation
- [ ] **8.1** Add Ollama-specific error handling in `initializeModel` method:
  ```typescript
  // Handle common Ollama errors:
  // - Connection refused (Ollama not running)
  // - Model not found (needs to be pulled)  
  // - Insufficient memory errors
  ```
- [ ] **8.2** Add connection test utility function:
  ```typescript
  // Create new utility: /apps/open-swe/src/utils/llms/ollama-utils.ts
  export async function testOllamaConnection(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  ```
- [ ] **8.3** Update fallback logic to skip Ollama if connection test fails
- [ ] **8.4** Add user-friendly error messages for common Ollama setup issues

#### 9. Integration Testing
- [ ] **9.1** Create test file `/apps/open-swe/src/__tests__/ollama-provider.test.ts`:
  ```typescript
  describe("Ollama Provider", () => {
    test("should load Ollama model when available", async () => {
      // Mock Ollama availability and test model loading
    });
    
    test("should fallback to other providers when Ollama unavailable", async () => {
      // Test fallback behavior
    });
  });
  ```
- [ ] **9.2** Add integration test for actual model inference (requires Ollama running)  
- [ ] **9.3** Test all LLMTask types work with Ollama models (PLANNER, PROGRAMMER, REVIEWER, ROUTER, SUMMARIZER)
- [ ] **9.4** Verify agent workflows in `/graphs/` directories work with Ollama provider

### Phase 4: Optimization and Advanced Features (Priority: Low)
**Timeline: Week 4+**

#### 10. Advanced Features
- [ ] **10.1** Implement model temperature and parameter customization for Ollama
- [ ] **10.2** Add support for custom Ollama model formats (GGUF, etc.)
- [ ] **10.3** Create model recommendation engine based on task type
- [ ] **10.4** Add performance benchmarking for different Ollama models

## Technical Considerations

### Dependencies
- `@langchain/ollama` - Official LangChain Ollama integration
- Ollama server running locally or accessible via network

### Configuration Requirements
- **Base URL**: Configurable Ollama API endpoint (default: `http://localhost:11434`)
- **API Key**: Optional for hosted Ollama instances
- **Model Management**: List available models, handle model pulling/downloading

### Architecture Impact
- **ModelManager**: Central orchestration point requiring Ollama provider addition
- **Type System**: Provider enum expansion and configuration interface updates
- **UI Components**: Settings page extensions for Ollama-specific configuration
- **Fallback Logic**: Circuit breaker pattern extension to include Ollama reliability

### Performance Considerations
- Local models may have slower inference times
- Memory requirements vary significantly by model size
- Need to handle model loading delays gracefully

## Validation Criteria

### Functional Requirements
- [ ] Ollama models can be selected in web UI
- [ ] Chat completions work through Ollama provider
- [ ] Fallback to other providers works when Ollama fails
- [ ] Agent workflows complete successfully with Ollama models

### Non-Functional Requirements
- [ ] No performance degradation for existing providers
- [ ] Graceful handling of Ollama service unavailability
- [ ] Consistent UI/UX with existing provider implementations
- [ ] Comprehensive error logging and user feedback

## Documentation Updates Required
- [ ] Update README.md with Ollama setup instructions
- [ ] Add Ollama configuration to deployment guides
- [ ] Create troubleshooting section for Ollama integration
- [ ] Update API documentation with Ollama provider details

## Success Metrics
- Ollama successfully integrated as 4th provider alongside Anthropic, OpenAI, and Google GenAI
- All existing functionality remains intact
- Users can seamlessly switch between local Ollama models and cloud providers
- Agent performance maintained or improved with appropriate model selection

## Critical Implementation Details for AI Agents

### Code Locations Reference
- **Provider definitions**: `/apps/open-swe/src/utils/llms/model-manager.ts` lines 47-49  
- **Provider-to-API-key mapping**: Same file, lines 74-84
- **Model initialization**: Same file, lines 161-207  
- **Default model configurations**: Same file, lines 380-404
- **UI API key definitions**: `/apps/web/src/features/settings-page/api-keys.tsx` line 41
- **Available models**: `/packages/shared/src/open-swe/models.ts`
- **LLM task definitions**: Used throughout `/apps/open-swe/src/graphs/*/nodes/*.ts` files

### Required Dependencies
```json
// In /apps/open-swe/package.json, add:
"@langchain/ollama": "^0.1.0"
```

### Key Interfaces to Understand
```typescript
// From model-manager.ts:
interface ModelLoadConfig {
  provider: Provider;
  modelName: string; 
  temperature?: number;
  maxTokens?: number;
  thinkingModel?: boolean;
  thinkingBudgetTokens?: number;
}

// LLM Tasks used throughout the system:
enum LLMTask {
  PLANNER = "planner",      // High-level task planning
  PROGRAMMER = "programmer", // Code generation  
  REVIEWER = "reviewer",    // Code review
  ROUTER = "router",        // Message classification
  SUMMARIZER = "summarizer" // Content summarization
}
```

### Configuration Flow
1. User selects Ollama model in web UI (`/apps/web/`)
2. Config stored with provider `"ollama"` and model name
3. `ModelManager.loadModel()` called with config and task type
4. `getBaseConfigForTask()` parses model string (format: `"ollama:modelname"`)
5. `initializeModel()` creates LangChain chat model with Ollama provider
6. Model used in graph nodes for agent operations

### Testing Requirements  
- Must test all 5 LLMTask types with Ollama models
- Verify fallback works when Ollama is unavailable  
- Test model loading with and without API key
- Confirm no breaking changes to existing providers

### Environment Variables
```bash
# Optional - defaults to localhost:11434
OLLAMA_API_BASE=http://localhost:11434

# Optional - only needed for hosted Ollama instances  
OLLAMA_API_KEY=your_key_here
```

---

**Created**: August 19, 2025  
**Status**: Planning Phase  
**Estimated Effort**: 3-4 weeks for full implementation  
**Risk Level**: Medium (new provider integration with local dependencies)
