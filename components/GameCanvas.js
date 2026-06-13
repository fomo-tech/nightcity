"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";

const SAVE_KEY = "ncpx2077_v1";
const SCRIPT_VERSION = "25";
const GAME_SCRIPTS = [
  "/js/font.js",
  "/js/i18n.js",
  "/js/data.js",
  "/js/sfx.js",
  "/js/sprites.js",
  "/js/world.js",
  "/js/ui.js",
  "/js/game.js",
  "/mods/mods.js",
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${src}?v=${SCRIPT_VERSION}`;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Cannot load ${src}`));
    document.body.appendChild(script);
  });
}

export default function GameCanvas() {
  const booted = useRef(false);
  const {
    slot,
    status,
    message,
    language,
    playerName,
    setLanguage,
    setStatus,
    markSaved,
  } = useGameStore();

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let cancelled = false;
    let saveTimer = null;
    let cloudAvailable = false;

    async function boot() {
      try {
        setStatus("syncing", "LOADING CLOUD SAVE");
        try {
          const res = await fetch(`/api/save/${slot}`, { cache: "no-store" });
          if (res.ok) {
            cloudAvailable = true;
            const data = await res.json();
            if (data.save)
              localStorage.setItem(SAVE_KEY, JSON.stringify(data.save));
          }
        } catch (error) {
          cloudAvailable = false;
        }

        window.NCPX_SAVE = {
          put(save) {
            if (!cloudAvailable) {
              setStatus("ready", "LOCAL SAVE");
              return;
            }
            clearTimeout(saveTimer);
            setStatus("syncing", "SYNCING CLOUD SAVE");
            saveTimer = setTimeout(async () => {
              try {
                const response = await fetch(`/api/save/${slot}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ save }),
                });
                if (!response.ok) throw new Error("Cloud save failed");
                markSaved();
              } catch (error) {
                setStatus("error", error.message || "CLOUD SAVE FAILED");
              }
            }, 500);
          },
          async remove() {
            if (!cloudAvailable) {
              setStatus("ready", "LOCAL SAVE CLEARED");
              return;
            }
            try {
              await fetch(`/api/save/${slot}`, { method: "DELETE" });
              setStatus("ready", "CLOUD SAVE CLEARED");
            } catch (error) {
              setStatus("error", error.message || "CLOUD DELETE FAILED");
            }
          },
        };

        window.NCPX_LANG = language;
        window.NCPX_PLAYER = { name: playerName, gang: "SOLO" };
        setupRealtimeBridge(() => useGameStore.getState());
        window.__NCPX_MANUAL_BOOT = true;
        window.__NCPX_RESPONSIVE_FIT = true;
        window.__NCPX_MOBILE_COMFY = true;
        setStatus("booting", "LOADING GAME ENGINE");
        if (!window.__NCPX_GAME_SCRIPTS_LOADED) {
          for (const src of GAME_SCRIPTS) {
            if (cancelled) return;
            await loadScript(src);
          }
          window.__NCPX_GAME_SCRIPTS_LOADED = true;
        }

        if (cancelled) return;
        if (window.__boot && !window.__NCPX_GAME_RUNNING) {
          window.__boot();
          setStatus("ready", "READY");
        } else if (window.__NCPX_GAME_RUNNING) {
          setStatus("ready", "READY");
        } else {
          throw new Error("Game boot function was not registered");
        }
      } catch (error) {
        setStatus("error", error.message || "BOOT FAILED");
      }
    }

    boot();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer);
    };
  }, [language, markSaved, playerName, setStatus, slot]);

  useEffect(() => {
    window.NCPX_LANG = language;
    try {
      localStorage.setItem("ncpx_lang", language);
    } catch (error) {}
  }, [language]);

  useEffect(() => {
    window.NCPX_PLAYER = { name: playerName, gang: "SOLO" };
    try {
      localStorage.setItem("ncpx_player_name", playerName);
    } catch (error) {}
  }, [playerName]);

  return (
    <main className="game-shell">
      <div className="cloud-panel" data-status={status}>
        <span className="cloud-dot" />
        <span>{message}</span>
      </div>
      <div className="lang-panel" aria-label="Language">
        <button
          type="button"
          className={language === "vi" ? "active" : ""}
          onClick={() => setLanguage("vi")}
        >
          VI
        </button>
        <button
          type="button"
          className={language === "en" ? "active" : ""}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
      </div>
      <canvas id="cv" width="640" height="360" />
      {status !== "ready" && status !== "synced" ? (
        <div className="boot-message">{message}</div>
      ) : null}
    </main>
  );
}

function setupRealtimeBridge(getStore) {
  if (typeof window === "undefined" || window.NCPX_NET) return;
  const net = {
    id: null,
    ws: null,
    players: [],
    invites: [],
    connected: false,
    send(state) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN) return;
      const store = getStore();
      net.ws.send(
        JSON.stringify({
          type: "state",
          name: (window.NCPX_PLAYER && window.NCPX_PLAYER.name) || store.playerName,
          gang: (window.NCPX_PLAYER && window.NCPX_PLAYER.gang) || store.gangName,
          ...state,
        }),
      );
    },
    invite(playerId, gang) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(JSON.stringify({ type: "invite", to: playerId, gang }));
    },
  };
  window.NCPX_NET = net;

  const connect = () => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    net.ws = ws;
    ws.onopen = () => {
      net.connected = true;
    };
    ws.onmessage = event => {
      let msg = null;
      try {
        msg = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (msg.type === "hello") net.id = msg.id;
      if (msg.type === "players") net.players = (msg.players || []).filter(p => p.id !== net.id);
      if (msg.type === "invite") {
        net.invites = [{ from: msg.from, fromName: msg.fromName, gang: msg.gang }, ...net.invites].slice(0, 4);
      }
    };
    ws.onclose = () => {
      net.connected = false;
      setTimeout(connect, 1200);
    };
    ws.onerror = () => ws.close();
  };
  connect();
}
