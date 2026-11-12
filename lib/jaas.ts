import { SignJWT, importPKCS8 } from "jose";

const APP_ID = process.env.JAAS_APP_ID ?? "";
const API_KEY_ID = process.env.JAAS_API_KEY_ID ?? "";

let cachedKey: CryptoKey | null = null;

async function getPrivateKey() {
  if (cachedKey) return cachedKey;
  const pkEnv = process.env.JAAS_PRIVATE_KEY;
  if (!pkEnv) return null;
  const raw = pkEnv.replace(/\\n/g, "\n");
  cachedKey = await importPKCS8(raw, "RS256");
  return cachedKey;
}

export function isJaasConfigured() {
  return !!(APP_ID && API_KEY_ID && process.env.JAAS_PRIVATE_KEY);
}

export async function generateJaasJwt(opts: {
  roomName: string;
  userName: string;
  isModerator: boolean;
  userId: string;
  email?: string;
}): Promise<string | undefined> {
  if (!isJaasConfigured()) return undefined;

  const key = await getPrivateKey();
  if (!key) return undefined;

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    aud: "jitsi",
    iss: "chat",
    sub: APP_ID,
    room: opts.roomName,
    context: {
      user: {
        id: opts.userId,
        name: opts.userName,
        avatar: "",
        email: opts.email ?? "",
        moderator: opts.isModerator,
        "hidden-from-recorder": false,
      },
      features: {
        livestreaming: false,
        "outbound-call": false,
        "sip-outbound-call": false,
        transcription: false,
        recording: false,
      },
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: API_KEY_ID, typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(now + 2 * 60 * 60)
    .sign(key);
}

export function jaasRoomName(meetingRoom: string) {
  if (!APP_ID) return meetingRoom;
  return `${APP_ID}/${meetingRoom}`;
}
