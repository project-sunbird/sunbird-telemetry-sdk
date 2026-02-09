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

        return await response.json();
      } catch (error) {
        console.error('Dispatcher error:', error);
        throw error;
      }
    }
  }
