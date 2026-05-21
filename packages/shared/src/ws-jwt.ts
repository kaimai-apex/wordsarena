import { z } from 'zod';

export const WsTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  username: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type WsTokenPayload = z.infer<typeof WsTokenPayloadSchema>;

export const WS_TOKEN_TTL_SECONDS = 300;
