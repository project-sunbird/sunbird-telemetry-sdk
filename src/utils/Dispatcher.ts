export class Dispatcher {
    static async dispatch(url: string, data: any, headers: Record<string, string>): Promise<any> {
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
