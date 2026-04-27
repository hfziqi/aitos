import { Atom, Context, Result } from 'aitos';

export const httpRequestAtom: Atom = {
  name: 'httpRequest',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'url', type: 'string', description: 'Request URL' },
      { name: 'method', type: 'string', description: 'HTTP method (GET, POST, PUT, DELETE)' },
      { name: 'body', type: 'any', description: 'Request body' },
      { name: 'headers', type: 'object', description: 'Request headers' }
    ],
    output: { type: 'object', description: 'Response data' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { 
    url: string; 
    method: string; 
    body?: any; 
    headers?: Record<string, string> 
  }, context: Context): Promise<Result> => {
    try {
      const options: RequestInit = {
        method: input.method,
        headers: input.headers,
      };
      
      if (input.body) {
        options.body = JSON.stringify(input.body);
        if (!input.headers) {
          options.headers = { 'Content-Type': 'application/json' };
        }
      }
      
      const response = await fetch(input.url, options);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `HTTP request failed: ${error}` };
    }
  },
};

export const httpStreamRequestAtom: Atom = {
  name: 'httpStreamRequest',
  version: '1.3.0',
  meta: {
    input: [
      { name: 'url', type: 'string', description: 'Request URL' },
      { name: 'method', type: 'string', description: 'HTTP method' },
      { name: 'body', type: 'any', description: 'Request body' },
      { name: 'headers', type: 'object', description: 'Request headers' },
      { name: 'elementId', type: 'string', description: 'Element ID for streaming display (optional)' }
    ],
    output: { type: 'object', description: '{ role, content, toolCalls }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { 
    url: string; 
    method: string; 
    body?: any; 
    headers?: Record<string, string>;
    elementId?: string;
  }, context: Context): Promise<Result> => {
    try {
      const options: RequestInit = {
        method: input.method,
        headers: {
          'Content-Type': 'application/json',
          ...input.headers
        },
        body: JSON.stringify(input.body)
      };
      
      const response = await fetch(input.url, options);
      
      if (!response.ok) {
        return { success: false, error: `HTTP error: ${response.status}` };
      }
      
      const reader = response.body?.getReader();
      
      if (!reader) {
        return { success: false, error: 'Stream not available' };
      }
      
      const decoder = new TextDecoder();
      let fullContent = '';
      let toolCalls: any[] = [];
      
      let streamElement: HTMLElement | null = null;
      if (input.elementId && typeof document !== 'undefined') {
        streamElement = document.getElementById(input.elementId);
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') continue;
            
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta;
              
              if (delta?.content) {
                fullContent += delta.content;
                
                if (streamElement) {
                  streamElement.textContent = fullContent;
                }
              }
              
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index;
                  if (!toolCalls[index]) {
                    toolCalls[index] = {
                      id: tc.id,
                      type: tc.type,
                      function: {
                        name: tc.function?.name || '',
                        arguments: ''
                      }
                    };
                  }
                  if (tc.function?.arguments) {
                    toolCalls[index].function.arguments += tc.function.arguments;
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      const aiResponse: any = { role: 'assistant', content: fullContent };
      
      if (toolCalls.length > 0) {
        aiResponse.toolCalls = toolCalls;
      }
      
      return { success: true, data: aiResponse };
    } catch (error) {
      return { success: false, error: `Stream request failed: ${error}` };
    }
  },
};
