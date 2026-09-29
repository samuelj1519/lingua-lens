import { createServer, type IncomingMessage, type ServerResponse } from 'http';

export function startMockServer(port = 0): Promise<{ server: ReturnType<typeof createServer>; port: number; requests: unknown[] }> {
  const requests: unknown[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'POST' && req.url?.includes('chat/completions')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        requests.push(parsed);
        const scenario = req.headers['x-mock-scenario'];
        if (scenario === '401') {
          res.writeHead(401);
          res.end('unauthorized');
          return;
        }
        if (scenario === 'reasoning-empty') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: { content: '', reasoning_content: 'internal chain of thought' },
                  finish_reason: 'stop',
                },
              ],
              model: 'mock',
              usage: { prompt_tokens: 10, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 50 } },
            }),
          );
          return;
        }
        if (scenario === 'length-empty') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              choices: [{ message: { content: '' }, finish_reason: 'length' }],
              model: 'mock',
              usage: { prompt_tokens: 10, completion_tokens: 0 },
            }),
          );
          return;
        }
        if (scenario === 'stream-reasoning' && parsed.stream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write('data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n\n');
          res.write('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n');
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        const userMsg = parsed.messages?.find((m: { role: string }) => m.role === 'user')?.content ?? '';
        if (userMsg.includes('"items"') || userMsg.includes('Input:')) {
          try {
            const jsonPart = userMsg.includes('Input:') ? userMsg.split('Input:')[1].trim() : userMsg;
            const input = JSON.parse(jsonPart.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
            const items = (input.items ?? []).map((i: { id: string; text: string }) => ({
              id: i.id,
              translation: `[zh-CN] ${i.text}`,
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items }) } }], model: 'mock' }));
            return;
          } catch {
            /* fall through */
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: '[zh-CN] translated' } }],
            model: 'mock',
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          }),
        );
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address();
      const p = typeof addr === 'object' && addr ? addr.port : port;
      resolve({ server, port: p, requests });
    });
  });
}
