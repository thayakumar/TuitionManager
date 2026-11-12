import { SignJWT, importPKCS8 } from "jose";

const APP_ID = process.env.JAAS_APP_ID!;
const API_KEY_ID = process.env.JAAS_API_KEY_ID!;

let cachedKey: CryptoKey | null = null;

async function getPrivateKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.JAAS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  cachedKey = await importPKCS8(raw, "RS256");
  return cachedKey;
}

export async function generateJaasJwt(opts: {
  roomName: string;
  userName: string;
  isModerator: boolean;
  userId: string;
  email?: string;
}) {
  const key = await getPrivateKey();
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
    .setExpirationTime(now + 2 * 60 * 60) // 2 hours
    .sign(key);
}

export function jaasRoomName(meetingRoom: string) {
  return `${APP_ID}/${meetingRoom}`;
}
