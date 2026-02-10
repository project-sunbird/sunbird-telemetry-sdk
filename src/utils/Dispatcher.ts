export class Dispatcher {
    static async dispatch(url: string, data: any, headers: Record<string, string>): Promise<any> {
      // Check if fetch is available (Node 18+ or browser)
      if (typeof fetch === 'undefined') {
        throw new Error('fetch is not available. Node.js 18+ is required for native fetch support.');
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
           const errorText = await response.text();
           throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Handle empty and non-JSON responses safely
        if (response.status === 204) {
          // No Content
          return null;
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (!text.trim()) {
          // Empty body on a successful response
          return null;
        }

        if (!contentType.toLowerCase().includes('application/json')) {
          // Non-JSON successful response; return raw text
          return text;
        }

        return JSON.parse(text);
      } catch (error) {
        console.error('Dispatcher error:', error);
        throw error;
      }
    }
  }
