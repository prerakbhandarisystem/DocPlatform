declare module 'mammoth' {
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<{ 
    value: string; 
    messages: any[] 
  }>;
  
  export function convertToMarkdown(options: { arrayBuffer: ArrayBuffer }): Promise<{ 
    value: string; 
    messages: any[] 
  }>;
  
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<{ 
    value: string; 
    messages: any[] 
  }>;
} 