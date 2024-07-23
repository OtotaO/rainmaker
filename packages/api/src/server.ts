import dotenv from 'dotenv';
dotenv.config();

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { serve } from '@hono/node-server'
import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set, refusing to start server.')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const app = new Hono()
app.use('/*', cors())

app.post('/api/anthropic', async (c) => {
  const body = await c.req.json() as Anthropic.MessageCreateParams;

  return streamSSE(c, async (stream) => {
    try {
      const response = await anthropic.messages.create({
        ...body,
        stream: true,
      });

      for await (const chunk of response) {
        switch (chunk.type) {
          case 'message_start':
            await stream.writeSSE({ event: 'message_start', data: JSON.stringify(chunk.message) });
            break;
          case 'content_block_start':
            await stream.writeSSE({ event: 'content_block_start', data: JSON.stringify(chunk.content_block) });
            break;
          case 'content_block_delta':
            await stream.writeSSE({ event: 'content_block_delta', data: JSON.stringify(chunk.delta) });
            break;
          case 'content_block_stop':
            await stream.writeSSE({ event: 'content_block_stop', data: JSON.stringify({}) });
            break;
          case 'message_delta':
            await stream.writeSSE({ event: 'message_delta', data: JSON.stringify(chunk.delta) });
            break;
          case 'message_stop':
            await stream.writeSSE({ event: 'message_stop', data: JSON.stringify({}) });
            break;
        }
      }
    } catch (error) {
      console.error('Error in SSE stream:', error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'An error occurred during processing' }),
      });
    }
  });
});

const port = 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port: Number(port)
})