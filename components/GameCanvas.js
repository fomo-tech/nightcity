"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";

const SAVE_KEY = "ncpx2077_v1";
const ACCOUNT_KEY = "ncpx_account_v1";
const SCRIPT_VERSION = "50";
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

const SCRIPT_NAMES_VI = {
  "font.js": "FONT CHỮ ĐỒ HỌA",
  "i18n.js": "PHÂN HỆ NGÔN NGỮ",
  "data.js": "DỮ LIỆU THÀNH PHỐ",
  "sfx.js": "HIỆU ỨNG ÂM THANH",
  "sprites.js": "BẢN ĐỒ SPRITES PIXEL",
  "world.js": "KIẾN TRÚC THẾ GIỚI",
  "ui.js": "HỆ THỐNG GIAO DIỆN HUD",
  "game.js": "BỘ MÔ PHỎNG VẬT LÝ",
  "mods.js": "BẢN CẬP NHẬT TÙY BIẾN"
};

const BOOT_STEPS_EN = [
  "> CONNECTING TO PORT COGNITIVE_DECK_0...",
  "> NEURAL LINK STATUS: SECURE (99.8% HYPER-RESONANCE)",
  "> MOUNTING VIRTUAL MATRIX LAYER... OK",
  "> INTEGRATING NETRUNNER UTILITIES...",
  "> RETRIEVING ARCHIVED NEURAL SAVES...",
  "> CONFIGURING SANDEVISTAN ACCELERATION CHIPS...",
  "> PARSING CROWD SIMULATION DIRECTORY... OK",
  "> MILITECH FIREWALL SECURED.",
  "> READY FOR NEURAL TRANSFER.",
];

