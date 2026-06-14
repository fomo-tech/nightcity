"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";

const SAVE_KEY = "ncpx2077_v1";
const SCRIPT_VERSION = "29";
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

function playSynthSfx(type) {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AC();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === "hover") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.04);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === "click") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === "boot") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(90, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.6);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    }
  } catch (e) {}
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("lore");
  const [crtActive, setCrtActive] = useState(true);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let cancelled = false;
    let saveTimer = null;
    let cloudAvailable = false;

    async function boot() {
      try {
        setStatus("syncing", "RETRIEVING CLOUD SAVES");
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
              setStatus("ready", "LOCAL SAVE ACTIVE");
              return;
            }
            clearTimeout(saveTimer);
            setStatus("syncing", "SYNCING NEURAL CLOUD");
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
                setStatus("error", error.message || "CLOUD SYNC ERROR");
              }
            }, 500);
          },
          async remove() {
            if (!cloudAvailable) {
              setStatus("ready", "LOCAL CACHE WIPED");
              return;
            }
            try {
              await fetch(`/api/save/${slot}`, { method: "DELETE" });
              setStatus("ready", "CLOUD CACHE WIPED");
            } catch (error) {
              setStatus("error", error.message || "WIPE SYNC FAILURE");
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

  const renderLore = () => (
    <div className="lore-tab">
      <h3>DISTRICTS</h3>
      <div className="db-entry">
        <span className="entry-tag">WATSON</span>
        <p>Industrial sector overrun by gangs. Watson was once the city's commercial powerhouse, now an enclave of slums and scrap metal.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">WESTBROOK</span>
        <p>Playground for the ultra-wealthy. Clean, corporate-owned skyscrapers, and neon-drenched luxury clubs like the Afterlife.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">PACIFICA</span>
        <p>Abandoned combat zone. Originally planned as a high-end tourist resort, it is now a lawless warzone ruled by the Voodoo Boys.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">DOGTOWN</span>
        <p>Walled city-within-a-city. Ruled by Kurt Hansen's Barghest militia. High danger, regular Militech supply airdrops.</p>
      </div>

      <h3>GANGS & FACTIONS</h3>
      <div className="db-entry">
        <span className="entry-tag maelstrom">MAELSTROM</span>
        <p>Cyber-monsters obsessed with heavy body modification. Extremely violent and unpredictable.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag scavs">SCAVENGERS</span>
        <p>Chrome thieves. They kidnap citizens to harvest their cyberware and sell it on the black market.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag barghest">BARGHEST</span>
        <p>Ex-Militech soldiers who run the Dogtown black market. Heavily armed and disciplined.</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag trauma">TRAUMA TEAM</span>
        <p>Elite armored medical squad. They extract premium cardholders from active combat zones in under 180 seconds.</p>
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="controls-tab">
      <h3>KEYBOARD BINDINGS</h3>
      <div className="control-row">
        <span className="keys">W / A / S / D</span>
        <span className="action">MOVE / WALK</span>
      </div>
      <div className="control-row">
        <span className="keys">MOUSE CLICK</span>
        <span className="action">AIM & SHOOT</span>
      </div>
      <div className="control-row">
        <span className="keys">SPACEBAR</span>
        <span className="action">OS ABILITY (DASH)</span>
      </div>
      <div className="control-row">
        <span className="keys">C KEY</span>
        <span className="action">INJECT MAXDOC</span>
      </div>
      <div className="control-row">
        <span className="keys">E KEY / ENTER</span>
        <span className="action">INTERACT / SHOP</span>
      </div>
      <div className="control-row">
        <span className="keys">V KEY</span>
        <span className="action">VEHICLE CONTROL</span>
      </div>
      <div className="control-row">
        <span className="keys">N KEY</span>
        <span className="action">CYCLE RADIO</span>
      </div>
      <div className="control-row">
        <span className="keys">TAB KEY / ESC</span>
        <span className="action">INVENTORY / PAUSE</span>
      </div>

      <h3>MOBILE CONTROLS</h3>
      <div className="control-row">
        <span className="keys">LEFT STICK</span>
        <span className="action">MOVEMENT</span>
      </div>
      <div className="control-row">
        <span className="keys">RIGHT STICK</span>
        <span className="action">AIM & AUTO-FIRE</span>
      </div>
    </div>
  );

  const renderSystem = () => {
    const toggleCrt = () => {
      playSynthSfx("click");
      setCrtActive(!crtActive);
    };

    const handleVolumeChange = (e) => {
      const val = parseInt(e.target.value, 10);
      setVolume(val);
      if (window.SFX && window.SFX.master) {
        window.SFX.master.gain.value = (val / 100) * 0.6;
      }
    };

    const cycleLanguage = () => {
      playSynthSfx("click");
      const nextLang = language === "vi" ? "en" : "vi";
      setLanguage(nextLang);
    };

    const activeRadio = window.SFX ? window.SFX.stationName() : "OFF";

    return (
      <div className="system-tab">
        <h3>SYSTEM SETTINGS</h3>
        
        <div className="config-option">
          <label>AUDIO INTERFACE VOLUME: {volume}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange}
            className="slider"
          />
        </div>

        <div className="config-option">
          <label>CRT SCANLINE MODULE</label>
          <button 
            className={`btn-toggle ${crtActive ? "on" : "off"}`} 
            onClick={toggleCrt}
          >
            {crtActive ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        <div className="config-option">
          <label>COGNITIVE LANGUAGE</label>
          <button 
            className="btn-toggle" 
            onClick={cycleLanguage}
          >
            {language === "vi" ? "VIETNAMESE (VI)" : "ENGLISH (EN)"}
          </button>
        </div>

        <div className="config-option">
          <label>ACTIVE NET RADIO</label>
          <div className="radio-display">
            <span className="radio-name">{activeRadio}</span>
            <button 
              className="radio-cycle-btn"
              onClick={() => {
                playSynthSfx("click");
                if (window.SFX) {
                  window.SFX.cycleStation();
                  setVolume(v => v); // trigger state update
                }
              }}
            >
              CYCLE
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="game-shell">
      {/* Animated 3DPerspective Cyber-Grid Background */}
      <div className="cyber-grid-bg" />
      
      {/* HUD Panels (Top Left / Right) */}
      <div className="cloud-panel" data-status={status}>
        <span className="cloud-dot" />
        <span className="cyber-status-text">{message}</span>
      </div>

      <div className="lang-panel" aria-label="Language">
        <button
          type="button"
          className={language === "vi" ? "active" : ""}
          onClick={() => { playSynthSfx("hover"); setLanguage("vi"); }}
        >
          VI
        </button>
        <button
          type="button"
          className={language === "en" ? "active" : ""}
          onClick={() => { playSynthSfx("hover"); setLanguage("en"); }}
        >
          EN
        </button>
      </div>

      {/* Main Canvas Container with CRT scanning lines filter */}
      <div className={`canvas-wrapper ${crtActive ? "crt-active" : ""}`}>
        <canvas id="cv" width="640" height="360" />
        {crtActive && <div className="crt-overlay" />}
      </div>

      <div className={`cyber-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button 
          className="sidebar-toggle-btn" 
          onClick={() => { playSynthSfx("click"); setSidebarOpen(!sidebarOpen); }}
        >
          {sidebarOpen ? "◀ DISCONNECT" : "▶ NETRUNNER DB"}
        </button>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2>CYBER DECK ACCESS</h2>
            <div className="deck-serial">SERIAL NO: NCPX-2077_V2</div>
          </div>
          
          <div className="sidebar-tabs">
            <button className={sidebarTab === "lore" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("lore"); }}>DATABASE</button>
            <button className={sidebarTab === "controls" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("controls"); }}>INTERFACE</button>
            <button className={sidebarTab === "system" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("system"); }}>SYSTEM</button>
          </div>
          
          <div className="sidebar-tab-body">
            {sidebarTab === "lore" && renderLore()}
            {sidebarTab === "controls" && renderControls()}
            {sidebarTab === "system" && renderSystem()}
          </div>
        </div>
      </div>
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
    connected: false,
    send(state) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN) return;
      const store = getStore();
      net.ws.send(
        JSON.stringify({
          type: "state",
          name: store.playerName,
          gang: store.gangName,
          ...state,
        }),
      );
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
    };
    ws.onclose = () => {
      net.connected = false;
      setTimeout(connect, 1200);
    };
    ws.onerror = () => ws.close();
  };
  connect();
}
