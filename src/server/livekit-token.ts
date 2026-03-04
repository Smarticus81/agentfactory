import { AccessToken } from "livekit-server-sdk";

export async function generateLiveKitToken(appId: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }

  const roomName = `bevone-${appId}`;
  const participantName = `staff-${Date.now()}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    url: process.env.LIVEKIT_URL,
    room: roomName,
  };
}