const BOOT_STEPS_VI = [
  "> ĐANG KẾT NỐI VỚI CỔNG THẦN KINH COGNITIVE_DECK_0...",
  "> LIÊN KẾT THẦN KINH: AN TOÀN (99.8% SIÊU CỘNG HƯỞNG)",
  "> THIẾT LẬP LỚP MA TRẬN ẢO... OK",
  "> TÍCH HỢP CÁC TIỆN ÍCH NETRUNNER...",
  "> TRUY XUẤT CÁC LƯU TRỮ THẦN KINH...",
  "> CẤU HÌNH CHIP TĂNG TỐC SANDEVISTAN...",
  "> PHÂN TÍCH THƯ MỤC MÔ PHỎNG ĐÁM ĐÔNG... OK",
  "> TƯỜNG LỬA MILITECH ĐÃ ĐƯỢC BẢO MẬT.",
  "> SẴN SÀNG CHO QUÁ TRÌNH TRUYỀN THẦN KINH.",
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

function cleanAccountName(value) {
  return String(value || "V").replace(/[^\p{L}\p{N}_ -]/gu, "").trim().slice(0, 18).toUpperCase() || "V";
}

function localQuickAccount(name) {
  const id = `local_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  return {
    account: { id, slot: id, name: cleanAccountName(name), provider: "local" },
    token: `local_${Math.random().toString(36).slice(2)}`
  };
}

function OutfitPreview({ skinId, gender, language }) {
  const canvasRefFront = useRef(null);
  const canvasRefSide = useRef(null);
  const canvasRefBack = useRef(null);

  useEffect(() => {
    let active = true;
    const render = () => {
      if (!active) return;
      if (typeof window !== "undefined" && window.SPR && window.G) {
        const pedSpr = skinId === null 
          ? (window.SPR.player[gender] || window.SPR.player.m) 
          : window.SPR.playerCiv(skinId, gender);
        
        const frame = Math.floor((window.G.rt || 0) * 4);

        const drawOnCanvas = (canvas, face) => {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;
          if (window.drawPed) {
            window.drawPed(ctx, pedSpr, face, false, frame, 30, 65, 1, 2.2);
          }
        };

        drawOnCanvas(canvasRefFront.current, 'down');
        drawOnCanvas(canvasRefSide.current, 'side');
        drawOnCanvas(canvasRefBack.current, 'up');
      }
      requestAnimationFrame(render);
    };
    render();
    return () => { active = false; };
  }, [skinId, gender]);

  return (
    <div className="wardrobe-previews">
      <div className="wardrobe-preview-col">
        <canvas ref={canvasRefFront} width="60" height="80" className="wardrobe-preview-canvas" />
        <span className="wardrobe-preview-label">{language === 'vi' ? 'TRƯỚC' : 'FRONT'}</span>
      </div>
      <div className="wardrobe-preview-col">
        <canvas ref={canvasRefSide} width="60" height="80" className="wardrobe-preview-canvas" />
        <span className="wardrobe-preview-label">{language === 'vi' ? 'BÊN' : 'PROFILE'}</span>
      </div>
      <div className="wardrobe-preview-col">
        <canvas ref={canvasRefBack} width="60" height="80" className="wardrobe-preview-canvas" />
        <span className="wardrobe-preview-label">{language === 'vi' ? 'SAU' : 'BACK'}</span>
      </div>
    </div>
  );
}

function MapTab({ language }) {
  const canvasRef = useRef(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);

  useEffect(() => {
    let active = true;
    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas || typeof window === "undefined" || !window.WORLD || !window.G) return;
      const ctx = canvas.getContext('2d');
      
      const mapSize = 220;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(window.WORLD.mini, 0, 0, mapSize, mapSize);

      const project = (wx, wy) => {
        const TILE = window.TILE || 16;
        const tx = wx / TILE;
        const ty = wy / TILE;
        return {
          x: (tx / window.WORLD.W) * mapSize,
          y: (ty / window.WORLD.H) * mapSize
        };
      };

      const drawDot = (wx, wy, col, txt) => {
        const pt = project(wx, wy);
        ctx.fillStyle = '#06080e';
        ctx.fillRect(pt.x - 3, pt.y - 3, 7, 7);
        
        ctx.fillStyle = col;
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(txt, pt.x, pt.y + 3);
      };

      const WORLD = window.WORLD;
      const G = window.G;

      drawDot(WORLD.shops.guns.x, WORLD.shops.guns.y, '#f9f002', 'G');
      drawDot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, '#05d9e8', 'R');
      drawDot(WORLD.shops.cars.x, WORLD.shops.cars.y, '#00ff9f', 'A');
      drawDot(WORLD.shops.bar.x, WORLD.shops.bar.y, '#ff2a6d', 'B');
      if (WORLD.shops.casino) drawDot(WORLD.shops.casino.x, WORLD.shops.casino.y, '#bd00ff', 'C');
      if (WORLD.shops.clothing) drawDot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, '#ff69b4', 'T');

      for (const n of WORLD.npcs) {
        if (n.kind === 'joy') {
          drawDot(n.x, n.y, '#ff2a6d', 'J');
        } else if (n.kind === 'doll') {
          drawDot(n.x, n.y, '#ff2a6d', 'D');
        }
      }

      drawDot(G.p.x, G.p.y, '#05d9e8', 'P');
    };
    render();
    return () => { active = false; };
  }, []);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || !window.WORLD || !window.G) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleX = 220 / rect.width;
    const scaleY = 220 / rect.height;
    const sx = mouseX * scaleX;
    const sy = mouseY * scaleY;

    const mapSize = 220;
    const project = (wx, wy) => {
      const TILE = window.TILE || 16;
      const tx = wx / TILE;
      const ty = wy / TILE;
      return {
        x: (tx / window.WORLD.W) * mapSize,
        y: (ty / window.WORLD.H) * mapSize
      };
    };

    let hovered = null;
    const checkHover = (wx, wy, label, desc) => {
      const pt = project(wx, wy);
      if (Math.hypot(sx - pt.x, sy - pt.y) < 6) {
        hovered = { label, desc, wx, wy };
      }
    };

    const WORLD = window.WORLD;
    const G = window.G;

    checkHover(G.p.x, G.p.y, 'PLAYER: ' + G.playerName, language === 'vi' ? 'VỊ TRÍ HIỆN TẠI CỦA BẠN' : 'YOUR CURRENT POSITION');
    checkHover(WORLD.shops.guns.x, WORLD.shops.guns.y, 'GUN SHOP', language === 'vi' ? 'TIỆM SÚNG - QUÂN' : 'GUN SHOP - WEAPONS & AMMO');
    checkHover(WORLD.shops.ripper.x, WORLD.shops.ripper.y, 'RIPPERDOC', language === 'vi' ? 'TIỆM SƠN - CẤY GHÉP' : 'RIPPERDOC CLINIC');
    checkHover(WORLD.shops.cars.x, WORLD.shops.cars.y, 'AUTOFIXER', language === 'vi' ? 'TIỆM TÚ - MUA XE' : 'VEHICLES AND GARAGE');
    checkHover(WORLD.shops.bar.x, WORLD.shops.bar.y, 'AFTERLIFE BAR', language === 'vi' ? 'AFTERLIFE BAR - MUA ĐỒ UỐNG' : 'ORDER A DRINK');
    if (WORLD.shops.casino) checkHover(WORLD.shops.casino.x, WORLD.shops.casino.y, 'CASINO DEALER', language === 'vi' ? 'CHƠI TÀI XỈU' : 'PLAY DICE MINI-GAME');
    if (WORLD.shops.clothing) checkHover(WORLD.shops.clothing.x, WORLD.shops.clothing.y, 'WARDROBE ROOM', language === 'vi' ? 'THAY ĐỔI DIỆN MẠO' : 'SWITCH GENDER / SKIN');

    for (const n of WORLD.npcs) {
      if (n.kind === 'joy') {
        checkHover(n.x, n.y, n.name + ' - JOY', 'CLOUDS LOUNGE');
      } else if (n.kind === 'doll') {
        checkHover(n.x, n.y, n.name + ' - DOLL', 'CLOUDS VIP ROOM');
      }
    }

    setHoveredLocation(hovered);
  };

  return (
    <div className="map-wrapper">
      <div className="map-canvas-container">
        <canvas ref={canvasRef} width="220" height="220" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredLocation(null)} />
      </div>
      <div>
        <div className="map-legend-list">
          <div className="map-legend-item" style={{ color: '#05d9e8' }}><span className="map-legend-key">P</span> <span>{language === 'vi' ? 'NGƯỜI CHƠI V' : 'PLAYER V'}</span></div>
          <div className="map-legend-item" style={{ color: '#f9f002' }}><span className="map-legend-key">G</span> <span>{language === 'vi' ? 'TIỆM SÚNG' : 'GUN SHOP'}</span></div>
          <div className="map-legend-item" style={{ color: '#05d9e8' }}><span className="map-legend-key">R</span> <span>{language === 'vi' ? 'RIPPERDOC' : 'RIPPERDOC'}</span></div>
          <div className="map-legend-item" style={{ color: '#00ff9f' }}><span className="map-legend-key">A</span> <span>{language === 'vi' ? 'TIỆM XE' : 'AUTOFIXER'}</span></div>
          <div className="map-legend-item" style={{ color: '#ff2a6d' }}><span className="map-legend-key">B</span> <span>{language === 'vi' ? 'AFTERLIFE' : 'AFTERLIFE'}</span></div>
          <div className="map-legend-item" style={{ color: '#bd00ff' }}><span className="map-legend-key">C</span> <span>{language === 'vi' ? 'SÒNG BẠC' : 'CASINO DEALER'}</span></div>
          <div className="map-legend-item" style={{ color: '#ff69b4' }}><span className="map-legend-key">T</span> <span>{language === 'vi' ? 'TỦ ĐỒ' : 'WARDROBE'}</span></div>
          <div className="map-legend-item" style={{ color: '#ff2a6d' }}><span className="map-legend-key">J</span> <span>{language === 'vi' ? 'JOY / DOLL' : 'JOY / DOLL'}</span></div>
        </div>
        {hoveredLocation && (
          <div className="map-hover-details">
            <div className="map-hover-title">{hoveredLocation.label}</div>
            <div>{hoveredLocation.desc}</div>
            <div style={{ color: '#8a93a6', fontSize: '8px' }}>COORD: {Math.floor(hoveredLocation.wx/16)}, {Math.floor(hoveredLocation.wy/16)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameCanvas() {
  const booted = useRef(false);
  const {
    slot,
    status,
    message,
    language,
    playerName,
    setAccount,
    setLanguage,
    setPlayerName,
    setStatus,
    setSlot,
    markSaved,
  } = useGameStore();

  const [isJackedIn, setIsJackedIn] = useState(false);
  const [bootLogs, setBootLogs] = useState([]);
  const [showJackButton, setShowJackButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("lore");
  const [crtActive, setCrtActive] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isGlitching, setIsGlitching] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeLog, setActiveLog] = useState("");
  const [cloudPanelVisible, setCloudPanelVisible] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeAccount, setActiveAccount] = useState(null);
  const [accountToken, setAccountToken] = useState("");
  const [accountNameDraft, setAccountNameDraft] = useState(playerName || "V");
  const [loginCodeDraft, setLoginCodeDraft] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const installAccount = (payload, persist = true) => {
    const account = payload?.account;
    const token = payload?.token || "";
    if (!account?.id) return;
    const normalized = { ...account, name: cleanAccountName(account.name) };
    if (persist) {
      try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ account: normalized, token })); } catch (error) {}
    }
    setActiveAccount(normalized);
    setAccountToken(token);
    setAccount(normalized);
    setSlot(normalized.slot || normalized.id);
    setPlayerName(normalized.name);
    setAuthMessage(normalized.provider === "local" ? "LOCAL QUICK ACCOUNT ACTIVE" : "QUICK ACCOUNT READY");
  };

  useEffect(() => {
    let cancelled = false;
    async function restoreAccount() {
      setAuthMessage(language === "vi" ? "ĐANG KIỂM TRA TÀI KHOẢN..." : "CHECKING ACCOUNT...");
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch (error) {}
      if (!saved?.account?.id || !saved?.token) {
        if (!cancelled) {
          setAuthReady(true);
          setAuthMessage(language === "vi" ? "CHƯA CÓ TÀI KHOẢN" : "NO ACCOUNT");
        }
        return;
      }
      try {
        const res = await fetch("/api/account/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: saved.account.id, token: saved.token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.ok && data.account) {
          installAccount({ account: data.account, token: data.token || saved.token });
        } else if (!cancelled && saved.account.provider === "local") {
          installAccount(saved);
        } else if (!cancelled) {
          try { localStorage.removeItem(ACCOUNT_KEY); } catch (error) {}
          setAuthMessage(language === "vi" ? "TOKEN TÀI KHOẢN KHÔNG HỢP LỆ" : "ACCOUNT TOKEN INVALID");
        }
      } catch (error) {
        if (!cancelled) {
          installAccount(saved);
          setAuthMessage(language === "vi" ? "OFFLINE: DÙNG TÀI KHOẢN ĐÃ LƯU" : "OFFLINE: USING SAVED ACCOUNT");
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }
    restoreAccount();
    return () => { cancelled = true; };
  }, []);

  const handleQuickAccount = async () => {
    const name = cleanAccountName(accountNameDraft);
    setAuthBusy(true);
    setAuthMessage(language === "vi" ? "ĐANG TẠO TÀI KHOẢN NHANH..." : "CREATING QUICK ACCOUNT...");
    try {
      const res = await fetch("/api/account/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.account || !data.token) throw new Error(data.error || "QUICK_ACCOUNT_FAILED");
      installAccount(data);
      playSynthSfx("click");
    } catch (error) {
      const fallback = localQuickAccount(name);
      installAccount(fallback);
      setAuthMessage(language === "vi" ? "MONGO CHƯA SẴN SÀNG: ĐÃ TẠO TÀI KHOẢN LOCAL" : "MONGO OFFLINE: LOCAL ACCOUNT CREATED");
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  };

  const handleLoginCode = async () => {
    const raw = String(loginCodeDraft || "").trim();
    const parts = raw.split(/[:|,\s]+/).filter(Boolean);
    const accountId = parts.find(p => p.startsWith("acct_") || p.startsWith("local_"));
    const token = parts.find(p => p.startsWith("ncp_") || p.startsWith("local_"));
    if (!accountId || !token || accountId === token) {
      setAuthMessage(language === "vi" ? "MÃ ĐĂNG NHẬP KHÔNG HỢP LỆ" : "INVALID LOGIN CODE");
      return;
    }
    setAuthBusy(true);
    setAuthMessage(language === "vi" ? "ĐANG ĐĂNG NHẬP..." : "SIGNING IN...");
    try {
      const res = await fetch("/api/account/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.account) throw new Error(data.error || "LOGIN_FAILED");
      installAccount({ account: data.account, token: data.token || token });
      playSynthSfx("click");
    } catch (error) {
      setAuthMessage(language === "vi" ? "KHÔNG THỂ ĐĂNG NHẬP BẰNG MÃ NÀY" : "LOGIN CODE FAILED");
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  };

  // Next.js Game Modals States
  const [activeUi, setActiveUi] = useState(null);
  const [playerState, setPlayerState] = useState({
    eddies: 0,
    lvl: 1,
    xp: 0,
    maxdocs: 0,
    gender: "m",
    skin: null,
    cyber: {},
    os: null,
    weapons: {},
    cars: {},
    activeCar: null,
    loadout: [],
    talk: null,
    gang: null,
    gangNameSel: 0,
    gangIconSel: 0,
    playerInvite: null,
    gangInvite: null,
    gangJoinReq: null,
    stats: {},
  });

  const [selectedWeaponId, setSelectedWeaponId] = useState(null);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [selectedCyberId, setSelectedCyberId] = useState(null);
  const [selectedSkinId, setSelectedSkinId] = useState(null);
  const [selectedInvTab, setSelectedInvTab] = useState(0);
  const [selectedInvWeaponId, setSelectedInvWeaponId] = useState(null);
  const [selectedInvCarId, setSelectedInvCarId] = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Sync state loop from window.G
  useEffect(() => {
    let animFrame;
    const poll = () => {
      try {
        if (typeof window !== "undefined" && window.G) {
          setActiveUi(window.G.ui);
          setPlayerState({
            eddies: window.G.eddies || 0,
            lvl: window.G.lvl || 1,
            xp: window.G.xp || 0,
            maxdocs: window.G.maxdocs || 0,
            gender: window.G.gender || "m",
            skin: window.G.skin !== undefined ? window.G.skin : null,
            cyber: window.G.cyber ? { ...window.G.cyber } : {},
            os: window.G.os,
            weapons: window.G.weapons ? { ...window.G.weapons } : {},
            cars: window.G.cars ? { ...window.G.cars } : {},
            activeCar: window.G.activeCar,
            loadout: window.G.loadout ? [...window.G.loadout] : [],
            talk: window.G.talk ? { ...window.G.talk } : null,
            gang: window.G.gang,
            gangNameSel: window.G.gangNameSel || 0,
            gangIconSel: window.G.gangIconSel || 0,
            playerInvite: window.G.playerInvite,
            gangInvite: window.G.gangInvite,
            gangJoinReq: window.G.gangJoinReq,
            stats: window.G.stats ? { ...window.G.stats } : {},
          });
        }
      } catch (err) {
        // Safe check: do not halt the animation loop if some objects are not initialized yet
      }
      animFrame = requestAnimationFrame(poll);
    };
    poll();
    return () => cancelAnimationFrame(animFrame);
  }, []);



  // Initialize selected items based on active UI
  useEffect(() => {
    if (!activeUi) {
      setConfirmWipe(false);
      return;
    }
    if (activeUi === "guns" && typeof window !== "undefined" && window.WEAPONS) {
      const stock = window.WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden);
      if (stock.length > 0) setSelectedWeaponId(stock[0].id);
    }
    if (activeUi === "cars" && typeof window !== "undefined" && window.CARS) {
      if (window.CARS.length > 0) setSelectedCarId(window.CARS[0].id);
    }
    if (activeUi === "ripper" && typeof window !== "undefined" && window.CYBER) {
      if (window.CYBER.length > 0) setSelectedCyberId(window.CYBER[0].id);
    }
    if (activeUi === "wardrobe") {
      setSelectedSkinId(window.G ? window.G.skin : null);
    }
    if (activeUi === "inv") {
      setSelectedInvTab(0);
      if (typeof window !== "undefined" && window.WEAPONS && window.WEAPONS.length > 0) {
        setSelectedInvWeaponId(window.WEAPONS[0].id);
      }
      if (typeof window !== "undefined" && window.CARS && window.CARS.length > 0) {
        setSelectedInvCarId(window.CARS[0].id);
      }
    }
  }, [activeUi]);


  useEffect(() => {
    if (booted.current) return;
    if (!authReady || !activeAccount) return;
    booted.current = true;
    let cancelled = false;
    let saveTimer = null;
    let cloudAvailable = false;
    const cloudSlot = activeAccount.slot || activeAccount.id || slot;
    const localSaveKey = `${SAVE_KEY}:${cloudSlot}`;

    async function boot() {
      try {
        setStatus("syncing", language === "vi" ? "ĐANG TẢI LƯU TRỮ CLOUD..." : "RETRIEVING CLOUD SAVES");
        setLoadingProgress(5);
        setActiveLog(language === "vi" ? "> ĐANG THIẾT LẬP KẾT NỐI..." : "> ESTABLISHING CONNECTION...");
        window.NCPX_SAVE_KEY = localSaveKey;
        try {
          const res = await fetch(`/api/save/${cloudSlot}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.dbConnected !== false) {
              cloudAvailable = true;
              if (data.save)
                localStorage.setItem(localSaveKey, JSON.stringify(data.save));
            } else {
              cloudAvailable = false;
            }
          }
        } catch (error) {
          cloudAvailable = false;
        }
        try {
          if (!localStorage.getItem(localSaveKey) && localStorage.getItem(SAVE_KEY)) {
            localStorage.setItem(localSaveKey, localStorage.getItem(SAVE_KEY));
          }
        } catch (error) {}

        window.NCPX_SAVE = {
          put(save) {
            if (!cloudAvailable) {
              setStatus("ready", language === "vi" ? "ĐỀ PHÒNG: CHỈ LƯU TRÊN MÁY" : "LOCAL SAVE ACTIVE");
              return;
            }
            clearTimeout(saveTimer);
            setStatus("syncing", language === "vi" ? "ĐANG ĐỒNG BỘ ĐÁM MÂY..." : "SYNCING NEURAL CLOUD");
            saveTimer = setTimeout(async () => {
              try {
                const response = await fetch(`/api/save/${cloudSlot}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ save, accountId: activeAccount.id }),
                });
                if (!response.ok) throw new Error("Cloud save failed");
                markSaved();
              } catch (error) {
                setStatus("error", error.message || (language === "vi" ? "LỖI ĐỒNG BỘ CLOUD" : "CLOUD SYNC ERROR"));
              }
            }, 500);
          },
          async remove() {
            if (!cloudAvailable) {
              setStatus("ready", language === "vi" ? "ĐÃ XÓA LƯU TRỮ CỤC BỘ" : "LOCAL CACHE WIPED");
              return;
            }
            try {
              await fetch(`/api/save/${cloudSlot}`, { method: "DELETE" });
              setStatus("ready", language === "vi" ? "ĐÃ XÓA LƯU TRỮ CLOUD" : "CLOUD CACHE WIPED");
            } catch (error) {
              setStatus("error", error.message || (language === "vi" ? "LỖI XÓA ĐỒNG BỘ CLOUD" : "WIPE SYNC FAILURE"));
            }
          },
        };

        window.NCPX_LANG = language;
        window.NCPX_CLOUD_SLOT = cloudSlot;
        window.NCPX_ACCOUNT = { id: activeAccount.id, provider: activeAccount.provider || "quick" };
        window.NCPX_SAVE_KEY = localSaveKey;
        window.NCPX_PLAYER = { name: activeAccount.name || playerName, gang: "SOLO" };
        setupRealtimeBridge(() => useGameStore.getState());
        window.__NCPX_MANUAL_BOOT = true;
        window.__NCPX_SKIP_TITLE_MENU = true;
        window.__NCPX_RESPONSIVE_FIT = true;
        window.__NCPX_MOBILE_COMFY = true;
        setStatus("booting", language === "vi" ? "ĐANG BIÊN DỊCH MẠNG THẦN KINH..." : "COMPILING CORPO NET DECK");
        setLoadingProgress(10);
        setActiveLog(language === "vi" ? "> ĐANG ĐỒNG BỘ CÁC LÕI HỆ THỐNG..." : "> SYNCHRONIZING SYSTEM CORES...");
        if (!window.__NCPX_GAME_SCRIPTS_LOADED) {
          let loaded = 0;
          for (const src of GAME_SCRIPTS) {
            if (cancelled) return;
            await loadScript(src);
            loaded++;
            setLoadingProgress(Math.floor(10 + (loaded / GAME_SCRIPTS.length) * 40));
            const filename = src.split('/').pop();
            const translatedName = language === "vi" ? (SCRIPT_NAMES_VI[filename] || filename.toUpperCase()) : filename.toUpperCase();
            setActiveLog(language === "vi" ? `> ĐANG TẢI PHÂN HỆ: ${translatedName}` : `> LOADING MODULE: ${translatedName}`);
          }
          window.__NCPX_GAME_SCRIPTS_LOADED = true;
        } else {
          setLoadingProgress(50);
        }

        if (cancelled) return;

        let hasSavedCharacter = false;
        try {
          hasSavedCharacter = !!localStorage.getItem(localSaveKey);
        } catch (e) {}

        if (hasSavedCharacter) {
          if (window.__boot && !window.__NCPX_GAME_RUNNING) {
            window.__boot();
          }
          setIsJackedIn(true);
        }
        setStatus("ready", language === "vi" ? "THIẾT BỊ ĐÃ SẴN SÀNG" : "DECK LOADED");
      } catch (error) {
        setStatus("error", error.message || (language === "vi" ? "LỖI KHỞI ĐỘNG HỆ THỐNG" : "BOOT DIAGNOSTICS FAILURE"));
      }
    }

    boot();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer);
    };
  }, [activeAccount, authReady, language, markSaved, playerName, setStatus, slot]);

  // Terminal scroll animation
  useEffect(() => {
    if (status === "ready" || window.__NCPX_GAME_SCRIPTS_LOADED) {
      let currentIdx = 0;
      const stepsList = language === "vi" ? BOOT_STEPS_VI : BOOT_STEPS_EN;
      setBootLogs([]);
      const interval = setInterval(() => {
        if (currentIdx < stepsList.length) {
          const step = stepsList[currentIdx];
          setBootLogs(prev => [...prev, step]);
          setActiveLog(step);
          playSynthSfx("hover");
          currentIdx++;
          setLoadingProgress(Math.floor(50 + (currentIdx / stepsList.length) * 50));
        } else {
          setShowJackButton(true);
          setLoadingProgress(100);
          setActiveLog(language === "vi" ? "> HỆ THỐNG ONLINE. LIÊN KẾT THẦN KINH SẴN SÀNG." : "> SYSTEM ONLINE. NEURAL LINK READY.");
          clearInterval(interval);
        }
      }, 160);
      return () => clearInterval(interval);
    }
  }, [status, language]);

  useEffect(() => {
    window.NCPX_LANG = language;
    try {
      localStorage.setItem("ncpx_lang", language);
    } catch (error) {}
  }, [language]);

  useEffect(() => {
    window.NCPX_PLAYER = { name: activeAccount?.name || playerName, gang: "SOLO" };
    try {
      localStorage.setItem("ncpx_player_name", activeAccount?.name || playerName);
    } catch (error) {}
  }, [activeAccount, playerName]);

  useEffect(() => {
    if (status === "syncing" || status === "error") {
      setCloudPanelVisible(true);
    } else if (status === "synced") {
      setCloudPanelVisible(true);
      const t = setTimeout(() => setCloudPanelVisible(false), 3000);
      return () => clearTimeout(t);
    } else if (status === "ready") {
      if (
        message === "ĐÃ XÓA LƯU TRỮ CỤC BỘ" ||
        message === "LOCAL CACHE WIPED" ||
        message === "ĐÃ XÓA LƯU TRỮ CLOUD" ||
        message === "CLOUD CACHE WIPED"
      ) {
        setCloudPanelVisible(true);
        const t = setTimeout(() => setCloudPanelVisible(false), 3000);
        return () => clearTimeout(t);
      } else {
        setCloudPanelVisible(false);
      }
    } else {
      setCloudPanelVisible(false);
    }
  }, [status, message]);

  const handleJackIn = () => {
    playSynthSfx("boot");
    playSynthSfx("click");
    setIsGlitching(true);
    setTimeout(() => {
      setIsJackedIn(true);
      if (window.__boot && !window.__NCPX_GAME_RUNNING) {
        window.__boot();
      }
    }, 700);
  };

  const renderLore = () => (
    <div className="lore-tab">
      <h3>{language === "vi" ? "KHU VỰC THÀNH PHỐ" : "DISTRICTS"}</h3>
      <div className="db-entry">
        <span className="entry-tag">WATSON</span>
        <p>{language === "vi" ? "Khu công nghiệp bị thao túng bởi các băng nhóm. Watson từng là trung tâm thương mại sầm uất của thành phố, nay chỉ còn là khu ổ chuột và phế liệu." : "Industrial sector overrun by gangs. Watson was once the city's commercial powerhouse, now an enclave of slums and scrap metal."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">WESTBROOK</span>
        <p>{language === "vi" ? "Thánh địa vui chơi của giới siêu giàu. Nơi tụ hội của các tòa nhà chọc trời sạch đẹp thuộc sở hữu tập đoàn và các câu lạc bộ sang trọng tràn ngập ánh đèn neon như Afterlife." : "Playground for the ultra-wealthy. Clean, corporate-owned skyscrapers, and neon-drenched luxury clubs like the Afterlife."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">PACIFICA</span>
        <p>{language === "vi" ? "Khu vực chiến sự bị bỏ hoang. Ban đầu được quy hoạch làm khu nghỉ dưỡng cao cấp, nay là vùng đất vô luật pháp dưới sự cai trị của băng đảng Voodoo Boys." : "Abandoned combat zone. Originally planned as a high-end tourist resort, it is now a lawless warzone ruled by the Voodoo Boys."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">DOGTOWN</span>
        <p>{language === "vi" ? "Khu đô thị tự trị có tường bao quanh. Được cai quản bởi lực lượng dân quân Barghest của Kurt Hansen. Mức độ nguy hiểm cực cao, thường xuyên có hòm tiếp tế của Militech." : "Walled city-within-a-city. Ruled by Kurt Hansen's Barghest militia. High danger, regular Militech supply airdrops."}</p>
      </div>

      <h3>{language === "vi" ? "BĂNG ĐẢNG & TỔ CHỨC" : "GANGS & FACTIONS"}</h3>
      <div className="db-entry">
        <span className="entry-tag maelstrom">MAELSTROM</span>
        <p>{language === "vi" ? "Những quái vật công nghệ ám ảnh với việc nâng cấp cơ thể cực đoan. Vô cùng bạo lực và khó lường." : "Cyber-monsters obsessed with heavy body modification. Extremely violent and unpredictable."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag scavs">SCAVENGERS</span>
        <p>{language === "vi" ? "Bạn trộm cướp linh kiện công nghệ. Chúng chuyên bắt cóc người dân để thu hoạch thiết bị cấy ghép thần kinh và bán ra thị trường chợ đen." : "Chrome thieves. They kidnap citizens to harvest their cyberware and sell it on the black market."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag barghest">BARGHEST</span>
        <p>{language === "vi" ? "Cựu binh lính của tập đoàn Militech đang điều hành chợ đen Dogtown. Được trang bị vũ khí hạng nặng và tính kỷ luật cao." : "Ex-Militech soldiers who run the Dogtown black market. Heavily armed and disciplined."}</p>
      </div>
      <div className="db-entry">
        <span className="entry-tag trauma">TRAUMA TEAM</span>
        <p>{language === "vi" ? "Biệt đội y tế bọc thép tinh nhuệ. Chuyên giải cứu các khách hàng sở hữu thẻ bảo hiểm cao cấp ra khỏi khu vực giao tranh trong vòng chưa đầy 180 giây." : "Elite armored medical squad. They extract premium cardholders from active combat zones in under 180 seconds."}</p>
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="controls-tab">
      <h3>{language === "vi" ? "CẤU HÌNH BÀN PHÍM" : "KEYBOARD BINDINGS"}</h3>
      <div className="control-row">
        <span className="keys">W / A / S / D</span>
        <span className="action">{language === "vi" ? "DI CHUYỂN / ĐI BỘ" : "MOVE / WALK"}</span>
      </div>
      <div className="control-row">
        <span className="keys">MOUSE CLICK</span>
        <span className="action">{language === "vi" ? "NGẮM & BẮN" : "AIM & SHOOT"}</span>
      </div>
      <div className="control-row">
        <span className="keys">SPACEBAR</span>
        <span className="action">{language === "vi" ? "KỸ NĂNG OS (LƯỚT)" : "OS ABILITY (DASH)"}</span>
      </div>
      <div className="control-row">
        <span className="keys">C KEY</span>
        <span className="action">{language === "vi" ? "TIÊM MAXDOC (HỒI MÁU)" : "INJECT MAXDOC"}</span>
      </div>
      <div className="control-row">
        <span className="keys">E KEY / ENTER</span>
        <span className="action">{language === "vi" ? "TƯƠNG TÁC / CỬA HÀNG" : "INTERACT / SHOP"}</span>
      </div>
      <div className="control-row">
        <span className="keys">V KEY</span>
        <span className="action">{language === "vi" ? "ĐIỀU KHIỂN XE" : "VEHICLE CONTROL"}</span>
      </div>
      <div className="control-row">
        <span className="keys">N KEY</span>
        <span className="action">{language === "vi" ? "CHUYỂN KÊNH RADIO" : "CYCLE RADIO"}</span>
      </div>
      <div className="control-row">
        <span className="keys">TAB KEY / ESC</span>
        <span className="action">{language === "vi" ? "TÚI ĐỒ / TẠM DỪNG" : "INVENTORY / PAUSE"}</span>
      </div>

      <h3>{language === "vi" ? "ĐIỀU KHIỂN DI ĐỘNG" : "MOBILE CONTROLS"}</h3>
      <div className="control-row">
        <span className="keys">{language === "vi" ? "CẦN GẠT TRÁI" : "LEFT STICK"}</span>
        <span className="action">{language === "vi" ? "DI CHUYỂN" : "MOVEMENT"}</span>
      </div>
      <div className="control-row">
        <span className="keys">{language === "vi" ? "CẦN GẠT PHẢI" : "RIGHT STICK"}</span>
        <span className="action">{language === "vi" ? "NGẮM & TỰ ĐỘNG BẮN" : "AIM & AUTO-FIRE"}</span>
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
      if (typeof window !== "undefined" && window.SFX && window.SFX.master) {
        window.SFX.master.gain.value = (val / 100) * 0.6;
      }
    };

    const cycleLanguage = () => {
      playSynthSfx("click");
      const nextLang = language === "vi" ? "en" : "vi";
      setLanguage(nextLang);
    };

    const activeRadio = (typeof window !== "undefined" && window.SFX) ? window.SFX.stationName() : "OFF";
    const radioDisplay = activeRadio === "OFF" ? (language === "vi" ? "TẮT" : "OFF") : activeRadio;

    return (
      <div className="system-tab">
        <h3>{language === "vi" ? "THIẾT LẬP HỆ THỐNG" : "SYSTEM SETTINGS"}</h3>
        
        <div className="config-option">
          <label>{language === "vi" ? "ÂM LƯỢNG HỆ THỐNG: " : "AUDIO INTERFACE VOLUME: "}{volume}%</label>
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
          <label>{language === "vi" ? "HIỆU ỨNG MÀN HÌNH CRT" : "CRT SCANLINE MODULE"}</label>
          <button 
            className={`btn-toggle ${crtActive ? "on" : "off"}`} 
            onClick={toggleCrt}
          >
            {crtActive ? (language === "vi" ? "KÍCH HOẠT" : "ENABLED") : (language === "vi" ? "VÔ HIỆU" : "DISABLED")}
          </button>
        </div>

        <div className="config-option">
          <label>{language === "vi" ? "NGÔN NGỮ HỆ THỐNG" : "COGNITIVE LANGUAGE"}</label>
          <button 
            className="btn-toggle" 
            onClick={cycleLanguage}
          >
            {language === "vi" ? "TIẾNG VIỆT (VI)" : "ENGLISH (EN)"}
          </button>
        </div>

        <div className="config-option">
          <label>{language === "vi" ? "KÊNH PHÁT THANH NET" : "ACTIVE NET RADIO"}</label>
          <div className="radio-display">
            <span className="radio-name">{radioDisplay}</span>
            <button 
              className="radio-cycle-btn"
              onClick={() => {
                playSynthSfx("click");
                if (typeof window !== "undefined" && window.SFX) {
                  window.SFX.cycleStation();
                  setVolume(v => v); // trigger state update
                }
              }}
            >
              {language === "vi" ? "CHUYỂN KÊNH" : "CYCLE"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const closeModal = () => {
    playSynthSfx("click");
    if (typeof window !== "undefined" && window.G) {
      window.G.ui = null;
      if (window.SFX && window.SFX.ui) window.SFX.ui();
    }
    setActiveUi(null);
  };

  const isWideUi = (ui) => {
    return ["guns", "cars", "ripper", "inv", "wardrobe"].includes(ui);
  };

  const getModalTitle = (ui, lang) => {
    switch (ui) {
      case "pause":
        return lang === "vi" ? "THIẾT LẬP HỆ THỐNG" : "SYSTEM PAUSE / SETTINGS";
      case "guns":
        return lang === "vi" ? "CỬA HÀNG VŨ KHÍ — WEAPONS" : "2ND AMENDMENT — WEAPONS";
      case "cars":
        return lang === "vi" ? "ĐẠI LÝ PHƯƠNG TIỆN — VEHICLES" : "NC AUTOFIXER — VEHICLES";
      case "ripper":
        return lang === "vi" ? "PHÒNG KHÁM RIPPERDOC — CHROME" : "VIK'S CLINIC — RIPPERDOC CHROME";
      case "talk":
        return lang === "vi" ? "HỘI THOẠI THẦN KINH" : "NEURAL DIALOGUE LINK";
      case "wardrobe":
        return lang === "vi" ? "GƯƠNG SOI — PHÒNG THAY ĐỒ" : "MIRROR — WARDROBE & STYLING";
      case "bar":
        return "AFTERLIFE BAR";
      case "casino":
        return lang === "vi" ? "SÒNG BẠC — TÀI XỈU" : "RED NEON CASINO — DICE GAME";
      case "inv":
        return lang === "vi" ? "TÚI ĐỒ / ĐIỀU KHIỂN CHROME" : "NEURAL INVENTORY / COGNITIVE DECK";
      case "gang":
        return lang === "vi" ? "QUẢN LÝ BĂNG ĐẢNG" : "CYBER CREW & GANG PANEL";
      default:
        return "SYSTEM DIALOG";
    }
  };

  const rollDice = () => {
    if (typeof window === "undefined" || !window.G) return;
    const s = window.G.uiS;
    s.bet = s.bet || 100;
    s.choice = s.choice !== undefined ? s.choice : 1;
    if (window.G.eddies < s.bet) {
      if (window.msg) window.msg(language === 'vi' ? 'KHÔNG ĐỦ EDDIES' : 'NOT ENOUGH EDDIES', '#ff5a5a');
      if (window.SFX && window.SFX.deny) window.SFX.deny();
      return;
    }
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    s.dice = [d1, d2, d3];
    const sum = d1 + d2 + d3;
    if (sum === 3 || sum === 18) {
      s.result = 'triple';
      window.G.eddies -= s.bet;
      if (window.SFX && window.SFX.hurt) window.SFX.hurt();
    } else {
      const sumOutcome = (sum >= 11 && sum <= 17) ? 1 : 0;
      if (sumOutcome === s.choice) {
        s.result = 'win';
        window.G.eddies += s.bet;
        if (window.SFX && window.SFX.levelup) window.SFX.levelup();
      } else {
        s.result = 'lose';
        window.G.eddies -= s.bet;
        if (window.SFX && window.SFX.hurt) window.SFX.hurt();
      }
    }
    if (window.saveGame) window.saveGame();
    forceUpdate();
  };

  const renderModalContent = (ui) => {
    switch (ui) {
      case "pause":
        return renderPauseContent();
      case "guns":
        return renderGunsShop();
      case "cars":
        return renderCarsShop();
      case "ripper":
        return renderRipperShop();
      case "talk":
        return renderTalk();
      case "wardrobe":
        return renderWardrobe();
      case "bar":
        return renderBar();
      case "casino":
        return renderCasino();
      case "inv":
        return renderInventory();
      case "gang":
        return renderGangMenu();
      default:
        return null;
    }
  };

  const renderPauseContent = () => {
    const soundLabel = (typeof window !== "undefined" && window.SFX && window.SFX.muted)
      ? (language === "vi" ? "ÂM THANH: TẮT" : "SOUND: OFF")
      : (language === "vi" ? "ÂM THANH: BẬT" : "SOUND: ON");

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Language Option */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "NGÔN NGỮ HỆ THỐNG" : "COGNITIVE LANGUAGE"}</label>
          <div className="option-controls">
            <button 
              className={`cyber-modal-btn ${language === "vi" ? "active" : ""}`}
              onClick={() => { playSynthSfx("click"); setLanguage("vi"); }}
            >
              TIẾNG VIỆT (VI)
            </button>
            <button 
              className={`cyber-modal-btn ${language === "en" ? "active" : ""}`}
              onClick={() => { playSynthSfx("click"); setLanguage("en"); }}
            >
              ENGLISH (EN)
            </button>
          </div>
        </div>

        {/* Volume Option */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "ÂM LƯỢNG HỆ THỐNG: " : "AUDIO INTERFACE VOLUME: "}{volume}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setVolume(val);
              if (typeof window !== "undefined" && window.SFX && window.SFX.master) {
                window.SFX.master.gain.value = (val / 100) * 0.6;
              }
            }}
            className="slider"
          />
        </div>

        {/* Sound Toggle */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "HIỆU ỨNG ÂM THANH" : "SYSTEM SOUND FX"}</label>
          <button 
            className="cyber-modal-btn active"
            onClick={() => {
              playSynthSfx("click");
              if (typeof window !== "undefined" && window.SFX) {
                window.SFX.toggleMute();
                forceUpdate();
              }
            }}
          >
            {soundLabel}
          </button>
        </div>

        {/* CRT Option */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "HIỆU ỨNG MÀN HÌỂN CRT" : "CRT SCANLINE MODULE"}</label>
          <button 
            className={`cyber-modal-btn ${crtActive ? "active" : ""}`} 
            onClick={() => { playSynthSfx("click"); setCrtActive(!crtActive); }}
          >
            {crtActive ? (language === "vi" ? "KÍCH HOẠT" : "ENABLED") : (language === "vi" ? "VÔ HIỆU" : "DISABLED")}
          </button>
        </div>

        {/* Radio Option */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "KÊNH PHÁT THANH NET" : "ACTIVE NET RADIO"}</label>
          <div className="radio-display">
            <span className="radio-name">
              {(typeof window !== "undefined" && window.SFX && window.SFX.stationName() === "OFF")
                ? (language === "vi" ? "TẮT" : "OFF")
                : ((typeof window !== "undefined" && window.SFX) ? window.SFX.stationName() : "OFF")}
            </span>
            <button 
              className="cyber-modal-btn"
              onClick={() => {
                playSynthSfx("click");
                if (typeof window !== "undefined" && window.SFX) {
                  window.SFX.cycleStation();
                  forceUpdate();
                }
              }}
            >
              {language === "vi" ? "CHUYỂN KÊNH" : "CYCLE"}
            </button>
          </div>
        </div>

        {/* Account / Save Details */}
        <div className="cyber-modal-option">
          <label>{language === "vi" ? "TÀI KHOẢN CLOUD" : "CLOUD ACCOUNT"}</label>
          <div className="account-info">
            <div><strong>{language === "vi" ? "Tên nhân vật: " : "Player Name: "}</strong>{activeAccount?.name || playerName}</div>
            <div><strong>Account ID: </strong>{activeAccount?.id || "NO_ACCOUNT"}</div>
            <div><strong>{language === "vi" ? "Khe lưu trữ: " : "Cloud Slot: "}</strong>{activeAccount?.slot || slot}</div>
            <div><strong>{language === "vi" ? "Loại tài khoản: " : "Provider: "}</strong>{(activeAccount?.provider || "quick").toUpperCase()}</div>
            <div><strong>{language === "vi" ? "Mã đăng nhập: " : "Login Code: "}</strong>{activeAccount && accountToken ? `${activeAccount.id}:${accountToken}` : "—"}</div>
            <div><strong>{language === "vi" ? "Trạng thái: " : "Status: "}</strong>{message}</div>
          </div>
        </div>

        {/* Controls Guide */}
        <div className="cyber-modal-option" style={{ marginTop: '4px' }}>
          <label>{language === "vi" ? "CẤU HÌNH PHÍM CHƠI" : "INTERACTION CONTROL GUIDELINES"}</label>
          <div style={{ fontSize: '9px', color: '#5a6372', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>WASD: {language === "vi" ? "Di chuyển V" : "Walk & Move V"} | Mouse: {language === "vi" ? "Ngắm bắn" : "Aim & Shoot"}</div>
            <div>SPACE: {language === "vi" ? "Dash Lướt" : "Dash Action"} | R: {language === "vi" ? "Nạp đạn" : "Reload weapon"}</div>
            <div>Q: {language === "vi" ? "Sandevistan/Berserk" : "Use Deck OS"} | F: {language === "vi" ? "Tàng hình" : "Optical Camouflage"}</div>
            <div>C: {language === "vi" ? "Hồi máu Maxdoc" : "Inject Maxdoc HP"} | V: {language === "vi" ? "Gọi xe / Lên xe" : "Summon / Drive vehicle"}</div>
            <div>N: {language === "vi" ? "Đổi kênh Radio" : "Cycle vehicle radio"} | TAB: {language === "vi" ? "Mở túi đồ" : "Access neural inventory"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="cyber-modal-actions">
          <button 
            className="cyber-action-btn primary"
            onClick={() => {
              playSynthSfx("click");
              if (typeof window !== "undefined" && typeof window.saveGame === "function") {
                window.saveGame();
                if (window.msg) window.msg(language === 'vi' ? 'ĐÃ LƯU GAME THÀNH CÔNG' : 'NEURAL PROGRESS SAVED', '#2ecc71');
              }
            }}
          >
            {language === "vi" ? "LƯU TRÒ CHƠI" : "SAVE GAME"}
          </button>
          
          <button 
            className="cyber-action-btn danger"
            onClick={() => {
              playSynthSfx("click");
              if (confirmWipe) {
                if (typeof window !== "undefined" && typeof window.wipeSave === "function") {
                  window.wipeSave();
                  window.G.ui = null;
                  window.G.state = 'title';
                  window.G.titleMode = 'name';
                  window.G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
                }
                setActiveUi(null);
              } else {
                setConfirmWipe(true);
              }
            }}
          >
            {confirmWipe 
              ? (language === "vi" ? "XÁC NHẬN XÓA LƯU? [CLICK LẠI]" : "CONFIRM WIPE? [CLICK AGAIN]")
              : (language === "vi" ? "CHƠI MỚI / THIẾT LẬP LẠI" : "NEW GAME / RESET")}
          </button>
        </div>
      </div>
    );
  };

  const renderGunsShop = () => {
    if (typeof window === 'undefined' || !window.WEAPONS) return null;
    const stock = window.WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden);
    const selectedWeapon = stock.find(w => w.id === selectedWeaponId) || stock[0];

    const getDps = w => Math.round(w.dmg * (w.pellets || 1) * w.rof);
    const fmt = val => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {stock.map(w => {
            const owned = playerState.weapons[w.id];
            const lowLevel = playerState.lvl < w.lvl;
            const priceColor = owned ? '#5a6372' : lowLevel ? '#ff5a5a' : playerState.eddies >= w.price ? '#2ecc71' : '#ff5a5a';
            const priceText = owned ? (language === 'vi' ? 'ĐÃ SỞ HỮU' : 'OWNED') : lowLevel ? `LV${w.lvl}` : `€$${fmt(w.price)}`;

            const rarColors = {
              0: '#cfd6e4',
              1: '#00ff9f',
              2: '#05d9e8',
              3: '#bd00ff',
              4: '#f9f002'
            };
            const nameColor = owned ? '#5a6372' : (rarColors[w.rar] || '#cfd6e4');

            return (
              <div
                key={w.id}
                className={`cyber-list-item ${selectedWeapon?.id === w.id ? 'active' : ''}`}
                onClick={() => { playSynthSfx("hover"); setSelectedWeaponId(w.id); }}
              >
                <span style={{ color: nameColor }}>{w.name}</span>
                <span style={{ color: priceColor }}>{priceText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel">
          {selectedWeapon ? (
            <>
              <h3 className="cyber-detail-title">{selectedWeapon.name}</h3>
              <div className="cyber-detail-subtitle">
                {window.RAR_NAME ? window.RAR_NAME[selectedWeapon.rar] : 'COMMON'} · {selectedWeapon.kind.toUpperCase()} · {selectedWeapon.cls.toUpperCase()}
              </div>

              <div className="cyber-modal-body" style={{ gap: '8px', marginTop: '10px' }}>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">DMG</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, (selectedWeapon.dmg * (selectedWeapon.pellets || 1)) / 1.2)}%`, backgroundColor: '#ff5a5a' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedWeapon.dmg * (selectedWeapon.pellets || 1)}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">RPS</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, selectedWeapon.rof * 6.25)}%`, backgroundColor: '#f9f002' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedWeapon.rof}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">MAG</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, (selectedWeapon.mag || 0) * 1.25)}%`, backgroundColor: '#05d9e8' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedWeapon.mag || '—'}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">DPS</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, getDps(selectedWeapon) / 2.2)}%`, backgroundColor: '#bd00ff' }} />
                  </div>
                  <span className="cyber-stat-value">{getDps(selectedWeapon)}</span>
                </div>
              </div>

              <div className="cyber-description">
                {selectedWeapon.desc}
              </div>

              {playerState.weapons[selectedWeapon.id] ? (
                <button className="cyber-action-btn primary" disabled style={{ opacity: 0.5 }}>
                  {language === 'vi' ? 'ĐÃ SỞ HỮU' : 'OWNED'}
                </button>
              ) : playerState.lvl < selectedWeapon.lvl ? (
                <button className="cyber-action-btn danger" disabled style={{ opacity: 0.5 }}>
                  {language === 'vi' ? `YÊU CẦU CẤP ĐỘ ${selectedWeapon.lvl}` : `REQUIRES LEVEL ${selectedWeapon.lvl}`}
                </button>
              ) : (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyWeapon) window.buyWeapon(selectedWeapon.id);
                  }}
                >
                  {language === 'vi' ? `MUA — €$${fmt(selectedWeapon.price)}` : `BUY — €$${fmt(selectedWeapon.price)}`}
                </button>
              )}
            </>
          ) : (
            <div style={{ color: '#5a6372', textAlign: 'center', margin: 'auto' }}>
              {language === 'vi' ? 'CHỌN MỘT VŨ KHÍ' : 'SELECT A WEAPON'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCarsShop = () => {
    if (typeof window === 'undefined' || !window.CARS) return null;
    const cars = window.CARS;
    const selectedCar = cars.find(c => c.id === selectedCarId) || cars[0];
    const fmt = val => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {cars.map(car => {
            const owned = playerState.cars[car.id];
            const active = playerState.activeCar === car.id;
            const statusColor = active ? '#00ff9f' : owned ? '#5a6372' : playerState.eddies >= car.price ? '#2ecc71' : '#ff5a5a';
            const statusText = active ? (language === 'vi' ? 'ĐANG DÙNG' : 'ACTIVE') : owned ? (language === 'vi' ? 'ĐÃ SỞ HỮU' : 'OWNED') : `€$${fmt(car.price)}`;

            return (
              <div
                key={car.id}
                className={`cyber-list-item ${selectedCar?.id === car.id ? 'active' : ''}`}
                onClick={() => { playSynthSfx("hover"); setSelectedCarId(car.id); }}
              >
                <span>{car.name}</span>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel">
          {selectedCar ? (
            <>
              <h3 className="cyber-detail-title">{selectedCar.name}</h3>
              <div className="cyber-detail-subtitle">
                {selectedCar.bike ? (language === 'vi' ? 'MÔ TÔ' : 'MOTORCYCLE') : (language === 'vi' ? 'Ô TÔ' : 'CAR')} · {selectedCar.shape.toUpperCase()}
              </div>

              <div className="cyber-modal-body" style={{ gap: '8px', marginTop: '10px' }}>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">TOP</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, selectedCar.top / 3.6)}%`, backgroundColor: '#f9f002' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.top}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">ACC</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, selectedCar.acc / 3.2)}%`, backgroundColor: '#ff5a5a' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.acc}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">GRIP</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, (selectedCar.grip - 0.8) / 0.16 * 100)}%`, backgroundColor: '#05d9e8' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.grip.toFixed(2)}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">HP</span>
                  <div className="cyber-stat-bar-track">
                    <div className="cyber-stat-bar-fill" style={{ width: `${Math.min(100, selectedCar.hp / 4.2)}%`, backgroundColor: '#00ff9f' }} />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.hp}</span>
                </div>
              </div>

              {playerState.activeCar === selectedCar.id ? (
                <button className="cyber-action-btn primary" disabled style={{ opacity: 0.5 }}>
                  {language === 'vi' ? 'PHƯƠNG TIỆN HOẠT ĐỘNG' : 'YOUR ACTIVE RIDE'}
                </button>
              ) : playerState.cars[selectedCar.id] ? (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.setActiveCar) window.setActiveCar(selectedCar.id);
                  }}
                >
                  {language === 'vi' ? 'THIẾT LẬP HOẠT ĐỘNG' : 'SET ACTIVE'}
                </button>
              ) : (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyCar) window.buyCar(selectedCar.id);
                  }}
                >
                  {language === 'vi' ? `MUA — €$${fmt(selectedCar.price)}` : `BUY — €$${fmt(selectedCar.price)}`}
                </button>
              )}
            </>
          ) : (
            <div style={{ color: '#5a6372', textAlign: 'center', margin: 'auto' }}>
              {language === 'vi' ? 'CHỌN MỘT PHƯƠNG TIỆN' : 'SELECT A VEHICLE'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRipperShop = () => {
    if (typeof window === 'undefined' || !window.CYBER || !window.CYBER_SLOTS) return null;
    const slots = window.CYBER_SLOTS;
    const items = [];
    slots.forEach(slot => {
      items.push({ isHeader: true, text: slot });
      window.CYBER.filter(c => c.slot === slot).forEach(c => {
        items.push({ isHeader: false, cy: c });
      });
    });

    const firstCy = items.find(it => !it.isHeader)?.cy;
    const selectedCyber = window.CYBER.find(c => c.id === selectedCyberId) || firstCy;
    const fmt = val => Number(val).toLocaleString();

    const getFxDesc = (cy, ti) => {
      const t = cy.tiers[ti];
      if (!t) return '';
      switch (cy.id) {
        case 'sandevistan': return `TIME ${Math.round(t.ts * 100)}% FOR ${t.dur}S · CD ${t.cd}S`;
        case 'berserk': return `DMG ×${t.dmg} +${t.armor} ARMOR · ${t.dur}S`;
        case 'memboost': return `XP ×${t.xp}`;
        case 'kiroshi': return `CRIT +${Math.round(t.crit * 100)}%` + (ti >= 1 ? ' · WIDE MINIMAP' : '');
        case 'biomonitor': return 'AUTO-MAXDOC BELOW 30% HP';
        case 'second_heart': return 'REVIVE ON DEATH · CD 180S';
        case 'kerenzikov': return `DASH SLOWS TIME TO ${Math.round(t.ts * 100)}% FOR ${t.dur}S`;
        case 'subdermal': return `+${t.armor} ARMOR`;
        case 'camo': return `INVISIBLE ${t.dur}S · CD ${t.cd}S`;
        case 'titanium': return `+${t.hp} MAX HP`;
        case 'microrotor': return `FIRE RATE ×${t.rof}`;
        case 'smartlink': return `SMART GUNS TRACK · TURN ${t.turn}`;
        case 'tendons': return `SPEED ×${t.spd} · DASH CD ×${t.dash}`;
        default: return cy.grants ? `ADDS ${window.WPN && window.WPN[cy.grants] ? window.WPN[cy.grants].name : cy.grants} TO ARSENAL` : 'UPGRADE';
      }
    };

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {items.map((it, idx) => {
            if (it.isHeader) {
              return (
                <div key={`hdr-${idx}`} style={{ padding: '6px 12px', fontSize: '10px', color: '#3a5a66', borderBottom: '1px dashed rgba(58,90,102,0.3)', marginTop: '8px', fontFamily: 'var(--font-title)' }}>
                  — {it.text} —
                </div>
              );
            }
            const cy = it.cy;
            const tier = playerState.cyber[cy.id] || 0;
            const max = cy.tiers.length;
            const activeOs = cy.os && playerState.os === cy.id;

            let statusText = '';
            let statusColor = '#2ecc71';

            if (cy.os && tier && playerState.os !== cy.id) {
              statusText = language === 'vi' ? 'KÍCH HOẠT' : 'ACTIVATE';
              statusColor = '#f9f002';
            } else if (tier >= max) {
              statusText = cy.os && activeOs ? 'ACTIVE·MAX' : (language === 'vi' ? 'TỐI ĐA' : 'MAXED');
              statusColor = '#5a6372';
            } else {
              const t = cy.tiers[tier];
              statusText = playerState.lvl < t.lvl ? `LV${t.lvl}` : `€$${fmt(t.price)}`;
              statusColor = playerState.lvl < t.lvl ? '#ff5a5a' : playerState.eddies >= t.price ? '#2ecc71' : '#ff5a5a';
            }

            return (
              <div
                key={cy.id}
                className={`cyber-list-item ${selectedCyber?.id === cy.id ? 'active' : ''}`}
                onClick={() => { playSynthSfx("hover"); setSelectedCyberId(cy.id); }}
              >
                <div>
                  <span style={{ color: tier ? '#05d9e8' : '#cfd6e4', marginRight: '6px' }}>{cy.name}</span>
                  {Array.from({ length: max }).map((_, k) => (
                    <span
                      key={k}
                      style={{
                        display: 'inline-block',
                        width: '4px',
                        height: '4px',
                        marginRight: '2px',
                        backgroundColor: k < tier ? '#05d9e8' : 'rgba(255,255,255,0.15)',
                        verticalAlign: 'middle'
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel" style={{ borderColor: 'rgba(5, 217, 232, 0.2)', backgroundColor: 'rgba(5, 217, 232, 0.01)' }}>
          {selectedCyber ? (
            <>
              <h3 className="cyber-detail-title" style={{ color: 'var(--cyber-cyan)' }}>{selectedCyber.name}</h3>
              <div className="cyber-detail-subtitle">
                {selectedCyber.slot} {selectedCyber.os ? '· OS CHIP' : ''}
              </div>

              <div className="cyber-description" style={{ borderTop: 'none', paddingTop: 0 }}>
                {selectedCyber.desc}
              </div>

              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCyber.tiers.map((t, idx) => {
                  const owned = idx < (playerState.cyber[selectedCyber.id] || 0);
                  return (
                    <div key={idx} style={{ fontSize: '10px', color: owned ? '#05d9e8' : '#5a6372', display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>MK.{idx + 1}</span>
                      <span>{getFxDesc(selectedCyber, idx)}</span>
                    </div>
                  );
                })}
              </div>

              {selectedCyber.os && (playerState.cyber[selectedCyber.id] || 0) > 0 && playerState.os !== selectedCyber.id ? (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyCyber) window.buyCyber(selectedCyber.id);
                  }}
                >
                  {language === 'vi' ? 'KÍCH HOẠT HỆ ĐIỀU HÀNH' : 'ACTIVATE OS'}
                </button>
              ) : (playerState.cyber[selectedCyber.id] || 0) >= selectedCyber.tiers.length ? (
                <button className="cyber-action-btn primary" disabled style={{ opacity: 0.5 }}>
                  {language === 'vi' ? 'ĐÃ CÀI ĐẶT TỐI ĐA' : 'FULLY INSTALLED'}
                </button>
              ) : (
                (() => {
                  const currentTier = playerState.cyber[selectedCyber.id] || 0;
                  const t = selectedCyber.tiers[currentTier];
                  const lowLevel = playerState.lvl < t.lvl;

                  return lowLevel ? (
                    <button className="cyber-action-btn danger" disabled style={{ opacity: 0.5 }}>
                      {language === 'vi' ? `YÊU CẦU CẤP ĐỘ ${t.lvl}` : `REQUIRES LEVEL ${t.lvl}`}
                    </button>
                  ) : (
                    <button
                      className="cyber-action-btn primary"
                      onClick={() => {
                        playSynthSfx("click");
                        if (window.buyCyber) window.buyCyber(selectedCyber.id);
                      }}
                    >
                      {language === 'vi'
                        ? `${currentTier ? 'NÂNG CẤP' : 'CÀI ĐẶT'} — €$${fmt(t.price)}`
                        : `${currentTier ? 'UPGRADE' : 'INSTALL'} — €$${fmt(t.price)}`}
                    </button>
                  );
                })()
              )}
            </>
          ) : (
            <div style={{ color: '#5a6372', textAlign: 'center', margin: 'auto' }}>
              {language === 'vi' ? 'CHỌN THIẾT BỊ CẤY GHÉP' : 'SELECT CYBERWARE'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBar = () => {
    return (
      <div className="cyber-modal-body" style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ color: '#8a93a6', fontSize: '12px', marginBottom: '20px' }}>
          {language === 'vi' ? 'CHÀO MỪNG ĐẾN VỚI AFTERLIFE BAR' : 'WELCOME TO THE AFTERLIFE BAR'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="cyber-modal-btn"
            style={{ padding: '12px' }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(0);
            }}
          >
            &apos;JOHNNY SILVERHAND&apos; — €$100
          </button>
          <button
            className="cyber-modal-btn"
            style={{ padding: '12px' }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(1);
            }}
          >
            MAXDOC (+1) — €$50
          </button>
          <button
            className="cyber-modal-btn active"
            style={{ padding: '12px' }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(2);
            }}
          >
            {language === 'vi' ? 'RỜI QUÁN' : 'LEAVE BAR'}
          </button>
        </div>

        <p style={{ fontSize: '10px', color: '#5a6372', marginTop: '20px' }}>
          {language === 'vi' ? 'HỒI PHỤC HOÀN TOÀN + TĂNG TỐC ĐỘ 20 GIÂY' : 'FULL HEAL + SPEED BUFF 20S'}
        </p>
      </div>
    );
  };

  const renderTalk = () => {
    if (!playerState.talk) return null;
    const n = playerState.talk.npc;
    const opts = window.talkOptions ? window.talkOptions(n) : [];

    return (
      <div className="talk-avatar-text">
        <div className="talk-npc-name">{n.name} · {n.kind === 'doll' ? 'CLOUDS' : 'JIG-JIG STREET'}</div>
        <div className="talk-npc-text">&ldquo;{playerState.talk.text}&rdquo;</div>
        
        <div className="talk-options">
          {opts.map((opt, i) => (
            <button
              key={i}
              className="cyber-modal-btn"
              style={{ textAlign: 'left', padding: '10px 16px' }}
              onClick={() => {
                playSynthSfx("click");
                if (window.talkSelect) window.talkSelect(i);
              }}
            >
              &gt; {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWardrobe = () => {
    const stock = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const selectedOutfit = selectedSkinId;
    const fmt = val => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {stock.map(row => {
            const name = row === null ? (language === 'vi' ? 'MẶC ĐỊNH V' : 'DEFAULT V') : (language === 'vi' ? `BỘ TRANG PHỤC #${row + 1}` : `OUTFIT #${row + 1}`);
            const equipped = playerState.skin === row;
            const statusColor = equipped ? '#5a6372' : playerState.eddies >= 100 ? '#2ecc71' : '#ff5a5a';
            const statusText = equipped ? (language === 'vi' ? 'ĐANG MẶC' : 'EQUIPPED') : '€$100';

            return (
              <div
                key={row === null ? 'null' : row}
                className={`cyber-list-item ${selectedSkinId === row ? 'active' : ''}`}
                onClick={() => { playSynthSfx("hover"); setSelectedSkinId(row); }}
              >
                <span>{name}</span>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel" style={{ borderColor: 'var(--cyber-pink)' }}>
          <h3 className="cyber-detail-title" style={{ color: 'var(--cyber-pink)' }}>
            {selectedOutfit === null ? (language === 'vi' ? 'DIỆN MẠO MẶC ĐỊNH V' : 'DEFAULT V') : (language === 'vi' ? `BỘ TRANG PHỤC KHÁC #${selectedOutfit + 1}` : `CIVILIAN OUTFIT #${selectedOutfit + 1}`)}
          </h3>
          <div className="cyber-detail-subtitle">
            {language === 'vi' ? 'GIỚI TÍNH: ' : 'GENDER: '} {playerState.gender === 'f' ? (language === 'vi' ? 'NỮ' : 'FEMALE') : (language === 'vi' ? 'NAM' : 'MALE')}
          </div>

          <OutfitPreview skinId={selectedOutfit} gender={playerState.gender} language={language} />

          {playerState.skin === selectedOutfit ? (
            <button className="cyber-action-btn primary" disabled style={{ opacity: 0.5 }}>
              {language === 'vi' ? 'ĐÃ ĐƯỢC TRANG BỊ' : 'ALREADY EQUIPPED'}
            </button>
          ) : playerState.eddies < 100 ? (
            <button className="cyber-action-btn danger" disabled style={{ opacity: 0.5 }}>
              {language === 'vi' ? 'KHÔNG ĐỦ EDDIES' : 'NOT ENOUGH EDDIES'}
            </button>
          ) : (
            <button
              className="cyber-action-btn primary"
              onClick={() => {
                playSynthSfx("click");
                if (window.buyWardrobeOutfit) window.buyWardrobeOutfit(selectedOutfit);
              }}
            >
              {language === 'vi' ? 'TRANG BỊ LÊN — €$100' : 'EQUIP — €$100'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCasino = () => {
    if (typeof window === 'undefined' || !window.G || !window.G.uiS) return null;
    const s = window.G.uiS;
    s.bet = s.bet || 100;
    s.choice = s.choice !== undefined ? s.choice : 1;
    const choiceText = s.choice === 1 ? (language === 'vi' ? 'TÀI (BIG)' : 'BIG (TÀI)') : (language === 'vi' ? 'XỈU (SMALL)' : 'SMALL (XỈU)');
    const fmt = val => Number(val).toLocaleString();

    return (
      <div className="cyber-modal-body" style={{ gap: '12px' }}>
        <p style={{ color: '#8a93a6', fontSize: '11px', textAlign: 'center', marginBottom: '8px' }}>
          {language === 'vi' ? 'TRÒ CHƠI TÀI XỈU - NHÂN ĐÔI SỐ TIỀN CƯỢC' : 'BET AND DOUBLE YOUR EDDIES ON DICE'}
        </p>

        <div className="gang-select-row">
          <span>{language === 'vi' ? 'TIỀN ĐẶT CƯỢC' : 'BET SIZE'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); s.bet = Math.max(100, s.bet - 100); forceUpdate(); }}>◀</button>
            <span style={{ color: 'var(--cyber-yellow)', fontWeight: 'bold' }}>€$ {fmt(s.bet)}</span>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); s.bet = s.bet + 100; forceUpdate(); }}>▶</button>
          </div>
        </div>

        <div className="gang-select-row">
          <span>{language === 'vi' ? 'LỰA CHỌN' : 'CHOICE'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); s.choice = 1 - s.choice; forceUpdate(); }}>◀</button>
            <span style={{ color: 'var(--cyber-cyan)', fontWeight: 'bold' }}>{choiceText}</span>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); s.choice = 1 - s.choice; forceUpdate(); }}>▶</button>
          </div>
        </div>

        <button className="cyber-action-btn primary" onClick={() => { playSynthSfx("click"); rollDice(); }}>
          {language === 'vi' ? 'LẮC XÚC XẮC // ROLL DICE' : 'ROLL DICE // LẮC XÚC XẮC'}
        </button>

        {s.dice && (
          <div>
            <div className="casino-dice-container">
              {s.dice.map((val, idx) => (
                <div key={idx} className="casino-dice-box">{val}</div>
              ))}
            </div>
            
            <div className="casino-result">
              <span style={{ color: '#8a93a6' }}>SUM = {s.dice[0] + s.dice[1] + s.dice[2]}</span> &middot;{' '}
              {s.result === 'win' && <span style={{ color: '#2ecc71' }}>{language === 'vi' ? 'THẮNG!' : 'WIN!'} +€${fmt(s.bet)}</span>}
              {s.result === 'lose' && <span style={{ color: '#ff2a3c' }}>{language === 'vi' ? 'THUA!' : 'LOSE!'} -€${fmt(s.bet)}</span>}
              {s.result === 'triple' && <span style={{ color: '#ff2a3c' }}>{language === 'vi' ? 'BA CON GIỐNG NHAU - NHÀ CÁI ĂN!' : 'TRIPLE! DEALER WINS'}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGangMenu = () => {
    if (typeof window === 'undefined' || !window.G) return null;
    const names = window.PLAYER_GANG_NAMES || ["SOLO"];
    const icons = window.PLAYER_GANG_ICONS || [];
    const G = window.G;

    G.gangNameSel = G.gangNameSel || 0;
    G.gangIconSel = G.gangIconSel || 0;

    const iconObj = window.gangIconObj ? window.gangIconObj(G.gangIconSel) : { mark: '?', name: 'SOLO', col: '#8a93a6' };

    const inviteTarget = window.nearestRemotePlayer ? window.nearestRemotePlayer(rp => G.gang && !window.sameGangProfile(rp, window.playerProfile())) : null;
    const requestTarget = window.nearestRemotePlayer ? window.nearestRemotePlayer(rp => !G.gang && rp.gang && rp.gang !== 'SOLO') : null;

    const getGangLabel = gang => window.gangLabel ? window.gangLabel(gang) : 'CHƯA CÓ';
    const getFactionColor = fac => window.factionColor ? window.factionColor(fac) : '#8a93a6';

    const fmtName = name => window.cleanPlayerName ? window.cleanPlayerName(name) : name;

    return (
      <div className="cyber-modal-body" style={{ gap: '12px' }}>
        <div className="gang-select-row">
          <span>{language === 'vi' ? 'BĂNG ĐẢNG HIỆN TẠI:' : 'CURRENT faction:'}</span>
          <span style={{ color: G.gang ? getFactionColor(G.gang) : '#8a93a6', fontWeight: 'bold' }}>
            {getGangLabel(G.gang)}
          </span>
        </div>

        <div className="gang-select-row">
          <span>{language === 'vi' ? 'CHỌN TÊN BĂNG' : 'CHOOSE GANG NAME'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); G.gangNameSel = (G.gangNameSel - 1 + names.length) % names.length; forceUpdate(); }}>◀</button>
            <span style={{ color: 'var(--cyber-yellow)', fontWeight: 'bold' }}>{names[G.gangNameSel]}</span>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); G.gangNameSel = (G.gangNameSel + 1) % names.length; forceUpdate(); }}>▶</button>
          </div>
        </div>

        <div className="gang-select-row">
          <span>{language === 'vi' ? 'BIỂU TƯỢNG BĂNG' : 'GANG ICON'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); G.gangIconSel = (G.gangIconSel - 1 + icons.length) % icons.length; forceUpdate(); }}>◀</button>
            <span style={{ color: iconObj.col, fontWeight: 'bold' }}>[{iconObj.mark}] {iconObj.name}</span>
            <button className="gang-nav-btn" onClick={() => { playSynthSfx("click"); G.gangIconSel = (G.gangIconSel + 1) % icons.length; forceUpdate(); }}>▶</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          <button
            className="cyber-modal-btn"
            onClick={() => {
              playSynthSfx("click");
              if (window.gangMenuAct) window.gangMenuAct(0);
            }}
          >
            {G.gang === 'player' ? (language === 'vi' ? 'ĐỔI TÊN BĂNG' : 'RENAME GANG') : (language === 'vi' ? 'TẠO BĂNG ĐẢNG MỚI' : 'CREATE GANG')}
          </button>

          {inviteTarget ? (
            <button
              className="cyber-modal-btn"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(1);
              }}
            >
              {language === 'vi' ? `MỜI NGƯỜI CHƠI: ${fmtName(inviteTarget.name)}` : `INVITE PLAYER: ${fmtName(inviteTarget.name)}`}
            </button>
          ) : (
            <button className="cyber-modal-btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
              {language === 'vi' ? 'KHÔNG CÓ NGƯỜI CHƠI ĐỂ MỜI' : 'NO ELIGIBLE PLAYERS NEARBY'}
            </button>
          )}

          {requestTarget ? (
            <button
              className="cyber-modal-btn"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(2);
              }}
            >
              {language === 'vi' ? `XIN GIA NHẬP: ${requestTarget.gang}` : `REQUEST JOIN GANG: ${requestTarget.gang}`}
            </button>
          ) : (
            <button className="cyber-modal-btn" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
              {language === 'vi' ? 'KHÔNG CÓ BĂNG ĐỂ XIN GIA NHẬP' : 'NO GANG TO REQUEST JOIN'}
            </button>
          )}

          {G.gangJoinReq && G.gang ? (
            <button
              className="cyber-modal-btn"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(3);
              }}
            >
              {language === 'vi' ? `CHẤP THUẬN THÀNH VIÊN: ${fmtName(G.gangJoinReq.fromName)}` : `APPROVE JOIN REQUEST: ${fmtName(G.gangJoinReq.fromName)}`}
            </button>
          ) : null}

          {G.playerInvite || G.gangInvite ? (
            <button
              className="cyber-modal-btn"
              style={{ borderColor: 'var(--cyber-yellow)', color: 'var(--cyber-yellow)' }}
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(4);
              }}
            >
              {language === 'vi' ? `CHẤP NHẬN LỜI MỜI VÀO: ${G.playerInvite ? G.playerInvite.gang : getGangLabel(G.gangInvite)}` : `ACCEPT INVITATION TO: ${G.playerInvite ? G.playerInvite.gang : getGangLabel(G.gangInvite)}`}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    if (typeof window === 'undefined' || !window.G) return null;
    const invTabs = ['WEAPONS', 'CYBERWARE', 'GARAGE', 'MAP', 'STATS'];
    const invTabsVi = ['VŨ KHÍ', 'CẤY GHÉP CHROME', 'NHÀ XE', 'BẢN ĐỒ', 'THÔNG SỐ'];

    const getDps = w => Math.round(w.dmg * (w.pellets || 1) * w.rof);
    const fmt = val => Number(val).toLocaleString();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '390px' }}>
        <div className="cyber-tabs">
          {invTabs.map((tab, idx) => (
            <button
              key={tab}
              className={`cyber-tab-btn ${selectedInvTab === idx ? 'active' : ''}`}
              onClick={() => { playSynthSfx("hover"); setSelectedInvTab(idx); }}
            >
              {language === 'vi' ? invTabsVi[idx] : tab}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', color: 'var(--cyber-yellow)', fontFamily: 'var(--font-title)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            €$ {fmt(playerState.eddies)}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {selectedInvTab === 0 && (
            (() => {
              if (!window.WEAPONS) return null;
              const all = window.WEAPONS;
              const selectedWeapon = all.find(w => w.id === selectedInvWeaponId) || all[0];
              const isEquippedInSlot = selectedWeapon ? playerState.loadout.indexOf(selectedWeapon.id) : -1;

              const rarColors = {
                0: '#cfd6e4',
                1: '#00ff9f',
                2: '#05d9e8',
                3: '#bd00ff',
                4: '#f9f002'
              };

              return (
                <div className="cyber-grid-layout" style={{ height: '340px' }}>
                  <div className="cyber-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', alignContent: 'start' }}>
                    {all.map(w => {
                      const have = !!playerState.weapons[w.id];
                      const slotIdx = playerState.loadout.indexOf(w.id);
                      return (
                        <div
                          key={w.id}
                          style={{
                            height: '52px',
                            background: selectedInvWeaponId === w.id ? 'rgba(249,240,2,0.12)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid',
                            borderColor: selectedInvWeaponId === w.id ? 'var(--cyber-yellow)' : have ? (rarColors[w.rar] || 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.05)',
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => { playSynthSfx("hover"); setSelectedInvWeaponId(w.id); }}
                        >
                          {slotIdx >= 0 && (
                            <span style={{ position: 'absolute', left: '3px', top: '2px', color: 'var(--cyber-yellow)', fontSize: '9px', fontWeight: 'bold' }}>
                              {slotIdx + 1}
                            </span>
                          )}
                          <span style={{ fontSize: '9px', color: have ? (rarColors[w.rar] || '#fff') : '#5a6372', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'right' }}>
                            {have ? w.name : (w.hidden ? '???' : w.name.split(' ')[0])}
                          </span>
                          <span style={{ fontSize: '8px', color: '#5a6372', alignSelf: 'flex-start' }}>
                            {w.cls.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="cyber-detail-panel" style={{ height: '100%' }}>
                    {selectedWeapon ? (
                      <>
                        <h3 className="cyber-detail-title">{playerState.weapons[selectedWeapon.id] ? selectedWeapon.name : (selectedWeapon.hidden ? '???' : selectedWeapon.name)}</h3>
                        <div className="cyber-detail-subtitle">
                          {window.RAR_NAME ? window.RAR_NAME[selectedWeapon.rar] : 'COMMON'} · {selectedWeapon.kind.toUpperCase()} · {selectedWeapon.cls.toUpperCase()}
                        </div>

                        {playerState.weapons[selectedWeapon.id] ? (
                          <>
                            <div style={{ fontSize: '9px', color: '#cfd6e4', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span>DMG: {selectedWeapon.dmg * (selectedWeapon.pellets || 1)}</span>
                              <span>RPS: {selectedWeapon.rof}</span>
                              <span>DPS: {getDps(selectedWeapon)}</span>
                              {selectedWeapon.mag && <span>MAG: {selectedWeapon.mag}</span>}
                            </div>
                            <div className="cyber-description">
                              {selectedWeapon.desc}
                            </div>

                            <div style={{ marginTop: 'auto', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                              <span style={{ fontSize: '10px', color: '#f9f002', display: 'block', marginBottom: '6px' }}>
                                {language === 'vi' ? 'TRANG BỊ VÀO Ô CHỌN NHANH:' : 'EQUIP TO QUICK SLOT:'}
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {[0, 1, 2].map(slotIdx => (
                                  <button
                                    key={slotIdx}
                                    className={`cyber-modal-btn ${isEquippedInSlot === slotIdx ? 'active' : ''}`}
                                    style={{ flex: 1, padding: '4px' }}
                                    onClick={() => {
                                      playSynthSfx("click");
                                      if (window.assignSlot) window.assignSlot(selectedWeapon.id, slotIdx);
                                    }}
                                  >
                                    SLOT {slotIdx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="cyber-description" style={{ color: '#5a6372' }}>
                            {selectedWeapon.iconic
                              ? (language === 'vi' ? 'RƠI RA TỪ CÁC PHẦN TỬ CYBERPSYCHOS - HÃY ĐI SĂN HỌ' : 'DROPS FROM CYBERPSYCHOS — GO HUNTING')
                              : selectedWeapon.granted
                              ? (language === 'vi' ? 'ĐƯỢC CÀI ĐẶT BỞI RIPPERDOC VIK' : 'INSTALLED BY RIPPERDOC VIK')
                              : (language === 'vi' ? 'ĐƯỢC BÁN TẠI CỬA HÀNG 2ND AMENDMENT' : 'SOLD AT 2ND AMENDMENT')}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })()
          )}

          {selectedInvTab === 1 && (
            (() => {
              if (!window.CYBER || !window.CYBER_SLOTS) return null;
              const slots = window.CYBER_SLOTS;
              return (
                <div className="cyber-list" style={{ height: '340px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--cyber-cyan)', marginBottom: '12px', borderBottom: '1px solid rgba(5, 217, 232, 0.2)', paddingBottom: '6px' }}>
                    {language === 'vi' ? 'HỆ THỐNG CẤY GHÉP THẦN KINH CHI TIẾT' : 'CHROME IMPLANTS SYSTEM DIAGNOSTIC'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {slots.map(slot => {
                      const items = window.CYBER.filter(x => x.slot === slot && playerState.cyber[x.id]);
                      return (
                        <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                          <span style={{ color: '#3a5a66', fontWeight: 'bold' }}>{slot}</span>
                          <span style={{ color: items.length ? '#cfd6e4' : '#3a414e' }}>
                            {items.length
                              ? items.map(x => `${x.name} MK.${playerState.cyber[x.id]}${x.os ? (playerState.os === x.id ? ' [ACTIVE]' : ' [OFF]') : ''}`).join(' · ')
                              : (language === 'vi' ? '— TRỐNG —' : '— EMPTY —')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 'auto', fontSize: '9px', color: '#5a6372', textAlign: 'center' }}>
                    {language === 'vi' ? 'HÃY TỚI GẶP VIK [KÝ HIỆU R TRÊN BẢN ĐỒ] ĐỂ CÀI ĐẶT / NÂNG CẤP CHROME' : 'VISIT VIK [R ON MAP] TO INSTALL AND UPGRADE IMPLANTS'}
                  </div>
                </div>
              );
            })()
          )}

          {selectedInvTab === 2 && (
            (() => {
              if (!window.CARS) return null;
              const cars = window.CARS;
              const selectedCar = cars.find(c => c.id === selectedInvCarId) || cars[0];

              return (
                <div className="cyber-grid-layout" style={{ height: '340px' }}>
                  <div className="cyber-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', alignContent: 'start' }}>
                    {cars.map(c => {
                      const have = !!playerState.cars[c.id];
                      const active = playerState.activeCar === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`cyber-list-item ${selectedInvCarId === c.id ? 'active' : ''}`}
                          style={{
                            height: '46px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            opacity: have ? 1 : 0.5
                          }}
                          onClick={() => { playSynthSfx("hover"); setSelectedInvCarId(c.id); }}
                        >
                          <span style={{ fontSize: '10px' }}>{c.name}</span>
                          <span style={{ fontSize: '8px', color: active ? '#00ff9f' : have ? '#8a93a6' : '#5a6372' }}>
                            {active ? (language === 'vi' ? 'ĐANG CHẠY' : 'ACTIVE') : have ? (language === 'vi' ? 'TRONG KHO' : 'OWNED') : (language === 'vi' ? 'CHƯA MUA' : 'AVAILABLE')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="cyber-detail-panel" style={{ height: '100%' }}>
                    {selectedCar ? (
                      <>
                        <h3 className="cyber-detail-title" style={{ color: 'var(--cyber-cyan)' }}>{selectedCar.name}</h3>
                        <div className="cyber-detail-subtitle">
                          {selectedCar.bike ? 'MOTORCYCLE' : 'CAR'} · {selectedCar.shape.toUpperCase()}
                        </div>

                        {playerState.cars[selectedCar.id] ? (
                          <>
                            <div style={{ fontSize: '9px', color: '#cfd6e4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span>TOP SPEED: {selectedCar.top} KM/H</span>
                              <span>ACCELERATION: {selectedCar.acc}</span>
                              <span>GRIP STABILITY: {selectedCar.grip}</span>
                              <span>STRUCTURE HEALTH: {selectedCar.hp} HP</span>
                            </div>

                            {playerState.activeCar === selectedCar.id ? (
                              <button className="cyber-action-btn primary" disabled style={{ opacity: 0.5, marginTop: 'auto' }}>
                                {language === 'vi' ? 'XE ĐANG DÙNG' : 'ACTIVE RIDE'}
                              </button>
                            ) : (
                              <button
                                className="cyber-action-btn primary"
                                style={{ marginTop: 'auto' }}
                                onClick={() => {
                                  playSynthSfx("click");
                                  if (window.setActiveCar) window.setActiveCar(selectedCar.id);
                                }}
                              >
                                {language === 'vi' ? 'TRIỆU HỒI XE NÀY' : 'SET AS ACTIVE'}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="cyber-description" style={{ color: '#5a6372' }}>
                            {language === 'vi' ? `CÓ THỂ MUA TẠI PHÂN HỆ NC AUTOFIXER — GIÁ €$${fmt(selectedCar.price)}` : `AVAILABLE AT NC AUTOFIXER FOR €$${fmt(selectedCar.price)}`}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })()
          )}

          {selectedInvTab === 3 && (
            <MapTab language={language} />
          )}

          {selectedInvTab === 4 && (
            (() => {
              const st = playerState.stats || {};
              let worth = playerState.eddies;
              
              if (typeof window !== 'undefined') {
                if (window.WPN) {
                  for (const id in playerState.weapons) {
                    if (window.WPN[id]) worth += window.WPN[id].price;
                  }
                }
                if (window.CARD) {
                  for (const id in playerState.cars) {
                    if (window.CARD[id]) worth += window.CARD[id].price;
                  }
                }
                if (window.CYB) {
                  for (const id in playerState.cyber) {
                    const level = playerState.cyber[id];
                    if (window.CYB[id] && window.CYB[id].tiers) {
                      for (let k = 0; k < level; k++) {
                        if (window.CYB[id].tiers[k]) worth += window.CYB[id].tiers[k].price;
                      }
                    }
                  }
                }
              }

              const playMins = Math.floor((st.playT || 0) / 60);
              const getGangLabel = gang => window.gangLabel ? window.gangLabel(gang) : 'CHƯA CÓ';

              const statRows = [
                [language === 'vi' ? 'TIẾNG TĂM ĐƯỜNG PHỐ' : 'STREET CRED CREDIBILITY', `LV ${playerState.lvl} (${playerState.xp} XP)`],
                [language === 'vi' ? 'TỔNG TÀI SẢN NET WORTH' : 'NET WORTH VALUE', `€$${fmt(worth)}`],
                [language === 'vi' ? 'KẺ ĐỊCH ĐÃ FLATLINED' : 'ENEMIES FLATLINED', st.kills || 0],
                [language === 'vi' ? 'TÊN ĐIÊN CYBERPSYCHO' : 'CYBERPSYCHOS DOWNDED', `${st.psychos || 0}/${window.ICONICS ? window.ICONICS.length : 8}`],
                [language === 'vi' ? 'HỢP ĐỒNG SĂN TIỀN THƯỞNG' : 'BOUNTIES CLEARED', st.bounties || 0],
                [language === 'vi' ? 'HÒM THẢ AIRDROP SECURED' : 'AIRDROPS SECURED', st.airdrops || 0],
                [language === 'vi' ? 'HÒM HÀNG CRATES CRACKED' : 'CRATES CRACKED', st.crates || 0],
                [language === 'vi' ? 'QUÃNG ĐƯỜNG ĐI LẠI' : 'DISTANCE ROAMED', `${((st.dist || 0) / 1000).toFixed(1)} KM`],
                [language === 'vi' ? 'THỜI GIAN TRONG NIGHT CITY' : 'TIME IN NIGHT CITY', `${playMins} MIN`],
                [language === 'vi' ? 'BĂNG ĐẢNG HIỆN TẠI' : 'PLAYER faction', playerState.gang ? getGangLabel(playerState.gang) : (language === 'vi' ? 'CHƯA CÓ' : 'NONE')],
              ];

              return (
                <div className="cyber-list" style={{ height: '340px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {statRows.map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                      <span style={{ color: '#5a6372' }}>{lbl}</span>
                      <span style={{ color: '#e8f6ff', fontWeight: 'bold' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10px', color: '#3a414e', fontStyle: 'italic' }}>
                    &ldquo;WRONG CITY, WRONG PEOPLE.&rdquo;
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="game-shell">
      {/* Animated 3DPerspective Cyber-Grid Background */}
      <div className="cyber-grid-bg" />
      
      {/* HUD Panels (Top Left / Right) */}
      <div className={`cloud-panel ${cloudPanelVisible ? "visible" : ""}`} data-status={status}>
        <span className="cloud-dot" />
        <span className="cyber-status-text">{message}</span>
      </div>
      {/* Top Center Controls (Settings + Language) */}
      <div className="top-center-controls">
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

        {/* Settings Panel Toggle */}
        {(status === "ready" || status === "synced" || (typeof window !== "undefined" && window.__NCPX_GAME_SCRIPTS_LOADED)) && (
          <div className="settings-btn-panel">
            <button
              type="button"
              className="settings-btn"
              onClick={() => { playSynthSfx("click"); if (window.G) window.G.ui = 'pause'; }}
              onMouseEnter={() => playSynthSfx("hover")}
            >
              ⚙️ {language === "vi" ? "THIẾT LẬP" : "SETTINGS"}
            </button>
          </div>
        )}
      </div>

      {activeUi && (
        <div className="cyber-modal-overlay" onClick={closeModal}>
          <div className={`cyber-modal-container ${isWideUi(activeUi) ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="cyber-modal-header">
              <h2>{getModalTitle(activeUi, language)}</h2>
              <button className="cyber-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="cyber-modal-body">
              {renderModalContent(activeUi)}
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Container with CRT scanning lines filter */}
      <div className={`canvas-wrapper ${crtActive ? "crt-active" : ""}`}>
        <canvas id="cv" width="640" height="360" />
      </div>

      {/* Netrunner Sidebar Database Panel */}
      {isJackedIn && (
        <div className={`cyber-sidebar ${sidebarOpen ? "open" : ""}`}>
          <button 
            className="sidebar-toggle-btn" 
            onClick={() => { playSynthSfx("click"); setSidebarOpen(!sidebarOpen); }}
          >
            {sidebarOpen ? (language === "vi" ? "◀ NGẮT KẾT NỐI" : "◀ DISCONNECT") : (language === "vi" ? "▶ CSDL NETRUNNER" : "▶ NETRUNNER DB")}
          </button>
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h2>{language === "vi" ? "TRUY CẬP THIẾT BỊ MẠNG" : "CYBER DECK ACCESS"}</h2>
              <div className="deck-serial">{language === "vi" ? "SỐ SÊ-RI: NCPX-2077_V2" : "SERIAL NO: NCPX-2077_V2"}</div>
            </div>
            
            <div className="sidebar-tabs">
              <button className={sidebarTab === "lore" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("lore"); }}>{language === "vi" ? "CƠ SỞ DỮ LIỆU" : "DATABASE"}</button>
              <button className={sidebarTab === "controls" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("controls"); }}>{language === "vi" ? "GIAO DIỆN" : "INTERFACE"}</button>
              <button className={sidebarTab === "system" ? "active" : ""} onClick={() => { playSynthSfx("hover"); setSidebarTab("system"); }}>{language === "vi" ? "HỆ THỐNG" : "SYSTEM"}</button>
            </div>
            
            <div className="sidebar-tab-body">
              {sidebarTab === "lore" && renderLore()}
              {sidebarTab === "controls" && renderControls()}
              {sidebarTab === "system" && renderSystem()}
            </div>
          </div>
        </div>
      )}

      {/* Premium Cyber Loading Splashscreen Overlay */}
      {!isJackedIn && (
        <div className={`boot-overlay ${isGlitching ? "glitch-out" : ""}`}>
          <div className="cyber-splash-container">
            {/* Hologram/Branding Header */}
            <div className="cyber-splash-header">
              <div className="cyber-logo-glitch" data-text="NIGHT CITY">NIGHT CITY</div>
              <div className="cyber-logo-sub">
                {language === "vi" ? "GIAO DIỆN LIÊN KẾT THẦN KINH v2077" : "NEURAL LINK INTERFACE v2077"}
              </div>
            </div>

            {/* Neural matrix scanning/loader circle */}
            <div className="cyber-scanner-outer">
              <div className="cyber-scanner-inner">
                <div className="cyber-scanner-ray"></div>
                <div className="cyber-scanner-text">{loadingProgress}%</div>
              </div>
            </div>

            {/* Progress HUD bar */}
            <div className="cyber-progress-hud">
              <div className="cyber-progress-bar-container">
                <div className="cyber-progress-bar-track">
                  <div 
                    className="cyber-progress-bar-fill" 
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="cyber-progress-percentage">{loadingProgress}%</div>
              </div>
              <div className="cyber-active-log">{activeLog}</div>
            </div>

            {/* Diagnostics Logs Viewport */}
            <div className="cyber-logs-viewport">
              <div className="cyber-logs-header">
                <span className="cyber-panel-tag">
                  {language === "vi" ? "NHẬT KÝ_CHẨN ĐOÁN" : "DIAG_FEED"}
                </span>
                <span className="cyber-system-status">
                  {loadingProgress === 100 
                    ? (language === "vi" ? "HOẠT ĐỘNG" : "ONLINE") 
                    : (language === "vi" ? "ĐANG KHỞI ĐỘNG" : "BOOTING")}
                </span>
              </div>
              <div className="cyber-logs-body">
                {bootLogs.slice(-4).map((log, index) => (
                  <div key={index} className="cyber-log-line">
                    <span className="cyber-log-prompt">&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Jack In Action panel */}
            <div className="cyber-action-panel">
              {!authReady ? (
                <div className="cyber-boot-loader-msg">
                  <span className="blinking-dot"></span>
                  {language === "vi" ? "ĐANG XÁC THỰC TÀI KHOẢN..." : "AUTHENTICATING ACCOUNT..."}
                </div>
              ) : !activeAccount ? (
                <div className="quick-account-panel">
                  <div className="quick-account-title">
                    {language === "vi" ? "TÀI KHOẢN NIGHT CITY" : "NIGHT CITY ACCOUNT"}
                  </div>
                  <input
                    className="quick-account-input"
                    value={accountNameDraft}
                    maxLength={18}
                    onChange={e => setAccountNameDraft(e.target.value)}
                    placeholder={language === "vi" ? "TÊN NHÂN VẬT" : "CHARACTER NAME"}
                  />
                  <button
                    className="jack-in-premium-btn"
                    disabled={authBusy}
                    onClick={handleQuickAccount}
                    onMouseEnter={() => playSynthSfx("hover")}
                  >
                    <span className="btn-glitch-layer"></span>
                    <span className="btn-content">
                      {authBusy ? (language === "vi" ? "ĐANG TẠO..." : "CREATING...") : (language === "vi" ? "TẠO TÀI KHOẢN NHANH" : "CREATE QUICK ACCOUNT")}
                    </span>
                  </button>
                  <button
                    className="quick-google-btn"
                    disabled
                    title={language === "vi" ? "Cần cấu hình GOOGLE_CLIENT_ID để bật đăng nhập Google" : "Requires GOOGLE_CLIENT_ID configuration"}
                  >
                    {language === "vi" ? "GOOGLE: CẦN CẤU HÌNH OAUTH" : "GOOGLE: OAUTH CONFIG REQUIRED"}
                  </button>
                  <input
                    className="quick-account-input quick-login-code-input"
                    value={loginCodeDraft}
                    onChange={e => setLoginCodeDraft(e.target.value)}
                    placeholder={language === "vi" ? "DÁN MÃ ACCOUNT:TOKEN" : "PASTE ACCOUNT:TOKEN CODE"}
                  />
                  <button
                    className="quick-google-btn quick-login-btn"
                    disabled={authBusy}
                    onClick={handleLoginCode}
                  >
                    {language === "vi" ? "ĐĂNG NHẬP BẰNG MÃ" : "SIGN IN WITH CODE"}
                  </button>
                  <div className="quick-account-note">{authMessage}</div>
                </div>
              ) : showJackButton ? (
                <button 
                  className="jack-in-premium-btn"
                  onClick={handleJackIn}
                  onMouseEnter={() => playSynthSfx("hover")}
                >
                  <span className="btn-glitch-layer"></span>
                  <span className="btn-content">
                    {language === "vi" ? "CẮM CÁP // KẾT NỐI THẦN KINH" : "JACK IN // NEURAL CONNECT"}
                  </span>
                </button>
              ) : (
                <div className="cyber-boot-loader-msg">
                  <span className="blinking-dot"></span>
                  {language === "vi" ? "ĐANG ĐỒNG BỘ CÁC THIẾT BỊ CẤY GHÉP... VUI LÒNG CHỜ" : "SYNCHRONIZING IMPLANTS... PLEASE WAIT"}
                </div>
              )}
            </div>
          </div>
          {status !== "ready" && status !== "synced" && status !== "booting" ? (
            <div className="boot-message">{message}</div>
          ) : null}
        </div>
      )}
    </main>
  );
}

function setupRealtimeBridge(getStore) {
  if (typeof window === "undefined" || window.NCPX_NET) return;
  const cleanRoom = value => String(value || "default").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "default";
  const net = {
    id: null,
    hostId: null,
    isHost: false,
    ws: null,
    room: cleanRoom((getStore && getStore().slot) || window.NCPX_CLOUD_SLOT || "default"),
    players: [],
    invites: [],
    requests: [],
    events: [],
    npcState: null,
    npcEvents: [],
    connected: false,
    retry: 0,
    closed: false,
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
    hit(playerId, payload) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(JSON.stringify({ type: "hit", to: playerId, ...(payload || {}) }));
    },
    sendNpcState(snapshot) {
      if (!net.isHost || !net.ws || net.ws.readyState !== WebSocket.OPEN || !snapshot) return;
      net.ws.send(JSON.stringify({ type: "npcState", ...snapshot }));
    },
    npcHit(payload) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !payload?.enemyId) return;
      net.ws.send(JSON.stringify({ type: "npcHit", ...payload }));
    },
    invite(playerId, profile) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(JSON.stringify({ type: "invite", to: playerId, ...(profile || {}) }));
    },
    requestJoin(playerId, profile) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(JSON.stringify({ type: "joinRequest", to: playerId, ...(profile || {}) }));
    },
    takeEvents() {
      const out = net.events;
      net.events = [];
      return out;
    },
    takeNpcEvents() {
      const out = net.npcEvents;
      net.npcEvents = [];
      return out;
    },
  };
  window.NCPX_NET = net;

  const connect = () => {
    if (net.closed) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const store = getStore();
    net.room = cleanRoom((store && store.slot) || window.NCPX_CLOUD_SLOT || net.room || "default");
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?room=${encodeURIComponent(net.room)}`);
    net.ws = ws;
    ws.onopen = () => {
      net.connected = true;
      net.retry = 0;
    };
    ws.onmessage = event => {
      let msg = null;
      try {
        msg = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (msg.type === "hello") {
        net.id = msg.id;
        net.room = msg.room || net.room;
        net.hostId = msg.hostId || net.hostId;
        net.isHost = !!msg.isHost || net.hostId === net.id;
      }
      if (msg.type === "players") {
        const seenAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        net.hostId = msg.hostId || net.hostId;
        net.isHost = !!net.hostId && net.hostId === net.id;
        net.players = (msg.players || []).filter(p => p.id !== net.id).map(p => ({ ...p, _seenAt: seenAt }));
      }
      if (msg.type === "invite") net.invites = [msg, ...net.invites.filter(inv => inv.from !== msg.from)].slice(0, 4);
      if (msg.type === "joinRequest") net.requests = [msg, ...net.requests.filter(req => req.from !== msg.from)].slice(0, 4);
      if (msg.type === "damage") net.events = [msg, ...net.events].slice(0, 12);
      if (msg.type === "npcState") net.npcState = msg;
      if (msg.type === "npcHit") net.npcEvents = [msg, ...net.npcEvents].slice(0, 24);
    };
    ws.onclose = () => {
      net.connected = false;
      if (!net.closed) {
        const delay = Math.min(4500, 700 + net.retry * 650);
        net.retry++;
        setTimeout(connect, delay);
      }
    };
    ws.onerror = () => {
      try { ws.close(); } catch (error) {}
    };
  };
  connect();
}
