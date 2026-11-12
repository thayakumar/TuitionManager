"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Monitor, AlertTriangle } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const JAAS_DOMAIN = "8x8.vc";
const JAAS_APP_ID = "vpaas-magic-cookie-4f3905459ade48a9b9ccc2f876fbc944";
const JAAS_SCRIPT = `https://${JAAS_DOMAIN}/${JAAS_APP_ID}/external_api.js`;
const FREE_DOMAIN = "meet.jit.si";
const FREE_SCRIPT = `https://${FREE_DOMAIN}/external_api.js`;

export function JitsiMeeting({
  roomName,
  displayName,
  onClose,
  onHangup,
  jwt,
}: {
  roomName: string;
  displayName: string;
  onClose?: () => void;
  onHangup?: () => void;
  jwt?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onCloseRef = useRef(onClose);
  const onHangupRef = useRef(onHangup);
  onCloseRef.current = onClose;
  onHangupRef.current = onHangup;

  const useJaas = !!jwt;
  const domain = useJaas ? JAAS_DOMAIN : FREE_DOMAIN;
  const scriptUrl = useJaas ? JAAS_SCRIPT : FREE_SCRIPT;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function initJitsi() {
      if (cancelled || !containerRef.current) return;
      if (apiRef.current) return;

      try {
        apiRef.current = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: containerRef.current,
          ...(jwt ? { jwt } : {}),
          configOverwrite: {
            prejoinConfig: { enabled: false },
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            toolbarButtons: [
              "microphone", "camera", "desktop", "chat",
              "raisehand", "participants-pane", "tileview",
              "select-background", "fullscreen",
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: "#1a1a2e",
            TOOLBAR_ALWAYS_VISIBLE: true,
          },
          userInfo: { displayName },
        });

        apiRef.current.addListener("videoConferenceJoined", () => {
          if (!cancelled) {
            clearTimeout(timeoutId);
            setLoading(false);
          }
        });

        apiRef.current.addListener("readyToClose", () => {
          onHangupRef.current?.();
          onCloseRef.current?.();
        });

        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
            const iframe = containerRef.current?.querySelector("iframe");
            if (!iframe) {
              setError("Could not load the meeting. A browser extension may be blocking it. Try opening in incognito or disabling ad-blockers.");
            }
          }
        }, 10000);
      } catch (e) {
        if (!cancelled) {
          setLoading(false);
          setError("Failed to initialize meeting. Try refreshing the page.");
        }
      }
    }

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => {
        if (!cancelled) {
          setLoading(false);
          setError("Could not load Jitsi. A browser extension may be blocking it. Try incognito mode.");
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  // Only re-run when the meeting identity changes, not on callback changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, domain, scriptUrl]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center gap-3">
            <Monitor size={32} className="text-indigo-400 animate-pulse" />
            <span className="text-sm text-gray-400 animate-pulse">
              Connecting to meeting...
            </span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6">
            <AlertTriangle size={32} className="text-amber-400" />
            <p className="text-sm text-gray-300">{error}</p>
            <a
              href={`https://${domain}/${roomName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm text-indigo-400 underline hover:text-indigo-300"
            >
              Open meeting in new tab instead
            </a>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
      />
    </div>
  );
}
