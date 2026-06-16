"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";

const SAVE_KEY = "ncpx2077_v1";
const ACCOUNT_KEY = "ncpx_account_v1";
const SCRIPT_VERSION = "104";
const PERFORMANCE_MODE = false;
const GAME_SCRIPTS = [
  "/js/font.js",
  "/js/i18n.js",
  "/js/data.js",
  "/js/sfx.js",
  "/js/sprites.js",
  "/js/world.js",
  "/js/ui.js",
  "/js/game.js?v=2",
  "/mods/mods.js",
];

const WEAPON_LABELS_VI = {
  power: "ĐẠN THƯỜNG",
  tech: "CÔNG NGHỆ",
  smart: "THÔNG MINH",
  melee: "CẬN CHIẾN",
  pistol: "SÚNG LỤC",
  revolver: "SÚNG Ổ XOAY",
  smg: "TIỂU LIÊN",
  rifle: "SÚNG TRƯỜNG",
  shotgun: "SHOTGUN",
  sniper: "BẮN TỈA",
  lmg: "SÚNG MÁY",
  blade: "DAO/KIẾM",
  blunt: "VŨ KHÍ NẶNG",
  mantis: "LƯỠI MANTIS",
  gorilla: "TAY GORILLA",
  wire: "DÂY CẮT",
  launcher: "BỆ PHÓNG",
};

function weaponLabel(value, language) {
  const key = String(value || "").toLowerCase();
  return language === "vi" ? WEAPON_LABELS_VI[key] || String(value || "").toUpperCase() : String(value || "").toUpperCase();
}

const SCRIPT_NAMES_VI = {
  "font.js": "FONT CHỮ ĐỒ HỌA",
  "i18n.js": "PHÂN HỆ NGÔN NGỮ",
  "data.js": "DỮ LIỆU THÀNH PHỐ",
  "sfx.js": "HIỆU ỨNG ÂM THANH",
  "sprites.js": "BẢN ĐỒ SPRITES PIXEL",
  "world.js": "KIẾN TRÚC THẾ GIỚI",
  "ui.js": "HỆ THỐNG GIAO DIỆN HUD",
  "game.js": "BỘ MÔ PHỎNG VẬT LÝ",
  "mods.js": "BẢN CẬP NHẬT TÙY BIẾN",
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

function fmtCredits(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${Math.floor(n / 100000) / 10}M`;
  if (n >= 10000) return `${Math.floor(n / 1000)}K`;
  return String(Math.floor(n));
}

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
      osc.frequency.exponentialRampToValueAtTime(
        1300,
        audioCtx.currentTime + 0.04,
      );
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.04,
      );
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === "click") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        180,
        audioCtx.currentTime + 0.25,
      );
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.25,
      );
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === "boot") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(90, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        700,
        audioCtx.currentTime + 0.6,
      );
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.6,
      );
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    }
  } catch (e) {}
}

function cleanAccountName(value) {
  return (
    String(value || "V")
      .replace(/[^\p{L}\p{N}_ -]/gu, "")
      .trim()
      .slice(0, 18)
      .toUpperCase() || "V"
  );
}

function localQuickAccount(name, provider = "local") {
  const id = `local_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  return {
    account: { id, slot: id, name: cleanAccountName(name), provider },
    token: `local_${Math.random().toString(36).slice(2)}`,
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
        const pedSpr =
          skinId === null
            ? window.SPR.player[gender] || window.SPR.player.m
            : window.SPR.playerCiv(skinId, gender);

        const frame = Math.floor((window.G.rt || 0) * 4);

        const drawOnCanvas = (canvas, face) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;
          if (window.drawPed) {
            window.drawPed(ctx, pedSpr, face, false, frame, 30, 65, 1, 2.2);
          }
        };

        drawOnCanvas(canvasRefFront.current, "down");
        drawOnCanvas(canvasRefSide.current, "side");
        drawOnCanvas(canvasRefBack.current, "up");
      }
      requestAnimationFrame(render);
    };
    render();
    return () => {
      active = false;
    };
  }, [skinId, gender]);

  return (
    <div className="wardrobe-previews">
      <div className="wardrobe-preview-col">
        <canvas
          ref={canvasRefFront}
          width="60"
          height="80"
          className="wardrobe-preview-canvas"
        />
        <span className="wardrobe-preview-label">
          {language === "vi" ? "TRƯỚC" : "FRONT"}
        </span>
      </div>
      <div className="wardrobe-preview-col">
        <canvas
          ref={canvasRefSide}
          width="60"
          height="80"
          className="wardrobe-preview-canvas"
        />
        <span className="wardrobe-preview-label">
          {language === "vi" ? "BÊN" : "PROFILE"}
        </span>
      </div>
      <div className="wardrobe-preview-col">
        <canvas
          ref={canvasRefBack}
          width="60"
          height="80"
          className="wardrobe-preview-canvas"
        />
        <span className="wardrobe-preview-label">
          {language === "vi" ? "SAU" : "BACK"}
        </span>
      </div>
    </div>
  );
}

function BootCharacterPreview({ gender, active, skinId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let activeLoop = true;
    let frame = 0;
    let lastTime = 0;

    const render = (time) => {
      if (!activeLoop) return;

      if (time - lastTime > 150) {
        frame = (frame + 1) % 4;
        lastTime = time;
      }

      if (typeof window !== "undefined" && window.SPR && window.drawPed) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;

          const pedSpr =
            (skinId !== null && skinId !== undefined && window.SPR.playerCiv)
              ? window.SPR.playerCiv(skinId, gender)
              : (window.SPR.player[gender] || window.SPR.player.m);
          window.drawPed(ctx, pedSpr, "down", false, frame, 45, 90, 1, 3);
        }
      }
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => {
      activeLoop = false;
    };
  }, [gender, skinId]);

  return (
    <canvas
      ref={canvasRef}
      width="90"
      height="110"
      style={{
        display: "block",
        margin: "0 auto",
        border: active
          ? "2px solid var(--cyber-yellow)"
          : "2px solid rgba(255,255,255,0.1)",
        background: active
          ? "rgba(249, 240, 2, 0.05)"
          : "rgba(255,255,255,0.02)",
        boxShadow: active ? "0 0 15px rgba(249,240,2,0.2)" : "none",
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
        transition: "all 0.2s ease",
      }}
    />
  );
}

function WeaponPixelPreview({ weapon, large = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !weapon || typeof window === "undefined") return;
      if (!window.SPR) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const col = (window.KIND_COL && window.KIND_COL[weapon.kind]) || "#05d9e8";
      const img = window.SPR.wicon(weapon.cls, col);
      const scale = large ? 4 : 2;
      ctx.drawImage(
        img,
        Math.floor((canvas.width - 24 * scale) / 2),
        Math.floor((canvas.height - 10 * scale) / 2),
        24 * scale,
        10 * scale,
      );
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [weapon, large]);

  return (
    <canvas
      ref={canvasRef}
      width={large ? 120 : 52}
      height={large ? 62 : 28}
      className={`pixel-item-preview ${large ? "large" : ""}`}
    />
  );
}

function CarPixelPreview({ car, large = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !car || typeof window === "undefined") return;
      if (!window.SPR) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const img = window.SPR.car(car.id);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      const scale = large ? 3 : 1.8;
      ctx.drawImage(img, -8 * scale, -15 * scale, 16 * scale, 30 * scale);
      ctx.restore();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [car, large]);

  return (
    <canvas
      ref={canvasRef}
      width={large ? 120 : 58}
      height={large ? 82 : 36}
      className={`pixel-item-preview ${large ? "large" : ""}`}
    />
  );
}

function GangPixelBadge({ mark, color, size = "sm" }) {
  const cells = {
    SK: [[4,3,5,4],[3,5,7,3],[5,8,1,2],[7,8,1,2]],
    NX: [[3,3,2,2],[8,3,2,2],[5,5,3,3],[3,8,2,2],[8,8,2,2]],
    RG: [[4,2,5,1],[8,3,2,1],[5,4,4,1],[4,5,2,1],[6,6,4,1],[3,7,4,1],[2,8,2,1],[8,8,2,1]],
    HL: [[4,2,5,1],[8,3,2,1],[5,4,4,1],[4,5,2,1],[6,6,4,1],[3,7,4,1],[2,8,2,1],[8,8,2,1]],
    NB: [[6,2,1,8],[3,5,7,1],[4,3,5,5]],
    "6T": [[4,3,5,1],[3,4,1,5],[4,6,4,1],[4,8,5,1],[8,6,1,3]],
    VB: [[3,3,1,3],[5,5,1,3],[7,3,1,3],[9,5,1,3],[4,8,5,1]],
    TT: [[6,2,1,8],[3,5,7,1],[5,3,3,5]],
  };
  const blocks = cells[String(mark || "").toUpperCase()] || [
    [3, 3, 7, 1],
    [3, 9, 7, 1],
    [3, 4, 1, 5],
    [9, 4, 1, 5],
    [5, 5, 3, 3],
  ];
  return (
    <span
      className={`gang-pixel-badge ${size}`}
      style={{ "--gang-col": color || "var(--cyber-cyan)" }}
    >
      {blocks.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b[0]}px`,
            top: `${b[1]}px`,
            width: `${b[2]}px`,
            height: `${b[3]}px`,
          }}
        />
      ))}
    </span>
  );
}

function PixelUserHud({
  account,
  player,
  playerName,
  language,
  message,
  token,
  compact = false,
}) {
  const win = typeof window !== "undefined" ? window : null;
  const gangName = player.gang
    ? win?.gangLabel
      ? win.gangLabel(player.gang)
      : player.gang
    : language === "vi"
      ? "CHƯA CÓ BĂNG"
      : "NO GANG";
  const gangIcon =
    player.gang && win?.playerProfile ? win.playerProfile().gangIcon : "";
  const gangColor =
    player.gang && win?.playerProfile
      ? win.playerProfile().gangIconCol
      : player.gang && win?.factionColor
        ? win.factionColor(player.gang)
        : "#8a93a6";
  const hp = Math.max(0, Math.ceil(player.hp || 0));
  const maxhp = Math.max(1, Math.ceil(player.maxhp || 100));
  const hpPct = Math.max(0, Math.min(100, (hp / maxhp) * 100));
  const xpTarget = win?.xpFor ? win.xpFor(player.lvl || 1) : 100;
  const xpPct = Math.max(0, Math.min(100, ((player.xp || 0) / xpTarget) * 100));
  const displayName = cleanAccountName(account?.name || playerName || "V");
  const provider = (account?.provider || "quick").toUpperCase();
  const status = String(message || "READY").toUpperCase();

  return (
    <section className={`pixel-user-hud ${compact ? "compact" : ""}`}>
      <div className="pixel-user-corner tl" />
      <div className="pixel-user-corner br" />
      <div className="pixel-user-top">
        <div className="pixel-user-avatar">
          <span>{displayName.slice(0, 1)}</span>
        </div>
        <div className="pixel-user-nameblock">
          <div className="pixel-user-name">{displayName}</div>
          <div className="pixel-user-sub">
            <span className="pixel-user-level">LV{player.lvl || 1}</span>
            <span className="pixel-user-provider"> · {provider}</span>
          </div>
        </div>
        <div className="pixel-user-chip">€${fmtCredits(player.eddies)}</div>
      </div>
      <div className="pixel-user-bars">
        <div className="pixel-meter hp">
          <span style={{ width: `${hpPct}%` }} />
          <b>
            {hp}/{maxhp}
          </b>
        </div>
        <div className="pixel-meter xp">
          <span style={{ width: `${xpPct}%` }} />
        </div>
      </div>
      <div className="pixel-user-bottom">
        <div className="pixel-gang-line" style={{ color: gangColor }}>
          {gangIcon ? (
            <GangPixelBadge mark={gangIcon} color={gangColor} size="sm" />
          ) : (
            <span className="pixel-gang-empty" />
          )}
          <span>{gangName}</span>
        </div>
        <div className="pixel-user-stat">
          <span>DOC</span>
          <b>{player.maxdocs || 0}</b>
        </div>
      </div>
      {compact ? null : (
        <div className="pixel-user-status">
          {token && account?.id ? `${account.id}:${token}` : status}
        </div>
      )}
    </section>
  );
}

function PixelDeadOverlay({ player, language }) {
  const isVi = language === "vi";
  const deadT = player.deadT || 0;
  const countdown = Math.ceil(deadT);
  const fee = player.deathFee || 0;

  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setFlash((f) => !f);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.max(0, Math.min(1, (10 - deadT) / 10));
  const totalSegments = 20;
  const filledSegments = Math.floor(pct * totalSegments);

  const headerTxt = isVi
    ? "⚠ CẢNH BÁO: HỆ THỐNG NGƯNG HOẠT ĐỘNG"
    : "⚠ WARNING: BIOMETRIC LINK SEVERED";
  const titleTxt = isVi ? "MẤT SINH HIỆU" : "FLATLINED";
  const feeLabel = isVi ? "PHÍ TRUY THU TRAUMA TEAM:" : "TRAUMA TEAM FEE:";
  const statusLabel = isVi ? "TRẠNG THÁI:" : "STATUS:";
  const statusVal = isVi
    ? "NGOẠI TUYẾN (PHỤC HỒI HỆ THỐNG)"
    : "OFFLINE (COOLDOWN)";
  const rebootLabel = isVi
    ? `KHỞI ĐỘNG LẠI HỆ THỐNG SAU ${countdown} GIÂY...`
    : `REBOOTING SYSTEM IN ${countdown}S...`;

  return (
    <div className="pixel-dead-overlay">
      <div className="pixel-dead-container">
        <div className={`pixel-dead-header ${flash ? "flash" : ""}`}>
          {headerTxt}
        </div>
        <div className="pixel-dead-body">
          <div className="pixel-dead-title-row">
            <span className="bracket-left">[</span>
            <h1 className="pixel-dead-title" data-text={titleTxt}>
              {titleTxt}
            </h1>
            <span className="bracket-right">]</span>
          </div>
          <div className="pixel-dead-details">
            <div className="pixel-dead-row">
              <span className="label">{feeLabel}</span>
              <span className="value fee">${fee.toLocaleString()}</span>
            </div>
            <div className="pixel-dead-row">
              <span className="label">{statusLabel}</span>
              <span className="value status">{statusVal}</span>
            </div>
          </div>
          <div className="pixel-dead-progress-container">
            <div className="pixel-dead-progress-bar">
              {Array.from({ length: totalSegments }).map((_, idx) => (
                <span
                  key={idx}
                  className={`progress-seg ${idx < filledSegments ? "filled" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className="pixel-dead-footer">{rebootLabel}</div>
        </div>
      </div>
    </div>
  );
}

function PixelWeaponHud({ player }) {
  const win = typeof window !== "undefined" ? window : null;
  const weapons = win?.WEAPONS || [];
  const weaponMap = new Map(weapons.map((w) => [w.id, w]));
  const activeId = player.loadout?.[player.slot || 0];
  const weapon = activeId ? weaponMap.get(activeId) : null;
  const ownedState = weapon ? player.weapons?.[weapon.id] : null;
  const color =
    weapon && win?.RAR_COL ? win.RAR_COL[weapon.rar] || "#05d9e8" : "#8a93a6";
  const kind = weapon?.kind || "MELEE";
  const melee = !!weapon && (weapon.cls === "blade" || weapon.cls === "melee" || weapon.kind === "melee");
  const ammo =
    weapon && ownedState && !melee
      ? `${player.reloadT > 0 ? "..." : ownedState.mag}/${weapon.mag}`
      : weapon
        ? "MELEE"
        : "EMPTY";

  return (
    <section className="pixel-weapon-hud" style={{ "--weapon-col": color }}>
      <div className="pixel-weapon-line" />
      <div className="pixel-weapon-main">
        <div className="pixel-weapon-icon">
          {weapon ? (
            <WeaponPixelPreview weapon={weapon} />
          ) : (
            <span className="pixel-weapon-empty">--</span>
          )}
        </div>
        <div className="pixel-weapon-copy">
          <div className="pixel-weapon-name">
            {weapon ? weapon.name : "UNARMED"}
          </div>
          <div className="pixel-weapon-meta">
            <span>{kind}</span>
            <b>{ammo}</b>
          </div>
        </div>
        <div className="pixel-weapon-slots">
          {[0, 1, 2].map((i) => {
            const id = player.loadout?.[i];
            const w = id ? weaponMap.get(id) : null;
            const slotColor =
              w && win?.RAR_COL ? win.RAR_COL[w.rar] || "#8a93a6" : "#3a414e";
            return (
              <span
                key={i}
                className={i === (player.slot || 0) ? "active" : ""}
                style={{ "--slot-col": slotColor, cursor: id ? "pointer" : "default" }}
                onClick={() => {
                  if (id && win?.G) {
                    win.G.slot = i;
                    if (typeof win.cycleSlot === "function") {
                      win.cycleSlot(0);
                    } else if (win.G.p) {
                      win.G.p.reloadT = 0;
                      win.G.p.fireCd = Math.max(win.G.p.fireCd, 0.12);
                    }
                    playSynthSfx("click");
                  }
                }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
      </div>
      {player.reloadT > 0 && weapon ? (
        <div className="pixel-weapon-reload">
          <span
            style={{
              width: `${Math.max(0, Math.min(100, 100 - (player.reloadT / weapon.rel) * 100))}%`,
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

function PixelMiniMapHud({ onOpenMap }) {
  const canvasRef = useRef(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPulse((v) => v + 1), 300);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    const draw = (time = 0) => {
      if (time - lastDraw < 110) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = time;
      const canvas = canvasRef.current;
      const win = typeof window !== "undefined" ? window : null;
      if (!canvas || !win?.WORLD || !win?.G || !win?.G.p) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const { WORLD, G } = win;
      const ctx = canvas.getContext("2d");
      const S = canvas.width;
      const TILE = win.TILE || 16;
      const range = G.cyber?.kiroshi >= 2 ? 64 : 44;
      let tx = G.p.x / TILE - range / 2;
      let ty = G.p.y / TILE - range / 2;
      tx = Math.max(0, Math.min(WORLD.W - range, tx));
      ty = Math.max(0, Math.min(WORLD.H - range, ty));

      ctx.clearRect(0, 0, S, S);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#05080e";
      ctx.fillRect(0, 0, S, S);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(WORLD.mini, tx, ty, range, range, 0, 0, S, S);
      ctx.globalAlpha = 1;

      const dot = (wx, wy, col, txt, blink = false) => {
        const ddx = wx / TILE - tx;
        const ddy = wy / TILE - ty;
        if (ddx < 0 || ddy < 0 || ddx > range || ddy > range) return;
        if (blink && ((G.frame || 0) >> 4) % 2) return;
        const x = (ddx * S) / range;
        const y = (ddy * S) / range;
        ctx.fillStyle = "rgba(2,3,8,0.82)";
        ctx.fillRect(Math.round(x - 4), Math.round(y - 4), 8, 8);
        ctx.fillStyle = col;
        if (txt) {
          ctx.font = "900 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(txt, x, y + 0.5);
        } else {
          ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 3);
        }
      };

      dot(WORLD.shops.guns.x, WORLD.shops.guns.y, "#f9f002", "G");
      dot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, "#05d9e8", "R");
      dot(WORLD.shops.cars.x, WORLD.shops.cars.y, "#00ff9f", "A");
      dot(WORLD.shops.bar.x, WORLD.shops.bar.y, "#ff2a6d", "B");
      if (WORLD.shops.casino) dot(WORLD.shops.casino.x, WORLD.shops.casino.y, "#bd00ff", "C");
      if (WORLD.shops.clothing) dot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, "#ff69b4", "T");
      for (const m of WORLD.markets || []) dot(m.tx * TILE, m.ty * TILE, "#f9f002", m.code);
      for (const e of G.enemies || []) {
        if (!e.dead && (e.bounty || e.psycho || e.war || G.cyber?.kiroshi)) {
          dot(e.x, e.y, e.psycho ? "#bd00ff" : "#ff2a3c", "");
        }
      }
      for (const rp of G.remotePlayers || []) if (Number(rp.hp) > 0) dot(rp.x, rp.y, "#bd00ff", "");
      if (G.bounty) dot(G.bounty.x, G.bounty.y, G.bounty.psycho ? "#bd00ff" : "#ff2a3c", "X", true);
      if (G.airdrop) dot(G.airdrop.x, G.airdrop.y, "#ff6a00", "X", true);
      if (G.state !== "dead" && G.p.hp > 0) dot(G.p.x, G.p.y, "#05d9e8", "P");

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const win = typeof window !== "undefined" ? window : null;
  const G = win?.G;
  const W = win?.WEATHERS;
  const rows = [];
  if (G?.bounty) {
    const d = Math.hypot(G.bounty.x - G.p.x, G.bounty.y - G.p.y) / 10 | 0;
    rows.push({
      tag: G.bounty.psycho ? "PSY" : "TRUY NÃ",
      value: `${G.bounty.left} CÒN · ${d}M`,
      color: G.bounty.psycho ? "#bd00ff" : "#ff5a5a",
    });
  }
  if (G?.airdrop) {
    const d = Math.hypot(G.airdrop.x - G.p.x, G.airdrop.y - G.p.y) / 10 | 0;
    rows.push({
      tag: "DROP",
      value: `${G.airdrop.state === "falling" ? "ĐANG RƠI" : Math.ceil(G.airdrop.t) + "S"} · ${d}M`,
      color: "#ff6a00",
    });
  }
  rows.push({
    tag: "MÙA",
    value: W && G ? W[G.weather.kind]?.name || "NIGHT" : "NIGHT",
    color: "#8a93a6",
  });
  if (G?.marketWarActive) {
    const mins = (G.marketWarT / 60) | 0;
    const secs = (G.marketWarT % 60) | 0;
    rows.push({
      tag: "CHỢ",
      value: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      color: "#ff2a6d",
    });
  } else if (G) {
    const mins = (G.marketWarT / 60) | 0;
    const hours = (mins / 60) | 0;
    rows.push({
      tag: "WAR",
      value: hours > 0 ? `${hours}H ${mins % 60}M` : `${mins % 60}M`,
      color: "#8a93a6",
    });
  }

  return (
    <section
      className="pixel-minimap-hud"
      data-pulse={pulse % 2}
      onClick={onOpenMap}
      style={{ cursor: "pointer" }}
    >
      <div className="pixel-minimap-frame">
        <canvas ref={canvasRef} width="92" height="92" />
        <span className="pixel-minimap-corner tl" />
        <span className="pixel-minimap-corner br" />
      </div>
      <div className="pixel-minimap-rows">
        {rows.slice(0, 4).map((row, idx) => (
          <div className="pixel-minimap-row" key={`${row.tag}-${idx}`}>
            <span style={{ color: row.color }}>{row.tag}</span>
            <b>{String(row.value || "").slice(0, 18)}</b>
          </div>
        ))}
      </div>
    </section>
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
      if (
        !canvas ||
        typeof window === "undefined" ||
        !window.WORLD ||
        !window.G
      )
        return;
      const ctx = canvas.getContext("2d");

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
          y: (ty / window.WORLD.H) * mapSize,
        };
      };

      const drawDot = (wx, wy, col, txt) => {
        const pt = project(wx, wy);
        ctx.fillStyle = "#06080e";
        ctx.fillRect(pt.x - 3, pt.y - 3, 7, 7);

        ctx.fillStyle = col;
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(txt, pt.x, pt.y + 3);
      };

      const WORLD = window.WORLD;
      const G = window.G;

      drawDot(WORLD.shops.guns.x, WORLD.shops.guns.y, "#f9f002", "G");
      drawDot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, "#05d9e8", "R");
      drawDot(WORLD.shops.cars.x, WORLD.shops.cars.y, "#00ff9f", "A");
      drawDot(WORLD.shops.bar.x, WORLD.shops.bar.y, "#ff2a6d", "B");
      if (WORLD.shops.casino)
        drawDot(WORLD.shops.casino.x, WORLD.shops.casino.y, "#bd00ff", "C");
      if (WORLD.shops.clothing)
        drawDot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, "#ff69b4", "T");

      for (const n of WORLD.npcs) {
        if (n.kind === "joy") {
          drawDot(n.x, n.y, "#ff2a6d", "J");
        } else if (n.kind === "doll") {
          drawDot(n.x, n.y, "#ff2a6d", "D");
        }
      }

      drawDot(G.p.x, G.p.y, "#05d9e8", "P");
    };
    render();
    return () => {
      active = false;
    };
  }, []);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || !window.WORLD || !window.G)
      return;
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
        y: (ty / window.WORLD.H) * mapSize,
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

    checkHover(
      G.p.x,
      G.p.y,
      "PLAYER: " + G.playerName,
      language === "vi" ? "VỊ TRÍ HIỆN TẠI CỦA BẠN" : "YOUR CURRENT POSITION",
    );
    checkHover(
      WORLD.shops.guns.x,
      WORLD.shops.guns.y,
      "GUN SHOP",
      language === "vi" ? "TIỆM SÚNG - QUÂN" : "GUN SHOP - WEAPONS & AMMO",
    );
    checkHover(
      WORLD.shops.ripper.x,
      WORLD.shops.ripper.y,
      "RIPPERDOC",
      language === "vi" ? "TIỆM SƠN - CẤY GHÉP" : "RIPPERDOC CLINIC",
    );
    checkHover(
      WORLD.shops.cars.x,
      WORLD.shops.cars.y,
      "AUTOFIXER",
      language === "vi" ? "TIỆM TÚ - MUA XE" : "VEHICLES AND GARAGE",
    );
    checkHover(
      WORLD.shops.bar.x,
      WORLD.shops.bar.y,
      "AFTERLIFE BAR",
      language === "vi" ? "AFTERLIFE BAR - MUA ĐỒ UỐNG" : "ORDER A DRINK",
    );
    if (WORLD.shops.casino)
      checkHover(
        WORLD.shops.casino.x,
        WORLD.shops.casino.y,
        "CASINO DEALER",
        language === "vi" ? "CHƠI TÀI XỈU" : "PLAY DICE MINI-GAME",
      );
    if (WORLD.shops.clothing)
      checkHover(
        WORLD.shops.clothing.x,
        WORLD.shops.clothing.y,
        "WARDROBE ROOM",
        language === "vi" ? "THAY ĐỔI DIỆN MẠO" : "SWITCH GENDER / SKIN",
      );

    for (const n of WORLD.npcs) {
      if (n.kind === "joy") {
        checkHover(n.x, n.y, n.name + " - JOY", "CLOUDS LOUNGE");
      } else if (n.kind === "doll") {
        checkHover(n.x, n.y, n.name + " - DOLL", "CLOUDS VIP ROOM");
      }
    }

    setHoveredLocation(hovered);
  };

  return (
    <div className="map-wrapper">
      <div className="map-canvas-container">
        <canvas
          ref={canvasRef}
          width="220"
          height="220"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredLocation(null)}
        />
      </div>
      <div>
        <div className="map-legend-list">
          <div className="map-legend-item" style={{ color: "#05d9e8" }}>
            <span className="map-legend-key">P</span>{" "}
            <span>{language === "vi" ? "NGƯỜI CHƠI V" : "PLAYER V"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#f9f002" }}>
            <span className="map-legend-key">G</span>{" "}
            <span>{language === "vi" ? "TIỆM SÚNG" : "GUN SHOP"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#05d9e8" }}>
            <span className="map-legend-key">R</span>{" "}
            <span>{language === "vi" ? "RIPPERDOC" : "RIPPERDOC"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#00ff9f" }}>
            <span className="map-legend-key">A</span>{" "}
            <span>{language === "vi" ? "TIỆM XE" : "AUTOFIXER"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#ff2a6d" }}>
            <span className="map-legend-key">B</span>{" "}
            <span>{language === "vi" ? "AFTERLIFE" : "AFTERLIFE"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#bd00ff" }}>
            <span className="map-legend-key">C</span>{" "}
            <span>{language === "vi" ? "SÒNG BẠC" : "CASINO DEALER"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#ff69b4" }}>
            <span className="map-legend-key">T</span>{" "}
            <span>{language === "vi" ? "TỦ ĐỒ" : "WARDROBE"}</span>
          </div>
          <div className="map-legend-item" style={{ color: "#ff2a6d" }}>
            <span className="map-legend-key">J</span>{" "}
            <span>{language === "vi" ? "JOY / DOLL" : "JOY / DOLL"}</span>
          </div>
        </div>
        {hoveredLocation && (
          <div className="map-hover-details">
            <div className="map-hover-title">{hoveredLocation.label}</div>
            <div>{hoveredLocation.desc}</div>
            <div style={{ color: "#8a93a6", fontSize: "8px" }}>
              COORD: {Math.floor(hoveredLocation.wx / 16)},{" "}
              {Math.floor(hoveredLocation.wy / 16)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LargeMapModalContent({ language, onClose }) {
  const canvasRef = useRef(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);

  useEffect(() => {
    let active = true;
    let raf = 0;
    let lastDraw = 0;

    const draw = (time = 0) => {
      if (!active) return;
      if (time - lastDraw < 100) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = time;

      const canvas = canvasRef.current;
      const win = typeof window !== "undefined" ? window : null;
      if (!canvas || !win?.WORLD || !win?.G) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const { WORLD, G } = win;
      const ctx = canvas.getContext("2d");
      const mapSize = 240;

      ctx.clearRect(0, 0, mapSize, mapSize);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(WORLD.mini, 0, 0, mapSize, mapSize);

      const project = (wx, wy) => {
        const TILE = win.TILE || 16;
        const tx = wx / TILE;
        const ty = wy / TILE;
        return {
          x: (tx / WORLD.W) * mapSize,
          y: (ty / WORLD.H) * mapSize,
        };
      };

      const drawDot = (wx, wy, col, txt, size = 8, blink = false) => {
        if (blink && ((G.frame || 0) >> 4) % 2) return;
        const pt = project(wx, wy);
        ctx.fillStyle = "rgba(6, 8, 14, 0.85)";
        ctx.fillRect(Math.round(pt.x - size / 2 - 1), Math.round(pt.y - size / 2 - 1), size + 2, size + 2);

        ctx.fillStyle = col;
        if (txt) {
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(txt, pt.x, pt.y + 0.5);
        } else {
          ctx.fillRect(Math.round(pt.x - 1.5), Math.round(pt.y - 1.5), 3, 3);
        }
      };

      drawDot(WORLD.shops.guns.x, WORLD.shops.guns.y, "#f9f002", "G");
      drawDot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, "#05d9e8", "R");
      drawDot(WORLD.shops.cars.x, WORLD.shops.cars.y, "#00ff9f", "A");
      drawDot(WORLD.shops.bar.x, WORLD.shops.bar.y, "#ff2a6d", "B");
      if (WORLD.shops.casino) drawDot(WORLD.shops.casino.x, WORLD.shops.casino.y, "#bd00ff", "C");
      if (WORLD.shops.clothing) drawDot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, "#ff69b4", "T");

      for (const m of WORLD.markets || []) {
        drawDot(m.tx * win.TILE, m.ty * win.TILE, "#f9f002", m.code);
      }

      for (const n of WORLD.npcs || []) {
        if (n.kind === "joy") {
          drawDot(n.x, n.y, "#ff2a6d", "J", 7);
        } else if (n.kind === "doll") {
          drawDot(n.x, n.y, "#ff2a6d", "D", 7);
        }
      }

      for (const e of G.enemies || []) {
        if (!e.dead && (e.bounty || e.psycho || e.war || G.cyber?.kiroshi)) {
          drawDot(e.x, e.y, e.psycho ? "#bd00ff" : "#ff2a3c", "");
        }
      }

      for (const rp of G.remotePlayers || []) {
        if (Number(rp.hp) > 0) {
          drawDot(rp.x, rp.y, "#bd00ff", "");
        }
      }

      if (G.bounty) drawDot(G.bounty.x, G.bounty.y, G.bounty.psycho ? "#bd00ff" : "#ff2a3c", "X", 8, true);
      if (G.airdrop) drawDot(G.airdrop.x, G.airdrop.y, "#ff6a00", "X", 8, true);

      if (G.state !== "dead" && G.p.hp > 0) {
        drawDot(G.p.x, G.p.y, "#05d9e8", "P", 9, false);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleMapClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || !window.WORLD || !window.G) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const mapSize = 240;
    const scaleX = mapSize / rect.width;
    const scaleY = mapSize / rect.height;
    const sx = mouseX * scaleX;
    const sy = mouseY * scaleY;

    const project = (wx, wy) => {
      const TILE = window.TILE || 16;
      const tx = wx / TILE;
      const ty = wy / TILE;
      return {
        x: (tx / window.WORLD.W) * mapSize,
        y: (ty / window.WORLD.H) * mapSize,
      };
    };

    let hovered = null;
    const checkHover = (wx, wy, label, desc) => {
      const pt = project(wx, wy);
      if (Math.hypot(sx - pt.x, sy - pt.y) < 12) {
        hovered = { label, desc, wx, wy };
      }
    };

    const WORLD = window.WORLD;
    const G = window.G;

    checkHover(
      G.p.x,
      G.p.y,
      "PLAYER: " + G.playerName,
      language === "vi" ? "VỊ TRÍ HIỆN TẠI CỦA BẠN" : "YOUR CURRENT POSITION",
    );
    checkHover(
      WORLD.shops.guns.x,
      WORLD.shops.guns.y,
      "GUN SHOP",
      language === "vi" ? "TIỆM SÚNG - QUÂN" : "GUN SHOP - WEAPONS & AMMO",
    );
    checkHover(
      WORLD.shops.ripper.x,
      WORLD.shops.ripper.y,
      "RIPPERDOC",
      language === "vi" ? "TIỆM SƠN - CẤY GHÉP CƠ THỂ" : "RIPPERDOC CLINIC - CYBERWARE",
    );
    checkHover(
      WORLD.shops.cars.x,
      WORLD.shops.cars.y,
      "AUTOFIXER",
      language === "vi" ? "TIỆM TÚ - MUA BÁN XE" : "VEHICLES AND GARAGE",
    );
    checkHover(
      WORLD.shops.bar.x,
      WORLD.shops.bar.y,
      "AFTERLIFE BAR",
      language === "vi" ? "AFTERLIFE BAR - MUA ĐỒ UỐNG" : "ORDER A DRINK",
    );
    if (WORLD.shops.casino) {
      checkHover(
        WORLD.shops.casino.x,
        WORLD.shops.casino.y,
        "CASINO DEALER",
        language === "vi" ? "CHƠI TÀI XỈU" : "PLAY DICE MINI-GAME",
      );
    }
    if (WORLD.shops.clothing) {
      checkHover(
        WORLD.shops.clothing.x,
        WORLD.shops.clothing.y,
        "WARDROBE ROOM",
        language === "vi" ? "THAY ĐỔI DIỆN MẠO" : "SWITCH GENDER / SKIN",
      );
    }

    for (const n of WORLD.npcs || []) {
      if (n.kind === "joy") {
        checkHover(n.x, n.y, n.name + " - JOY", "CLOUDS LOUNGE");
      } else if (n.kind === "doll") {
        checkHover(n.x, n.y, n.name + " - DOLL", "CLOUDS VIP ROOM");
      }
    }

    setHoveredLocation(hovered);
  };

  return (
    <div className="large-map-modal-content">
      <div className="large-map-canvas-container">
        <canvas
          ref={canvasRef}
          width="240"
          height="240"
          onClick={handleMapClick}
          onTouchStart={handleMapClick}
          className="large-map-canvas"
        />
      </div>
      <div className="large-map-legend-panel">
        <div className="large-map-detail-card">
          {hoveredLocation ? (
            <>
              <div className="detail-title">{hoveredLocation.label}</div>
              <div className="detail-desc">{hoveredLocation.desc}</div>
              <div className="detail-coord">
                COORD: {Math.floor(hoveredLocation.wx / 16)}, {Math.floor(hoveredLocation.wy / 16)}
              </div>
            </>
          ) : (
            <div className="detail-placeholder">
              {language === "vi" ? "CHẠM ĐIỂM CHỈ DẪN ĐỂ XEM THÀNH PHỐ" : "TAP ANY MARKER FOR LOCATION INFO"}
            </div>
          )}
        </div>
        <div className="large-map-legend-list">
          <div className="legend-grid-item" style={{ color: "#05d9e8" }}>
            <span className="legend-badge">P</span> <span>{language === "vi" ? "BẠN" : "YOU"}</span>
          </div>
          <div className="legend-grid-item" style={{ color: "#f9f002" }}>
            <span className="legend-badge">G</span> <span>{language === "vi" ? "TIỆM SÚNG" : "GUNS"}</span>
          </div>
          <div className="legend-grid-item" style={{ color: "#05d9e8" }}>
            <span className="legend-badge">R</span> <span>{language === "vi" ? "RIPPER" : "RIPPER"}</span>
          </div>
          <div className="legend-grid-item" style={{ color: "#00ff9f" }}>
            <span className="legend-badge">A</span> <span>{language === "vi" ? "MUA XE" : "CARS"}</span>
          </div>
          <div className="legend-grid-item" style={{ color: "#ff2a6d" }}>
            <span className="legend-badge">B</span> <span>AFTERLIFE</span>
          </div>
          {window.WORLD?.shops.casino && (
            <div className="legend-grid-item" style={{ color: "#bd00ff" }}>
              <span className="legend-badge">C</span> <span>{language === "vi" ? "SÒNG BẠC" : "CASINO"}</span>
            </div>
          )}
          {window.WORLD?.shops.clothing && (
            <div className="legend-grid-item" style={{ color: "#ff69b4" }}>
              <span className="legend-badge">T</span> <span>{language === "vi" ? "TỦ ĐỒ" : "CLOTHES"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileTouchControls({ player, playSynthSfx }) {
  const win = typeof window !== "undefined" ? window : null;
  const hasOs = !!player.os;
  const hasCamo = !!player.cyber?.camo;
  const [promptActive, setPromptActive] = useState(false);
  const [menuActive, setMenuActive] = useState(false);

  const mvBaseRef = useRef(null);
  const mvKnobRef = useRef(null);
  const aimBaseRef = useRef(null);
  const aimKnobRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (win?.G) {
        setPromptActive(!!win.G.prompt);
        setMenuActive(!!win.G.ui);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [win]);

  useEffect(() => {
    let animId;
    const updateJoysticks = () => {
      if (typeof window !== "undefined" && window.TOUCH) {
        const { TOUCH, VIEW_W, VIEW_H, G } = window;
        const w = VIEW_W || 640;
        const h = VIEW_H || 360;
        const portrait = h > w;

        // 1. Move Joystick
        if (mvBaseRef.current && mvKnobRef.current) {
          const mv = TOUCH.mv;
          mvBaseRef.current.style.display = "block";
          if (mv && mv.act) {
            const bxPct = (mv.bx / w) * 100;
            const byPct = (mv.by / h) * 100;
            const offsetX = mv.kx - mv.bx;
            const offsetY = mv.ky - mv.by;

            mvBaseRef.current.style.left = `${bxPct}%`;
            mvBaseRef.current.style.top = `${byPct}%`;
            mvBaseRef.current.style.transform = "translate(-50%, -50%)";
            mvBaseRef.current.style.opacity = "0.85";
            mvBaseRef.current.classList.add("active");

            mvKnobRef.current.style.left = "50%";
            mvKnobRef.current.style.top = "50%";
            mvKnobRef.current.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
          } else {
            // Resting position: bx = 75, by = h - 75
            const bxPct = (75 / w) * 100;
            const byPct = ((h - 75) / h) * 100;

            mvBaseRef.current.style.left = `${bxPct}%`;
            mvBaseRef.current.style.top = `${byPct}%`;
            mvBaseRef.current.style.transform = "translate(-50%, -50%)";
            mvBaseRef.current.style.opacity = "0.3";
            mvBaseRef.current.classList.remove("active");

            mvKnobRef.current.style.left = "50%";
            mvKnobRef.current.style.top = "50%";
            mvKnobRef.current.style.transform = "translate(-50%, -50%)";
          }
        }

        // 2. Aim Joystick
        if (aimBaseRef.current && aimKnobRef.current) {
          const aim = TOUCH.aim;
          const isDriving = G?.driving;
          if (!isDriving) {
            aimBaseRef.current.style.display = "block";
            if (aim && aim.act) {
              const bxPct = (aim.bx / w) * 100;
              const byPct = (aim.by / h) * 100;
              const offsetX = aim.kx - aim.bx;
              const offsetY = aim.ky - aim.by;

              aimBaseRef.current.style.left = `${bxPct}%`;
              aimBaseRef.current.style.top = `${byPct}%`;
              aimBaseRef.current.style.transform = "translate(-50%, -50%)";
              aimBaseRef.current.style.opacity = "0.85";
              aimBaseRef.current.classList.add("active");

              aimKnobRef.current.style.left = "50%";
              aimKnobRef.current.style.top = "50%";
              aimKnobRef.current.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
            } else {
              // Resting position: bx = w - (portrait ? 135 : 155), by = h - 75
              const restingBx = w - (portrait ? 135 : 155);
              const restingBy = h - 75;
              const bxPct = (restingBx / w) * 100;
              const byPct = (restingBy / h) * 100;

              aimBaseRef.current.style.left = `${bxPct}%`;
              aimBaseRef.current.style.top = `${byPct}%`;
              aimBaseRef.current.style.transform = "translate(-50%, -50%)";
              aimBaseRef.current.style.opacity = "0.3";
              aimBaseRef.current.classList.remove("active");

              aimKnobRef.current.style.left = "50%";
              aimKnobRef.current.style.top = "50%";
              aimKnobRef.current.style.transform = "translate(-50%, -50%)";
            }
          } else {
            aimBaseRef.current.style.display = "none";
          }
        }
      }
      animId = requestAnimationFrame(updateJoysticks);
    };
    animId = requestAnimationFrame(updateJoysticks);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePress = (k, e) => {
    if (e) e.preventDefault();
    if (k === "inv") {
      if (win?.toggleInv) {
        win.toggleInv();
      } else if (win?.G) {
        if (win.G.ui === "inv") win.G.ui = null;
        else if (!win.G.ui) {
          win.G.ui = "inv";
          win.G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
        }
        if (win.SFX?.ui) win.SFX.ui();
      }
      if (typeof playSynthSfx === "function") {
        playSynthSfx("click");
      }
      return;
    }
    if (k === "gang") {
      if (win?.G) {
        if (win.G.ui === "gang") win.G.ui = null;
        else if (!win.G.ui) {
          win.G.ui = "gang";
          win.G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
        }
        if (win.SFX?.ui) win.SFX.ui();
      }
      if (typeof playSynthSfx === "function") {
        playSynthSfx("click");
      }
      return;
    }
    if (win?.touchBtnDown) {
      win.touchBtnDown(k);
      if (typeof playSynthSfx === "function") {
        playSynthSfx("click");
      }
    }
  };

  const handleRelease = (k, e) => {
    if (e) e.preventDefault();
    if (win?.touchBtnUp) {
      win.touchBtnUp(k);
    }
  };

  return (
    <div className="mobile-react-controls">
      {/* HTML Move Joystick */}
      {!menuActive && (
        <div className="joystick-container mv-joystick" ref={mvBaseRef}>
          <div className="joystick-ring">
            <div className="joystick-crosshair center-x" />
            <div className="joystick-crosshair center-y" />
          </div>
          <div className="joystick-knob" ref={mvKnobRef} />
          <span className="joystick-label">MOVE</span>
        </div>
      )}

      {/* HTML Aim/Fire Joystick */}
      {!menuActive && (
        <div className="joystick-container aim-joystick" ref={aimBaseRef}>
          <div className="joystick-ring">
            <div className="joystick-crosshair center-x" />
            <div className="joystick-crosshair center-y" />
          </div>
          <div className="joystick-knob" ref={aimKnobRef} />
          <span className="joystick-label">AIM/FIRE</span>
        </div>
      )}

      {/* Top Center Controls Panel */}
      <div className="mobile-top-bar">
        <button
          onTouchStart={(e) => handlePress("pause", e)}
          onMouseDown={(e) => handlePress("pause", e)}
          className="top-bar-btn"
          title="Settings"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          onTouchStart={(e) => handlePress("radio", e)}
          onMouseDown={(e) => handlePress("radio", e)}
          className="top-bar-btn"
          title="Radio"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
          </svg>
        </button>
        <button
          onTouchStart={(e) => handlePress("car", e)}
          onMouseDown={(e) => handlePress("car", e)}
          className="top-bar-btn"
          title="Call Vehicle"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3M15.5 7.5L14 9M18.5 4.5L22 8" />
          </svg>
        </button>
        <button
          onTouchStart={(e) => handlePress("gang", e)}
          onMouseDown={(e) => handlePress("gang", e)}
          className="top-bar-btn"
          title="Faction / Gang"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
        <button
          onTouchStart={(e) => handlePress("inv", e)}
          onMouseDown={(e) => handlePress("inv", e)}
          className="top-bar-btn"
          title="Inventory"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <path d="M9 6V4a3 3 0 0 1 6 0v2" />
            <path d="M4 12h16" />
            <path d="M12 12v10" />
          </svg>
        </button>
      </div>

      {/* Bottom Right Action Cluster */}
      {!menuActive && (
        <div className="mobile-action-cluster">
          {/* FIRE */}
          <button
            onTouchStart={(e) => handlePress("fire", e)}
            onTouchEnd={(e) => handleRelease("fire", e)}
            onTouchCancel={(e) => handleRelease("fire", e)}
            onMouseDown={(e) => handlePress("fire", e)}
            onMouseUp={(e) => handleRelease("fire", e)}
            className="action-btn btn-fire"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <line x1="12" y1="1" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="23" />
              <line x1="1" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="23" y2="12" />
            </svg>
            <span className="btn-sub-label">ATK</span>
          </button>

          {/* DASH */}
          <button
            onTouchStart={(e) => handlePress("dash", e)}
            onTouchEnd={(e) => handleRelease("dash", e)}
            onTouchCancel={(e) => handleRelease("dash", e)}
            onMouseDown={(e) => handlePress("dash", e)}
            onMouseUp={(e) => handleRelease("dash", e)}
            className="action-btn btn-dash"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
            <span className="btn-sub-label">DASH</span>
          </button>

          {/* RELOAD */}
          <button
            onTouchStart={(e) => handlePress("reload", e)}
            onMouseDown={(e) => handlePress("reload", e)}
            className="action-btn btn-reload"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span className="btn-sub-label">RELOAD</span>
          </button>

          {/* HEAL (C) */}
          <button
            onTouchStart={(e) => handlePress("doc", e)}
            onMouseDown={(e) => handlePress("doc", e)}
            className="action-btn btn-doc"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="btn-sub-label">HEAL</span>
          </button>

          {/* USE (E) */}
          <button
            onTouchStart={(e) => handlePress("use", e)}
            onMouseDown={(e) => handlePress("use", e)}
            className={`action-btn btn-use ${promptActive ? "active-prompt" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            <span className="btn-sub-label">USE</span>
          </button>

          {/* OS (Q) */}
          {hasOs && (
            <button
              onTouchStart={(e) => handlePress("os", e)}
              onMouseDown={(e) => handlePress("os", e)}
              className="action-btn btn-os"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="15" x2="23" y2="15" />
              </svg>
              <span className="btn-sub-label">HACK</span>
            </button>
          )}

          {/* CAMO (F) */}
          {hasCamo && (
            <button
              onTouchStart={(e) => handlePress("camo", e)}
              onMouseDown={(e) => handlePress("camo", e)}
              className="action-btn btn-camo"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" strokeDasharray="3 2" />
                <line x1="1" y1="1" x2="23" y2="23" opacity="0.75" />
              </svg>
              <span className="btn-sub-label">STEALTH</span>
            </button>
          )}
        </div>
      )}
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
  const [bootStage, setBootStage] = useState("loading");
  const [selectedMenuIdx, setSelectedMenuIdx] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [bootLogs, setBootLogs] = useState([]);
  const [showJackButton, setShowJackButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("lore");
  const [crtActive, setCrtActive] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isGlitching, setIsGlitching] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeLog, setActiveLog] = useState("");
  const [forcedLandscape, setForcedLandscape] = useState(false);

  // Override touchButtons and drawTouchControls when game is booted
  useEffect(() => {
    let timer = setInterval(() => {
      if (typeof window !== "undefined") {
        let overridden = 0;
        if (window.touchButtons) {
          window.touchButtons = () => [];
          overridden++;
        }
        if (window.drawTouchControls) {
          window.drawTouchControls = () => {};
          overridden++;
        }
        if (overridden === 2) {
          clearInterval(timer);
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setForcedLandscape(window.innerHeight > window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [cloudPanelVisible, setCloudPanelVisible] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeAccount, setActiveAccount] = useState(null);
  const [accountToken, setAccountToken] = useState("");
  const [accountNameDraft, setAccountNameDraft] = useState(playerName || "V");
  const [loginCodeDraft, setLoginCodeDraft] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [needsCharacter, setNeedsCharacter] = useState(false);
  const [characterNameDraft, setCharacterNameDraft] = useState(playerName || "V");
  const [characterGender, setCharacterGender] = useState("m");
  const [characterLifepath, setCharacterLifepath] = useState("streetkid");
  const [lifepathHovered, setLifepathHovered] = useState("streetkid");
  const [jsxBanner, setJsxBanner] = useState(null);
  const [jsxMsgs, setJsxMsgs] = useState([]);
  const installAccount = (payload, persist = true) => {
    try {
      localStorage.removeItem("ncpx_logout_pending");
    } catch (e) {}
    const account = payload?.account;
    const token = payload?.token || "";
    if (!account?.id) return;
    const normalized = { ...account, name: cleanAccountName(account.name) };
    if (persist) {
      try {
        localStorage.setItem(
          ACCOUNT_KEY,
          JSON.stringify({ account: normalized, token }),
        );
      } catch (error) {}
    }
    setActiveAccount(normalized);
    setAccountToken(token);
    setAccount(normalized);
    setSlot(normalized.slot || normalized.id);
    setPlayerName(normalized.name);
    setAuthMessage(
      normalized.provider === "local"
        ? "LOCAL QUICK ACCOUNT ACTIVE"
        : "QUICK ACCOUNT READY",
    );
    setCharacterNameDraft(cleanAccountName(normalized.name));
  };

  useEffect(() => {
    let cancelled = false;
    async function restoreAccount() {
      setAuthMessage(
        language === "vi"
          ? "ĐANG KIỂM TRA TÀI KHOẢN..."
          : "CHECKING ACCOUNT...",
      );
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
      } catch (error) {}
      let logoutPending = "false";
      try {
        logoutPending = localStorage.getItem("ncpx_logout_pending") || "false";
      } catch (e) {}
      if (!saved?.account?.id || !saved?.token) {
        if (logoutPending === "true") {
          if (!cancelled) {
            setAuthReady(true);
            setAuthMessage(
              language === "vi" ? "ĐÃ ĐĂNG XUẤT" : "SIGNED OUT",
            );
            setBootStage("slot");
          }
          return;
        } else {
          const fallback = localQuickAccount("V");
          installAccount(fallback, true);
          saved = fallback;
        }
      }
      try {
        const res = await fetch("/api/account/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: saved.account.id,
            token: saved.token,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.ok && data.account) {
          installAccount({
            account: data.account,
            token: data.token || saved.token,
          });
        } else if (!cancelled && saved.account.provider === "local") {
          installAccount(saved);
        } else if (!cancelled) {
          try {
            localStorage.removeItem(ACCOUNT_KEY);
          } catch (error) {}
          setAuthMessage(
            language === "vi"
              ? "TOKEN TÀI KHOẢN KHÔNG HỢP LỆ"
              : "ACCOUNT TOKEN INVALID",
          );
          setBootStage("slot");
        }
      } catch (error) {
        if (!cancelled) {
          installAccount(saved);
          setAuthMessage(
            language === "vi"
              ? "OFFLINE: DÙNG TÀI KHOẢN ĐÃ LƯU"
              : "OFFLINE: USING SAVED ACCOUNT",
          );
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }
    restoreAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  const getHasSavedCharacter = () => {
    if (typeof window === "undefined" || !activeAccount) return false;
    const cloudSlot = activeAccount.slot || activeAccount.id || slot;
    const localSaveKey = `${SAVE_KEY}:${cloudSlot}`;
    try {
      return !!localStorage.getItem(localSaveKey);
    } catch (e) {
      return false;
    }
  };

  const triggerMenuAction = (idx) => {
    playSynthSfx("click");
    if (idx === 0) {
      if (getHasSavedCharacter()) {
        handleJackIn();
      }
    } else if (idx === 1) {
      setBootStage("char-create");
    } else if (idx === 2) {
      setBootStage("slot");
    } else if (idx === 3) {
      setShowInstructions(true);
    }
  };

  useEffect(() => {
    if (bootStage === "menu") {
      setSelectedMenuIdx(getHasSavedCharacter() ? 0 : 1);
    }
  }, [bootStage]);

  useEffect(() => {
    if (isJackedIn) return;

    const handleKeyDown = (e) => {
      if (bootStage === "title") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playSynthSfx("click");
          setBootStage("menu");
        }
      } else if (bootStage === "menu") {
        const menuCount = 4;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          playSynthSfx("hover");
          setSelectedMenuIdx((prev) => {
            let nextIdx = (prev - 1 + menuCount) % menuCount;
            if (nextIdx === 0 && !getHasSavedCharacter()) {
              nextIdx = (nextIdx - 1 + menuCount) % menuCount;
            }
            return nextIdx;
          });
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          playSynthSfx("hover");
          setSelectedMenuIdx((prev) => {
            let nextIdx = (prev + 1) % menuCount;
            if (nextIdx === 0 && !getHasSavedCharacter()) {
              nextIdx = (nextIdx + 1) % menuCount;
            }
            return nextIdx;
          });
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerMenuAction(selectedMenuIdx);
        }
      } else if (bootStage === "char-create") {
        if (document.activeElement && document.activeElement.tagName === "INPUT") {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreateCharacter();
          }
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          playSynthSfx("hover");
          setCharacterGender("m");
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          playSynthSfx("hover");
          setCharacterGender("f");
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCreateCharacter();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bootStage, selectedMenuIdx, isJackedIn, language, characterGender, characterNameDraft, activeAccount]);

  const handleQuickAccount = async () => {
    const name = cleanAccountName(accountNameDraft || "MERC");
    setAuthBusy(true);
    setAuthMessage(
      language === "vi"
        ? "ĐANG TẠO TÀI KHOẢN NHANH..."
        : "CREATING QUICK ACCOUNT...",
    );
    try {
      const res = await fetch("/api/account/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.account || !data.token)
        throw new Error(data.error || "QUICK_ACCOUNT_FAILED");
      installAccount(data);
      playSynthSfx("click");
    } catch (error) {
      const fallback = localQuickAccount(name);
      installAccount(fallback);
      setAuthMessage(
        language === "vi"
          ? "MONGO CHƯA SẴN SÀNG: ĐÃ TẠO TÀI KHOẢN LOCAL"
          : "MONGO OFFLINE: LOCAL ACCOUNT CREATED",
      );
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  };

  const handleGoogleAccount = async () => {
    const name = cleanAccountName(accountNameDraft || playerName || "GOOGLE V");
    setAuthBusy(true);
    setAuthMessage(
      language === "vi"
        ? "ĐANG ĐĂNG NHẬP GOOGLE..."
        : "SIGNING IN WITH GOOGLE...",
    );
    try {
      const res = await fetch("/api/account/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, provider: "google" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.account || !data.token)
        throw new Error(data.error || "GOOGLE_ACCOUNT_FAILED");
      installAccount(data);
      playSynthSfx("click");
    } catch (error) {
      const fallback = localQuickAccount(name, "google-local");
      installAccount(fallback);
      setAuthMessage(
        language === "vi"
          ? "GOOGLE DEV MODE: ĐÃ TẠO TÀI KHOẢN LOCAL"
          : "GOOGLE DEV MODE: LOCAL ACCOUNT CREATED",
      );
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  };

  const handleLoginCode = async () => {
    const raw = String(loginCodeDraft || "").trim();
    const parts = raw.split(/[:|,\s]+/).filter(Boolean);
    const accountId = parts.find(
      (p) => p.startsWith("acct_") || p.startsWith("local_"),
    );
    const token = parts.find(
      (p) => p.startsWith("ncp_") || p.startsWith("local_"),
    );
    if (!accountId || !token || accountId === token) {
      setAuthMessage(
        language === "vi" ? "MÃ ĐĂNG NHẬP KHÔNG HỢP LỆ" : "INVALID LOGIN CODE",
      );
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
      if (!res.ok || !data.ok || !data.account)
        throw new Error(data.error || "LOGIN_FAILED");
      installAccount({ account: data.account, token: data.token || token });
      playSynthSfx("click");
    } catch (error) {
      setAuthMessage(
        language === "vi"
          ? "KHÔNG THỂ ĐĂNG NHẬP BẰNG MÃ NÀY"
          : "LOGIN CODE FAILED",
      );
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
    hp: 100,
    maxhp: 100,
    armor: 0,
    slot: 0,
    reloadT: 0,
    state: "title",
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
  const forceUpdate = () => setTick((t) => t + 1);
  const lastUiSnapshot = useRef("");
  const tabsRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setLanguage("vi");
    window.__NCPX_LOW_FX = PERFORMANCE_MODE;
    window.__NCPX_JSX_PLAYER_HUD = !PERFORMANCE_MODE;
    window.__NCPX_JSX_WEAPON_HUD = !PERFORMANCE_MODE;
    window.__NCPX_JSX_MINIMAP_HUD = !PERFORMANCE_MODE;
    return () => {
      window.__NCPX_JSX_PLAYER_HUD = false;
      window.__NCPX_JSX_WEAPON_HUD = false;
      window.__NCPX_JSX_MINIMAP_HUD = false;
      window.__NCPX_LOW_FX = false;
    };
  }, []);

  // Sync state loop from window.G
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__NCPX_JSX_BANNERS = !PERFORMANCE_MODE;
    }
    let timer;
    const poll = () => {
      try {
        if (typeof window !== "undefined" && window.G) {
          const g = window.G;
          const nextUi = g.ui || null;
          if (PERFORMANCE_MODE && !nextUi) {
            if (lastUiSnapshot.current !== "perf:null") {
              lastUiSnapshot.current = "perf:null";
              setActiveUi(null);
              setJsxBanner(null);
              setJsxMsgs([]);
            }
            return;
          }
          const nextPlayer = {
            eddies: g.eddies || 0,
            lvl: g.lvl || 1,
            xp: g.xp || 0,
            maxdocs: g.maxdocs || 0,
            gender: g.gender || "m",
            skin: g.skin !== undefined ? g.skin : null,
            cyber: g.cyber ? { ...g.cyber } : {},
            os: g.os,
            weapons: g.weapons ? { ...g.weapons } : {},
            cars: g.cars ? { ...g.cars } : {},
            activeCar: g.activeCar,
            loadout: g.loadout ? [...g.loadout] : [],
            talk: g.talk ? { ...g.talk } : null,
            gang: g.gang,
            gangNameSel: g.gangNameSel || 0,
            gangIconSel: g.gangIconSel || 0,
            playerInvite: g.playerInvite,
            gangInvite: g.gangInvite,
            gangJoinReq: g.gangJoinReq,
            stats: g.stats ? { ...g.stats } : {},
            hp: g.p ? Math.ceil(g.p.hp) : 100,
            maxhp: g.p ? g.p.maxhp : 100,
            armor: g.p ? g.p.armor || 0 : 0,
            slot: g.slot || 0,
            reloadT: g.p ? Math.ceil((g.p.reloadT || 0) * 10) / 10 : 0,
            state: g.state || 'play',
            deadT: g.deadT || 0,
            deathFee: g.deathFee || 0,
            invTheme: g.invTheme || 'grey',
          };
          const nextBanner = g.bannerO && g.bannerO.t > 0
            ? { text: g.bannerO.text, sub: g.bannerO.sub, col: g.bannerO.col, t: Math.ceil(g.bannerO.t * 10) / 10 }
            : null;
          const nextMsgs = g.msgs
            ? g.msgs.map((m) => ({ text: m.text, col: m.col, t: Math.ceil(m.t * 10) / 10 }))
            : [];
          const snap = JSON.stringify({ ui: nextUi, p: nextPlayer, b: nextBanner, m: nextMsgs });
          if (snap !== lastUiSnapshot.current) {
            lastUiSnapshot.current = snap;
            setActiveUi(nextUi);
            setPlayerState(nextPlayer);
            setJsxBanner(nextBanner);
            setJsxMsgs(nextMsgs);
          }

        }
      } catch (err) {
        // Safe check: do not halt the animation loop if some objects are not initialized yet
      }
    };
    poll();
    timer = window.setInterval(poll, 125);
    return () => window.clearInterval(timer);
  }, []);

  // Initialize selected items based on active UI
  useEffect(() => {
    if (!activeUi) {
      setConfirmWipe(false);
      return;
    }
    if (
      activeUi === "guns" &&
      typeof window !== "undefined" &&
      window.WEAPONS
    ) {
      const stock = window.WEAPONS.filter(
        (w) => !w.iconic && !w.granted && !w.hidden,
      );
      if (stock.length > 0) setSelectedWeaponId(stock[0].id);
    }
    if (activeUi === "cars" && typeof window !== "undefined" && window.CARS) {
      if (window.CARS.length > 0) setSelectedCarId(window.CARS[0].id);
    }
    if (
      activeUi === "ripper" &&
      typeof window !== "undefined" &&
      window.CYBER
    ) {
      if (window.CYBER.length > 0) setSelectedCyberId(window.CYBER[0].id);
    }
    if (activeUi === "wardrobe") {
      setSelectedSkinId(window.G ? window.G.skin : null);
    }
    if (activeUi === "inv") {
      setSelectedInvTab(0);
      if (
        typeof window !== "undefined" &&
        window.WEAPONS &&
        window.WEAPONS.length > 0
      ) {
        setSelectedInvWeaponId(window.WEAPONS[0].id);
      }
      if (
        typeof window !== "undefined" &&
        window.CARS &&
        window.CARS.length > 0
      ) {
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
        setStatus(
          "syncing",
          language === "vi"
            ? "ĐANG TẢI LƯU TRỮ CLOUD..."
            : "RETRIEVING CLOUD SAVES",
        );
        setLoadingProgress(5);
        setBootStage("loading");
        setActiveLog(
          language === "vi"
            ? "> ĐANG THIẾT LẬP KẾT NỐI..."
            : "> ESTABLISHING CONNECTION...",
        );
        window.NCPX_SAVE_KEY = localSaveKey;
        try {
          const res = await fetch(`/api/save/${cloudSlot}`, {
            cache: "no-store",
          });
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
          if (
            !localStorage.getItem(localSaveKey) &&
            localStorage.getItem(SAVE_KEY)
          ) {
            localStorage.setItem(localSaveKey, localStorage.getItem(SAVE_KEY));
          }
        } catch (error) {}

        window.NCPX_SAVE = {
          put(save) {
            if (!cloudAvailable) {
              setStatus(
                "ready",
                language === "vi"
                  ? "ĐỀ PHÒNG: CHỈ LƯU TRÊN MÁY"
                  : "LOCAL SAVE ACTIVE",
              );
              return;
            }
            clearTimeout(saveTimer);
            setStatus(
              "syncing",
              language === "vi"
                ? "ĐANG ĐỒNG BỘ ĐÁM MÂY..."
                : "SYNCING NEURAL CLOUD",
            );
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
                setStatus(
                  "error",
                  error.message ||
                    (language === "vi"
                      ? "LỖI ĐỒNG BỘ CLOUD"
                      : "CLOUD SYNC ERROR"),
                );
              }
            }, 500);
          },
          async remove() {
            if (!cloudAvailable) {
              setStatus(
                "ready",
                language === "vi"
                  ? "ĐÃ XÓA LƯU TRỮ CỤC BỘ"
                  : "LOCAL CACHE WIPED",
              );
              return;
            }
            try {
              await fetch(`/api/save/${cloudSlot}`, { method: "DELETE" });
              setStatus(
                "ready",
                language === "vi"
                  ? "ĐÃ XÓA LƯU TRỮ CLOUD"
                  : "CLOUD CACHE WIPED",
              );
            } catch (error) {
              setStatus(
                "error",
                error.message ||
                  (language === "vi"
                    ? "LỖI XÓA ĐỒNG BỘ CLOUD"
                    : "WIPE SYNC FAILURE"),
              );
            }
          },
        };

        window.NCPX_LANG = language;
        window.NCPX_CLOUD_SLOT = cloudSlot;
        window.NCPX_ACCOUNT = {
          id: activeAccount.id,
          provider: activeAccount.provider || "quick",
        };
        window.NCPX_SAVE_KEY = localSaveKey;
        window.NCPX_PLAYER = {
          name: activeAccount.name || playerName,
          gang: "SOLO",
        };
        setupRealtimeBridge(() => useGameStore.getState());
        window.__NCPX_MANUAL_BOOT = true;
        window.__NCPX_SKIP_TITLE_MENU = true;
        window.__NCPX_RESPONSIVE_FIT = true;
        window.__NCPX_MOBILE_COMFY = true;
        setStatus(
          "booting",
          language === "vi"
            ? "ĐANG BIÊN DỊCH MẠNG THẦN KINH..."
            : "COMPILING CORPO NET DECK",
        );
        setLoadingProgress(10);
        setActiveLog(
          language === "vi"
            ? "> ĐANG ĐỒNG BỘ CÁC LÕI HỆ THỐNG..."
            : "> SYNCHRONIZING SYSTEM CORES...",
        );
        if (!window.__NCPX_GAME_SCRIPTS_LOADED) {
          let loaded = 0;
          for (const src of GAME_SCRIPTS) {
            if (cancelled) return;
            await loadScript(src);
            loaded++;
            setLoadingProgress(
              Math.floor(10 + (loaded / GAME_SCRIPTS.length) * 40),
            );
            const filename = src.split("/").pop();
            const translatedName =
              language === "vi"
                ? SCRIPT_NAMES_VI[filename] || filename.toUpperCase()
                : filename.toUpperCase();
            setActiveLog(
              language === "vi"
                ? `> ĐANG TẢI PHÂN HỆ: ${translatedName}`
                : `> LOADING MODULE: ${translatedName}`,
            );
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

        setStatus(
          "ready",
          language === "vi" ? "THIẾT BỊ ĐÃ SẴN SÀNG" : "DECK LOADED",
        );

        // Only auto Jack-in if a saved character exists, otherwise use React character creator
        if (hasSavedCharacter) {
          setIsJackedIn(true);
          if (window.__boot && !window.__NCPX_GAME_RUNNING) {
            window.__boot();
          }
        }
      } catch (error) {
        setStatus(
          "error",
          error.message ||
            (language === "vi"
              ? "LỖI KHỞI ĐỘNG HỆ THỐNG"
              : "BOOT DIAGNOSTICS FAILURE"),
        );
      }
    }

    boot();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer);
    };
  }, [
    activeAccount,
    authReady,
    language,
    markSaved,
    playerName,
    setStatus,
    slot,
  ]);

  // Terminal scroll animation
  useEffect(() => {
    if (isJackedIn) return;
    if (status === "ready" || window.__NCPX_GAME_SCRIPTS_LOADED) {
      let currentIdx = 0;
      const stepsList = language === "vi" ? BOOT_STEPS_VI : BOOT_STEPS_EN;
      setBootLogs([]);
      const interval = setInterval(() => {
        if (currentIdx < stepsList.length) {
          const step = stepsList[currentIdx];
          setBootLogs((prev) => [...prev, step]);
          setActiveLog(step);
          playSynthSfx("hover");
          currentIdx++;
          setLoadingProgress(
            Math.floor(50 + (currentIdx / stepsList.length) * 50),
          );
        } else {
          setShowJackButton(true);
          setLoadingProgress(100);
          setActiveLog(
            language === "vi"
              ? "> HỆ THỐNG ONLINE. LIÊN KẾT THẦN KINH SẴN SÀNG."
              : "> SYSTEM ONLINE. NEURAL LINK READY.",
          );
          setBootStage("title");
          clearInterval(interval);
        }
      }, 160);
      return () => clearInterval(interval);
    }
  }, [status, language, isJackedIn]);

  useEffect(() => {
    window.NCPX_LANG = language;
    try {
      localStorage.setItem("ncpx_lang", language);
    } catch (error) {}
  }, [language]);

  useEffect(() => {
    window.NCPX_PLAYER = {
      name: activeAccount?.name || playerName,
      gang: "SOLO",
      gender: characterGender,
    };
    try {
      localStorage.setItem(
        "ncpx_player_name",
        activeAccount?.name || playerName,
      );
    } catch (error) {}
  }, [activeAccount, characterGender, playerName]);

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

  const handleVirtualKey = (key, type = "char") => {
    playSynthSfx("click");
    const setter = type === "login" ? setAccountNameDraft : setCharacterNameDraft;
    if (key === "DEL") {
      setter((prev) => prev.slice(0, -1));
    } else if (key === "SPACE") {
      setter((prev) => {
        if (prev.length < 18) return prev + " ";
        return prev;
      });
    } else {
      setter((prev) => {
        if (prev.length < 18) return (prev + key).toUpperCase();
        return prev;
      });
    }
  };

  const handleCreateCharacter = () => {
    const name = cleanAccountName(characterNameDraft || activeAccount?.name || "V");
    playSynthSfx("boot");
    playSynthSfx("click");
    setPlayerName(name);
    try {
      localStorage.setItem("ncpx_player_name", name);
    } catch (error) {}
    window.NCPX_PLAYER = {
      ...(window.NCPX_PLAYER || {}),
      name,
      gang: "SOLO",
      gender: characterGender,
      lifepath: characterLifepath,
    };
    window.__NCPX_CHARACTER_READY = true;
    setNeedsCharacter(false);

    // Clear old save so new character starts fresh
    if (activeAccount) {
      const cloudSlot = activeAccount.slot || activeAccount.id || slot;
      const localSaveKey = `${SAVE_KEY}:${cloudSlot}`;
      try {
        localStorage.removeItem(localSaveKey);
      } catch (e) {}
      if (window.NCPX_SAVE && window.NCPX_SAVE.remove) {
        window.NCPX_SAVE.remove();
      }
    }

    setIsGlitching(true);
    setTimeout(() => {
      setIsJackedIn(true);
      if (window.__NCPX_GAME_RUNNING && window.startGame) {
        window.startGame(false, characterGender);
      } else if (window.__boot && !window.__NCPX_GAME_RUNNING) {
        window.__boot();
      }
    }, 450);
  };

  const renderLore = () => (
    <div className="lore-tab">
      <h3>{language === "vi" ? "KHU VỰC THÀNH PHỐ" : "DISTRICTS"}</h3>
      <div className="db-entry">
        <span className="entry-tag">WATSON</span>
        <p>
          {language === "vi"
            ? "Khu công nghiệp bị thao túng bởi các băng nhóm. Watson từng là trung tâm thương mại sầm uất của thành phố, nay chỉ còn là khu ổ chuột và phế liệu."
            : "Industrial sector overrun by gangs. Watson was once the city's commercial powerhouse, now an enclave of slums and scrap metal."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">WESTBROOK</span>
        <p>
          {language === "vi"
            ? "Thánh địa vui chơi của giới siêu giàu. Nơi tụ hội của các tòa nhà chọc trời sạch đẹp thuộc sở hữu tập đoàn và các câu lạc bộ sang trọng tràn ngập ánh đèn neon như Afterlife."
            : "Playground for the ultra-wealthy. Clean, corporate-owned skyscrapers, and neon-drenched luxury clubs like the Afterlife."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">PACIFICA</span>
        <p>
          {language === "vi"
            ? "Khu vực chiến sự bị bỏ hoang. Ban đầu được quy hoạch làm khu nghỉ dưỡng cao cấp, nay là vùng đất vô luật pháp dưới sự cai trị của băng đảng Voodoo Boys."
            : "Abandoned combat zone. Originally planned as a high-end tourist resort, it is now a lawless warzone ruled by the Voodoo Boys."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag">DOGTOWN</span>
        <p>
          {language === "vi"
            ? "Khu đô thị tự trị có tường bao quanh. Được cai quản bởi lực lượng dân quân Barghest của Kurt Hansen. Mức độ nguy hiểm cực cao, thường xuyên có hòm tiếp tế của Militech."
            : "Walled city-within-a-city. Ruled by Kurt Hansen's Barghest militia. High danger, regular Militech supply airdrops."}
        </p>
      </div>

      <h3>{language === "vi" ? "BĂNG ĐẢNG & TỔ CHỨC" : "GANGS & FACTIONS"}</h3>
      <div className="db-entry">
        <span className="entry-tag maelstrom">MAELSTROM</span>
        <p>
          {language === "vi"
            ? "Những quái vật công nghệ ám ảnh với việc nâng cấp cơ thể cực đoan. Vô cùng bạo lực và khó lường."
            : "Cyber-monsters obsessed with heavy body modification. Extremely violent and unpredictable."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag scavs">SCAVENGERS</span>
        <p>
          {language === "vi"
            ? "Bạn trộm cướp linh kiện công nghệ. Chúng chuyên bắt cóc người dân để thu hoạch thiết bị cấy ghép thần kinh và bán ra thị trường chợ đen."
            : "Chrome thieves. They kidnap citizens to harvest their cyberware and sell it on the black market."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag barghest">BARGHEST</span>
        <p>
          {language === "vi"
            ? "Cựu binh lính của tập đoàn Militech đang điều hành chợ đen Dogtown. Được trang bị vũ khí hạng nặng và tính kỷ luật cao."
            : "Ex-Militech soldiers who run the Dogtown black market. Heavily armed and disciplined."}
        </p>
      </div>
      <div className="db-entry">
        <span className="entry-tag trauma">TRAUMA TEAM</span>
        <p>
          {language === "vi"
            ? "Biệt đội y tế bọc thép tinh nhuệ. Chuyên giải cứu các khách hàng sở hữu thẻ bảo hiểm cao cấp ra khỏi khu vực giao tranh trong vòng chưa đầy 180 giây."
            : "Elite armored medical squad. They extract premium cardholders from active combat zones in under 180 seconds."}
        </p>
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="controls-tab">
      <h3>{language === "vi" ? "CẤU HÌNH BÀN PHÍM" : "KEYBOARD BINDINGS"}</h3>
      <div className="control-row">
        <span className="keys">W / A / S / D</span>
        <span className="action">
          {language === "vi" ? "DI CHUYỂN / ĐI BỘ" : "MOVE / WALK"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">MOUSE CLICK</span>
        <span className="action">
          {language === "vi" ? "NGẮM & BẮN" : "AIM & SHOOT"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">SPACEBAR</span>
        <span className="action">
          {language === "vi" ? "KỸ NĂNG OS (LƯỚT)" : "OS ABILITY (DASH)"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">C KEY</span>
        <span className="action">
          {language === "vi" ? "TIÊM MAXDOC (HỒI MÁU)" : "INJECT MAXDOC"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">E KEY / ENTER</span>
        <span className="action">
          {language === "vi" ? "TƯƠNG TÁC / CỬA HÀNG" : "INTERACT / SHOP"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">V KEY</span>
        <span className="action">
          {language === "vi" ? "ĐIỀU KHIỂN XE" : "VEHICLE CONTROL"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">N KEY</span>
        <span className="action">
          {language === "vi" ? "CHUYỂN KÊNH RADIO" : "CYCLE RADIO"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">TAB KEY / ESC</span>
        <span className="action">
          {language === "vi" ? "TÚI ĐỒ / TẠM DỪNG" : "INVENTORY / PAUSE"}
        </span>
      </div>

      <h3>{language === "vi" ? "ĐIỀU KHIỂN DI ĐỘNG" : "MOBILE CONTROLS"}</h3>
      <div className="control-row">
        <span className="keys">
          {language === "vi" ? "CẦN GẠT TRÁI" : "LEFT STICK"}
        </span>
        <span className="action">
          {language === "vi" ? "DI CHUYỂN" : "MOVEMENT"}
        </span>
      </div>
      <div className="control-row">
        <span className="keys">
          {language === "vi" ? "CẦN GẠT PHẢI" : "RIGHT STICK"}
        </span>
        <span className="action">
          {language === "vi" ? "NGẮM & TỰ ĐỘNG BẮN" : "AIM & AUTO-FIRE"}
        </span>
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

    const selectLanguage = (lang) => {
      if (language === lang) return;
      playSynthSfx("click");
      setLanguage(lang);
    };

    const activeRadio =
      typeof window !== "undefined" && window.SFX
        ? window.SFX.stationName()
        : "OFF";
    const radioDisplay =
      activeRadio === "OFF" ? (language === "vi" ? "TẮT" : "OFF") : activeRadio;

    return (
      <div className="system-tab retro-system-tab">
        <h3 className="retro-system-header">
          {language === "vi" ? "BẢNG ĐIỀU KHIỂN HỆ THỐNG" : "SYSTEM CONTROL PANEL"}
        </h3>

        <div className="retro-system-deck">
          {/* Option 1: Volume Slider */}
          <div className="retro-system-row">
            <div className="retro-system-label-group">
              <span className="retro-system-icon">🔊</span>
              <span className="retro-system-label">
                {language === "vi" ? "ÂM LƯỢNG HỆ THỐNG" : "SYSTEM VOLUME"}
              </span>
              <span className="retro-system-badge">{volume}%</span>
            </div>
            <div className="retro-volume-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="retro-slider"
              />
            </div>
          </div>

          {/* Option 2: CRT Filter Toggle */}
          <div className="retro-system-row">
            <div className="retro-system-label-group">
              <span className="retro-system-icon">📺</span>
              <span className="retro-system-label">
                {language === "vi" ? "QUÉT ẢNH CRT SCANLINE" : "CRT SCANLINE FILTER"}
              </span>
            </div>
            <div className="retro-toggle-group">
              <button
                className={`retro-toggle-btn ${crtActive ? "active cyan" : ""}`}
                onClick={() => !crtActive && toggleCrt()}
              >
                {language === "vi" ? "BẬT" : "ON"}
              </button>
              <button
                className={`retro-toggle-btn ${!crtActive ? "active" : ""}`}
                onClick={() => crtActive && toggleCrt()}
              >
                {language === "vi" ? "TẮT" : "OFF"}
              </button>
            </div>
          </div>

          {/* Option 3: Language Selector */}
          <div className="retro-system-row">
            <div className="retro-system-label-group">
              <span className="retro-system-icon">🌐</span>
              <span className="retro-system-label">
                {language === "vi" ? "NGÔN NGỮ LIÊN KẾT" : "COGNITIVE LANGUAGE"}
              </span>
            </div>
            <div className="retro-toggle-group">
              <button
                className={`retro-toggle-btn ${language === "vi" ? "active yellow" : ""}`}
                onClick={() => selectLanguage("vi")}
              >
                VIỆT
              </button>
              <button
                className={`retro-toggle-btn ${language === "en" ? "active yellow" : ""}`}
                onClick={() => selectLanguage("en")}
              >
                ENG
              </button>
            </div>
          </div>

          {/* Option 4: Radio Station Receiver */}
          <div className="retro-system-row radio-row">
            <div className="retro-system-label-group">
              <span className="retro-system-icon">📻</span>
              <span className="retro-system-label">
                {language === "vi" ? "ĐÀI PHÁT RADIO NET" : "NET RADIO RECEIVER"}
              </span>
            </div>
            <div className="retro-radio-deck-wrap">
              <div className="retro-radio-display">
                <div className="radio-led-glitch" data-text={radioDisplay}>
                  {radioDisplay}
                </div>
              </div>
              <button
                className="retro-radio-seek-btn"
                onClick={() => {
                  playSynthSfx("click");
                  if (typeof window !== "undefined" && window.SFX) {
                    window.SFX.cycleStation();
                    setVolume((v) => v); // trigger state update
                  }
                }}
              >
                {language === "vi" ? "DÒ SÓNG" : "TUNE"}
              </button>
            </div>
          </div>

          {/* Option 5: Game Settings Pause Menu */}
          <div className="retro-system-row">
            <div className="retro-system-label-group">
              <span className="retro-system-icon">⚙️</span>
              <span className="retro-system-label">
                {language === "vi" ? "THIẾT LẬP TRÒ CHƠI" : "GAME SETTINGS"}
              </span>
            </div>
            <button
              className="retro-arcade-btn primary"
              onClick={() => {
                playSynthSfx("click");
                if (window.G) window.G.ui = "pause";
              }}
              style={{ width: "auto", padding: "8px 16px" }}
            >
              {language === "vi" ? "MỞ THIẾT LẬP" : "OPEN SETTINGS"}
            </button>
          </div>

          {/* Option 6: Account Sign Out / Logout */}
          <div className="retro-system-row logout-row" style={{ marginTop: "16px", borderTop: "1px dashed rgba(255, 42, 109, 0.3)", paddingTop: "16px" }}>
            <div className="retro-system-label-group">
              <span className="retro-system-icon">🚪</span>
              <span className="retro-system-label">
                {language === "vi" ? "ĐĂNG XUẤT TÀI KHOẢN" : "ACCOUNT SIGN OUT"}
              </span>
            </div>
            <button
              className="retro-arcade-btn cancel-btn"
              onClick={() => {
                playSynthSfx("click");
                try {
                  localStorage.removeItem(ACCOUNT_KEY);
                  localStorage.setItem("ncpx_logout_pending", "true");
                } catch (e) {}
                setActiveAccount(null);
                setAccountToken("");
                setAccount(null);
                setIsJackedIn(false);
                setBootStage("slot");
                if (typeof window !== "undefined") {
                  window.__NCPX_GAME_RUNNING = false;
                  window.location.reload();
                }
              }}
              style={{ width: "auto", padding: "8px 16px" }}
            >
              {language === "vi" ? "ĐĂNG XUẤT" : "SIGN OUT"}
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
        return lang === "vi"
          ? "CỬA HÀNG VŨ KHÍ — WEAPONS"
          : "2ND AMENDMENT — WEAPONS";
      case "cars":
        return lang === "vi"
          ? "ĐẠI LÝ PHƯƠNG TIỆN — VEHICLES"
          : "NC AUTOFIXER — VEHICLES";
      case "ripper":
        return lang === "vi"
          ? "PHÒNG KHÁM RIPPERDOC — CHROME"
          : "VIK'S CLINIC — RIPPERDOC CHROME";
      case "talk":
        return lang === "vi" ? "HỘI THOẠI THẦN KINH" : "NEURAL DIALOGUE LINK";
      case "wardrobe":
        return lang === "vi"
          ? "GƯƠNG SOI — PHÒNG THAY ĐỒ"
          : "MIRROR — WARDROBE & STYLING";
      case "bar":
        return "AFTERLIFE BAR";
      case "casino":
        return lang === "vi"
          ? "SÒNG BẠC — TÀI XỈU"
          : "RED NEON CASINO — DICE GAME";
      case "inv":
        return lang === "vi"
          ? "TÚI ĐỒ / ĐIỀU KHIỂN CHROME"
          : "NEURAL INVENTORY / COGNITIVE DECK";
      case "gang":
        return lang === "vi" ? "QUẢN LÝ BĂNG ĐẢNG" : "CYBER CREW & GANG PANEL";
      case "map":
        return lang === "vi" ? "BẢN ĐỒ THÀNH PHỐ" : "CITY SECTOR MAP";
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
      if (window.msg)
        window.msg(
          language === "vi" ? "KHÔNG ĐỦ EDDIES" : "NOT ENOUGH EDDIES",
          "#ff5a5a",
        );
      if (window.SFX && window.SFX.deny) window.SFX.deny();
      return;
    }
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    s.dice = [d1, d2, d3];
    const sum = d1 + d2 + d3;
    if (sum === 3 || sum === 18) {
      s.result = "triple";
      window.G.eddies -= s.bet;
      if (window.SFX && window.SFX.hurt) window.SFX.hurt();
    } else {
      const sumOutcome = sum >= 11 && sum <= 17 ? 1 : 0;
      if (sumOutcome === s.choice) {
        s.result = "win";
        window.G.eddies += s.bet;
        if (window.SFX && window.SFX.levelup) window.SFX.levelup();
      } else {
        s.result = "lose";
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
      case "map":
        return <LargeMapModalContent language={language} onClose={closeModal} />;
      default:
        return null;
    }
  };

  const renderPauseContent = () => {
    const soundLabel =
      typeof window !== "undefined" && window.SFX && window.SFX.muted
        ? language === "vi"
          ? "ÂM THANH: TẮT"
          : "SOUND: OFF"
        : language === "vi"
          ? "ÂM THANH: BẬT"
          : "SOUND: ON";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Language Option */}
        <div className="cyber-modal-option">
          <label>
            {language === "vi" ? "NGÔN NGỮ HỆ THỐNG" : "COGNITIVE LANGUAGE"}
          </label>
          <div className="option-controls">
            <button
              className={`cyber-modal-btn ${language === "vi" ? "active" : ""}`}
              onClick={() => {
                playSynthSfx("click");
                setLanguage("vi");
              }}
            >
              TIẾNG VIỆT (VI)
            </button>
            <button
              className={`cyber-modal-btn ${language === "en" ? "active" : ""}`}
              onClick={() => {
                playSynthSfx("click");
                setLanguage("en");
              }}
            >
              ENGLISH (EN)
            </button>
          </div>
        </div>

        {/* Volume Option */}
        <div className="cyber-modal-option">
          <label>
            {language === "vi"
              ? "ÂM LƯỢNG HỆ THỐNG: "
              : "AUDIO INTERFACE VOLUME: "}
            {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setVolume(val);
              if (
                typeof window !== "undefined" &&
                window.SFX &&
                window.SFX.master
              ) {
                window.SFX.master.gain.value = (val / 100) * 0.6;
              }
            }}
            className="slider"
          />
        </div>

        {/* Sound Toggle */}
        <div className="cyber-modal-option">
          <label>
            {language === "vi" ? "HIỆU ỨNG ÂM THANH" : "SYSTEM SOUND FX"}
          </label>
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
          <label>
            {language === "vi"
              ? "HIỆU ỨNG MÀN HÌỂN CRT"
              : "CRT SCANLINE MODULE"}
          </label>
          <button
            className={`cyber-modal-btn ${crtActive ? "active" : ""}`}
            onClick={() => {
              playSynthSfx("click");
              setCrtActive(!crtActive);
            }}
          >
            {crtActive
              ? language === "vi"
                ? "KÍCH HOẠT"
                : "ENABLED"
              : language === "vi"
                ? "VÔ HIỆU"
                : "DISABLED"}
          </button>
        </div>

        {/* Radio Option */}
        <div className="cyber-modal-option">
          <label>
            {language === "vi" ? "KÊNH PHÁT THANH NET" : "ACTIVE NET RADIO"}
          </label>
          <div className="radio-display">
            <span className="radio-name">
              {typeof window !== "undefined" &&
              window.SFX &&
              window.SFX.stationName() === "OFF"
                ? language === "vi"
                  ? "TẮT"
                  : "OFF"
                : typeof window !== "undefined" && window.SFX
                  ? window.SFX.stationName()
                  : "OFF"}
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
          <label>
            {language === "vi" ? "TÀI KHOẢN CLOUD" : "CLOUD ACCOUNT"}
          </label>
          <div className="account-info">
            <PixelUserHud
              account={activeAccount}
              player={playerState}
              playerName={playerName}
              language={language}
              message={message}
              token={accountToken}
              compact
            />
            <div className="account-info-grid">
              <span>{language === "vi" ? "SLOT" : "SLOT"}</span>
              <b>{activeAccount?.slot || slot}</b>
              <span>ID</span>
              <b>{activeAccount?.id || "NO_ACCOUNT"}</b>
              <span>{language === "vi" ? "TRẠNG THÁI" : "STATUS"}</span>
              <b>{message}</b>
            </div>
          </div>
        </div>

        {/* Controls Guide */}
        <div className="cyber-modal-option" style={{ marginTop: "4px" }}>
          <label>
            {language === "vi"
              ? "CẤU HÌNH PHÍM CHƠI"
              : "INTERACTION CONTROL GUIDELINES"}
          </label>
          <div
            style={{
              fontSize: "9px",
              color: "#5a6372",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div>
              WASD: {language === "vi" ? "Di chuyển V" : "Walk & Move V"} |
              Mouse: {language === "vi" ? "Ngắm bắn" : "Aim & Shoot"}
            </div>
            <div>
              SPACE: {language === "vi" ? "Dash Lướt" : "Dash Action"} | R:{" "}
              {language === "vi" ? "Nạp đạn" : "Reload weapon"}
            </div>
            <div>
              Q: {language === "vi" ? "Sandevistan/Berserk" : "Use Deck OS"} |
              F: {language === "vi" ? "Tàng hình" : "Optical Camouflage"}
            </div>
            <div>
              C: {language === "vi" ? "Hồi máu Maxdoc" : "Inject Maxdoc HP"} |
              V:{" "}
              {language === "vi" ? "Gọi xe / Lên xe" : "Summon / Drive vehicle"}
            </div>
            <div>
              N: {language === "vi" ? "Đổi kênh Radio" : "Cycle vehicle radio"}{" "}
              | TAB:{" "}
              {language === "vi" ? "Mở túi đồ" : "Access neural inventory"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="cyber-modal-actions">
          <button
            className="cyber-action-btn primary"
            onClick={() => {
              playSynthSfx("click");
              if (
                typeof window !== "undefined" &&
                typeof window.saveGame === "function"
              ) {
                window.saveGame();
                if (window.msg)
                  window.msg(
                    language === "vi"
                      ? "ĐÃ LƯU GAME THÀNH CÔNG"
                      : "NEURAL PROGRESS SAVED",
                    "#2ecc71",
                  );
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
                if (
                  typeof window !== "undefined" &&
                  typeof window.wipeSave === "function"
                ) {
                  window.wipeSave();
                  window.__NCPX_CHARACTER_READY = false;
                  if (window.G) window.G.ui = null;
                }
                setActiveUi(null);
                setConfirmWipe(false);
                setNeedsCharacter(true);
                setIsGlitching(false);
                setIsJackedIn(false);
              } else {
                setConfirmWipe(true);
              }
            }}
          >
            {confirmWipe
              ? language === "vi"
                ? "XÁC NHẬN XÓA LƯU? [CLICK LẠI]"
                : "CONFIRM WIPE? [CLICK AGAIN]"
              : language === "vi"
                ? "CHƠI MỚI / THIẾT LẬP LẠI"
                : "NEW GAME / RESET"}
          </button>
        </div>
      </div>
    );
  };

  const renderGunsShop = () => {
    if (typeof window === "undefined" || !window.WEAPONS) return null;
    const stock = window.WEAPONS.filter(
      (w) => !w.iconic && !w.granted && !w.hidden,
    );
    const selectedWeapon =
      stock.find((w) => w.id === selectedWeaponId) || stock[0];

    const getDps = (w) => Math.round(w.dmg * (w.pellets || 1) * w.rof);
    const fmt = (val) => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {stock.map((w) => {
            const owned = playerState.weapons[w.id];
            const lowLevel = playerState.lvl < w.lvl;
            const priceColor = owned
              ? "#5a6372"
              : lowLevel
                ? "#ff5a5a"
                : playerState.eddies >= w.price
                  ? "#2ecc71"
                  : "#ff5a5a";
            const priceText = owned
              ? language === "vi"
                ? "ĐÃ SỞ HỮU"
                : "OWNED"
              : lowLevel
                ? `LV${w.lvl}`
                : `€$${fmt(w.price)}`;

            const rarColors = {
              0: "#cfd6e4",
              1: "#00ff9f",
              2: "#05d9e8",
              3: "#bd00ff",
              4: "#f9f002",
            };
            const nameColor = owned ? "#5a6372" : rarColors[w.rar] || "#cfd6e4";

            return (
              <div
                key={w.id}
                className={`cyber-list-item ${selectedWeapon?.id === w.id ? "active" : ""}`}
                onClick={() => {
                  playSynthSfx("hover");
                  setSelectedWeaponId(w.id);
                }}
              >
                <span className="cyber-list-main">
                  <WeaponPixelPreview weapon={w} />
                  <span style={{ color: nameColor }}>{w.name}</span>
                </span>
                <span style={{ color: priceColor }}>{priceText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel">
          {selectedWeapon ? (
            <>
              <div className="cyber-preview-hero weapon">
                <WeaponPixelPreview weapon={selectedWeapon} large />
              </div>
              <h3 className="cyber-detail-title">{selectedWeapon.name}</h3>
              <div className="cyber-detail-subtitle">
                {window.RAR_NAME
                  ? window.RAR_NAME[selectedWeapon.rar]
                  : "COMMON"}{" "}
                · {weaponLabel(selectedWeapon.kind, language)} ·{" "}
                {weaponLabel(selectedWeapon.cls, language)}
              </div>

              <div
                className="cyber-modal-body"
                style={{ gap: "8px", marginTop: "10px" }}
              >
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">DMG</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, (selectedWeapon.dmg * (selectedWeapon.pellets || 1)) / 1.2)}%`,
                        backgroundColor: "#ff5a5a",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">
                    {selectedWeapon.dmg * (selectedWeapon.pellets || 1)}
                  </span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">RPS</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, selectedWeapon.rof * 6.25)}%`,
                        backgroundColor: "#f9f002",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">{selectedWeapon.rof}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">MAG</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, (selectedWeapon.mag || 0) * 1.25)}%`,
                        backgroundColor: "#05d9e8",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">
                    {selectedWeapon.mag || "—"}
                  </span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">DPS</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, getDps(selectedWeapon) / 2.2)}%`,
                        backgroundColor: "#bd00ff",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">
                    {getDps(selectedWeapon)}
                  </span>
                </div>
              </div>

              <div className="cyber-description">{selectedWeapon.desc}</div>

              {playerState.weapons[selectedWeapon.id] ? (
                <button
                  className="cyber-action-btn primary"
                  disabled
                  style={{ opacity: 0.5 }}
                >
                  {language === "vi" ? "ĐÃ SỞ HỮU" : "OWNED"}
                </button>
              ) : playerState.lvl < selectedWeapon.lvl ? (
                <button
                  className="cyber-action-btn danger"
                  disabled
                  style={{ opacity: 0.5 }}
                >
                  {language === "vi"
                    ? `YÊU CẦU CẤP ĐỘ ${selectedWeapon.lvl}`
                    : `REQUIRES LEVEL ${selectedWeapon.lvl}`}
                </button>
              ) : (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyWeapon) window.buyWeapon(selectedWeapon.id);
                  }}
                >
                  {language === "vi"
                    ? `MUA — €$${fmt(selectedWeapon.price)}`
                    : `BUY — €$${fmt(selectedWeapon.price)}`}
                </button>
              )}
            </>
          ) : (
            <div
              style={{ color: "#5a6372", textAlign: "center", margin: "auto" }}
            >
              {language === "vi" ? "CHỌN MỘT VŨ KHÍ" : "SELECT A WEAPON"}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCarsShop = () => {
    if (typeof window === "undefined" || !window.CARS) return null;
    const cars = window.CARS;
    const selectedCar = cars.find((c) => c.id === selectedCarId) || cars[0];
    const fmt = (val) => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {cars.map((car) => {
            const owned = playerState.cars[car.id];
            const active = playerState.activeCar === car.id;
            const statusColor = active
              ? "#00ff9f"
              : owned
                ? "#5a6372"
                : playerState.eddies >= car.price
                  ? "#2ecc71"
                  : "#ff5a5a";
            const statusText = active
              ? language === "vi"
                ? "ĐANG DÙNG"
                : "ACTIVE"
              : owned
                ? language === "vi"
                  ? "ĐÃ SỞ HỮU"
                  : "OWNED"
                : `€$${fmt(car.price)}`;

            return (
              <div
                key={car.id}
                className={`cyber-list-item ${selectedCar?.id === car.id ? "active" : ""}`}
                onClick={() => {
                  playSynthSfx("hover");
                  setSelectedCarId(car.id);
                }}
              >
                <span className="cyber-list-main">
                  <CarPixelPreview car={car} />
                  <span>{car.name}</span>
                </span>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div className="cyber-detail-panel">
          {selectedCar ? (
            <>
              <div className="cyber-preview-hero car">
                <CarPixelPreview car={selectedCar} large />
              </div>
              <h3 className="cyber-detail-title">{selectedCar.name}</h3>
              <div className="cyber-detail-subtitle">
                {selectedCar.bike
                  ? language === "vi"
                    ? "MÔ TÔ"
                    : "MOTORCYCLE"
                  : language === "vi"
                    ? "Ô TÔ"
                    : "CAR"}{" "}
                · {selectedCar.shape.toUpperCase()}
              </div>

              <div
                className="cyber-modal-body"
                style={{ gap: "8px", marginTop: "10px" }}
              >
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">TOP</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, selectedCar.top / 3.6)}%`,
                        backgroundColor: "#f9f002",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.top}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">ACC</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, selectedCar.acc / 3.2)}%`,
                        backgroundColor: "#ff5a5a",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.acc}</span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">GRIP</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, ((selectedCar.grip - 0.8) / 0.16) * 100)}%`,
                        backgroundColor: "#05d9e8",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">
                    {selectedCar.grip.toFixed(2)}
                  </span>
                </div>
                <div className="cyber-stat-row">
                  <span className="cyber-stat-label">HP</span>
                  <div className="cyber-stat-bar-track">
                    <div
                      className="cyber-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, selectedCar.hp / 4.2)}%`,
                        backgroundColor: "#00ff9f",
                      }}
                    />
                  </div>
                  <span className="cyber-stat-value">{selectedCar.hp}</span>
                </div>
              </div>

              {playerState.activeCar === selectedCar.id ? (
                <button
                  className="cyber-action-btn primary"
                  disabled
                  style={{ opacity: 0.5 }}
                >
                  {language === "vi"
                    ? "PHƯƠNG TIỆN HOẠT ĐỘNG"
                    : "YOUR ACTIVE RIDE"}
                </button>
              ) : playerState.cars[selectedCar.id] ? (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.setActiveCar)
                      window.setActiveCar(selectedCar.id);
                  }}
                >
                  {language === "vi" ? "THIẾT LẬP HOẠT ĐỘNG" : "SET ACTIVE"}
                </button>
              ) : (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyCar) window.buyCar(selectedCar.id);
                  }}
                >
                  {language === "vi"
                    ? `MUA — €$${fmt(selectedCar.price)}`
                    : `BUY — €$${fmt(selectedCar.price)}`}
                </button>
              )}
            </>
          ) : (
            <div
              style={{ color: "#5a6372", textAlign: "center", margin: "auto" }}
            >
              {language === "vi" ? "CHỌN MỘT PHƯƠNG TIỆN" : "SELECT A VEHICLE"}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRipperShop = () => {
    if (typeof window === "undefined" || !window.CYBER || !window.CYBER_SLOTS)
      return null;
    const slots = window.CYBER_SLOTS;
    const items = [];
    slots.forEach((slot) => {
      items.push({ isHeader: true, text: slot });
      window.CYBER.filter((c) => c.slot === slot).forEach((c) => {
        items.push({ isHeader: false, cy: c });
      });
    });

    const firstCy = items.find((it) => !it.isHeader)?.cy;
    const selectedCyber =
      window.CYBER.find((c) => c.id === selectedCyberId) || firstCy;
    const fmt = (val) => Number(val).toLocaleString();

    const getFxDesc = (cy, ti) => {
      const t = cy.tiers[ti];
      if (!t) return "";
      switch (cy.id) {
        case "sandevistan":
          return `TIME ${Math.round(t.ts * 100)}% FOR ${t.dur}S · CD ${t.cd}S`;
        case "berserk":
          return `DMG ×${t.dmg} +${t.armor} ARMOR · ${t.dur}S`;
        case "memboost":
          return `XP ×${t.xp}`;
        case "kiroshi":
          return (
            `CRIT +${Math.round(t.crit * 100)}%` +
            (ti >= 1 ? " · WIDE MINIMAP" : "")
          );
        case "biomonitor":
          return "AUTO-MAXDOC BELOW 30% HP";
        case "second_heart":
          return "REVIVE ON DEATH · CD 180S";
        case "kerenzikov":
          return `DASH SLOWS TIME TO ${Math.round(t.ts * 100)}% FOR ${t.dur}S`;
        case "subdermal":
          return `+${t.armor} ARMOR`;
        case "camo":
          return `INVISIBLE ${t.dur}S · CD ${t.cd}S`;
        case "titanium":
          return `+${t.hp} MAX HP`;
        case "microrotor":
          return `FIRE RATE ×${t.rof}`;
        case "smartlink":
          return `SMART GUNS TRACK · TURN ${t.turn}`;
        case "tendons":
          return `SPEED ×${t.spd} · DASH CD ×${t.dash}`;
        default:
          return cy.grants
            ? `ADDS ${window.WPN && window.WPN[cy.grants] ? window.WPN[cy.grants].name : cy.grants} TO ARSENAL`
            : "UPGRADE";
      }
    };

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {items.map((it, idx) => {
            if (it.isHeader) {
              return (
                <div
                  key={`hdr-${idx}`}
                  style={{
                    padding: "6px 12px",
                    fontSize: "10px",
                    color: "#3a5a66",
                    borderBottom: "1px dashed rgba(58,90,102,0.3)",
                    marginTop: "8px",
                    fontFamily: "var(--font-title)",
                  }}
                >
                  — {it.text} —
                </div>
              );
            }
            const cy = it.cy;
            const tier = playerState.cyber[cy.id] || 0;
            const max = cy.tiers.length;
            const activeOs = cy.os && playerState.os === cy.id;

            let statusText = "";
            let statusColor = "#2ecc71";

            if (cy.os && tier && playerState.os !== cy.id) {
              statusText = language === "vi" ? "KÍCH HOẠT" : "ACTIVATE";
              statusColor = "#f9f002";
            } else if (tier >= max) {
              statusText =
                cy.os && activeOs
                  ? "ACTIVE·MAX"
                  : language === "vi"
                    ? "TỐI ĐA"
                    : "MAXED";
              statusColor = "#5a6372";
            } else {
              const t = cy.tiers[tier];
              statusText =
                playerState.lvl < t.lvl ? `LV${t.lvl}` : `€$${fmt(t.price)}`;
              statusColor =
                playerState.lvl < t.lvl
                  ? "#ff5a5a"
                  : playerState.eddies >= t.price
                    ? "#2ecc71"
                    : "#ff5a5a";
            }

            return (
              <div
                key={cy.id}
                className={`cyber-list-item ${selectedCyber?.id === cy.id ? "active" : ""}`}
                onClick={() => {
                  playSynthSfx("hover");
                  setSelectedCyberId(cy.id);
                }}
              >
                <div>
                  <span
                    style={{
                      color: tier ? "#05d9e8" : "#cfd6e4",
                      marginRight: "6px",
                    }}
                  >
                    {cy.name}
                  </span>
                  {Array.from({ length: max }).map((_, k) => (
                    <span
                      key={k}
                      style={{
                        display: "inline-block",
                        width: "4px",
                        height: "4px",
                        marginRight: "2px",
                        backgroundColor:
                          k < tier ? "#05d9e8" : "rgba(255,255,255,0.15)",
                        verticalAlign: "middle",
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div
          className="cyber-detail-panel"
          style={{
            borderColor: "rgba(5, 217, 232, 0.2)",
            backgroundColor: "rgba(5, 217, 232, 0.01)",
          }}
        >
          {selectedCyber ? (
            <>
              <h3
                className="cyber-detail-title"
                style={{ color: "var(--cyber-cyan)" }}
              >
                {selectedCyber.name}
              </h3>
              <div className="cyber-detail-subtitle">
                {selectedCyber.slot} {selectedCyber.os ? "· OS CHIP" : ""}
              </div>

              <div
                className="cyber-description"
                style={{ borderTop: "none", paddingTop: 0 }}
              >
                {selectedCyber.desc}
              </div>

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {selectedCyber.tiers.map((t, idx) => {
                  const owned =
                    idx < (playerState.cyber[selectedCyber.id] || 0);
                  return (
                    <div
                      key={idx}
                      style={{
                        fontSize: "10px",
                        color: owned ? "#05d9e8" : "#5a6372",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>MK.{idx + 1}</span>
                      <span>{getFxDesc(selectedCyber, idx)}</span>
                    </div>
                  );
                })}
              </div>

              {selectedCyber.os &&
              (playerState.cyber[selectedCyber.id] || 0) > 0 &&
              playerState.os !== selectedCyber.id ? (
                <button
                  className="cyber-action-btn primary"
                  onClick={() => {
                    playSynthSfx("click");
                    if (window.buyCyber) window.buyCyber(selectedCyber.id);
                  }}
                >
                  {language === "vi" ? "KÍCH HOẠT HỆ ĐIỀU HÀNH" : "ACTIVATE OS"}
                </button>
              ) : (playerState.cyber[selectedCyber.id] || 0) >=
                selectedCyber.tiers.length ? (
                <button
                  className="cyber-action-btn primary"
                  disabled
                  style={{ opacity: 0.5 }}
                >
                  {language === "vi" ? "ĐÃ CÀI ĐẶT TỐI ĐA" : "FULLY INSTALLED"}
                </button>
              ) : (
                (() => {
                  const currentTier = playerState.cyber[selectedCyber.id] || 0;
                  const t = selectedCyber.tiers[currentTier];
                  const lowLevel = playerState.lvl < t.lvl;

                  return lowLevel ? (
                    <button
                      className="cyber-action-btn danger"
                      disabled
                      style={{ opacity: 0.5 }}
                    >
                      {language === "vi"
                        ? `YÊU CẦU CẤP ĐỘ ${t.lvl}`
                        : `REQUIRES LEVEL ${t.lvl}`}
                    </button>
                  ) : (
                    <button
                      className="cyber-action-btn primary"
                      onClick={() => {
                        playSynthSfx("click");
                        if (window.buyCyber) window.buyCyber(selectedCyber.id);
                      }}
                    >
                      {language === "vi"
                        ? `${currentTier ? "NÂNG CẤP" : "CÀI ĐẶT"} — €$${fmt(t.price)}`
                        : `${currentTier ? "UPGRADE" : "INSTALL"} — €$${fmt(t.price)}`}
                    </button>
                  );
                })()
              )}
            </>
          ) : (
            <div
              style={{ color: "#5a6372", textAlign: "center", margin: "auto" }}
            >
              {language === "vi"
                ? "CHỌN THIẾT BỊ CẤY GHÉP"
                : "SELECT CYBERWARE"}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBar = () => {
    return (
      <div
        className="cyber-modal-body"
        style={{ textAlign: "center", padding: "10px 0" }}
      >
        <p style={{ color: "#8a93a6", fontSize: "12px", marginBottom: "20px" }}>
          {language === "vi"
            ? "CHÀO MỪNG ĐẾN VỚI AFTERLIFE BAR"
            : "WELCOME TO THE AFTERLIFE BAR"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="cyber-modal-btn"
            style={{ padding: "12px" }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(0);
            }}
          >
            &apos;JOHNNY SILVERHAND&apos; — €$100
          </button>
          <button
            className="cyber-modal-btn"
            style={{ padding: "12px" }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(1);
            }}
          >
            MAXDOC (+1) — €$50
          </button>
          <button
            className="cyber-modal-btn active"
            style={{ padding: "12px" }}
            onClick={() => {
              playSynthSfx("click");
              if (window.barSelect) window.barSelect(2);
            }}
          >
            {language === "vi" ? "RỜI QUÁN" : "LEAVE BAR"}
          </button>
        </div>

        <p style={{ fontSize: "10px", color: "#5a6372", marginTop: "20px" }}>
          {language === "vi"
            ? "HỒI PHỤC HOÀN TOÀN + TĂNG TỐC ĐỘ 20 GIÂY"
            : "FULL HEAL + SPEED BUFF 20S"}
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
        <div className="talk-npc-name">
          {n.name} · {n.kind === "doll" ? "CLOUDS" : "JIG-JIG STREET"}
        </div>
        <div className="talk-npc-text">
          &ldquo;{playerState.talk.text}&rdquo;
        </div>

        <div className="talk-options">
          {opts.map((opt, i) => (
            <button
              key={i}
              className="cyber-modal-btn"
              style={{ textAlign: "left", padding: "10px 16px" }}
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
    const fmt = (val) => Number(val).toLocaleString();

    return (
      <div className="cyber-grid-layout">
        <div className="cyber-list">
          {stock.map((row) => {
            const name =
              row === null
                ? language === "vi"
                  ? "MẶC ĐỊNH V"
                  : "DEFAULT V"
                : language === "vi"
                  ? `BỘ TRANG PHỤC #${row + 1}`
                  : `OUTFIT #${row + 1}`;
            const equipped = playerState.skin === row;
            const statusColor = equipped
              ? "#5a6372"
              : playerState.eddies >= 100
                ? "#2ecc71"
                : "#ff5a5a";
            const statusText = equipped
              ? language === "vi"
                ? "ĐANG MẶC"
                : "EQUIPPED"
              : "€$100";

            return (
              <div
                key={row === null ? "null" : row}
                className={`cyber-list-item ${selectedSkinId === row ? "active" : ""}`}
                onClick={() => {
                  playSynthSfx("hover");
                  setSelectedSkinId(row);
                }}
              >
                <span>{name}</span>
                <span style={{ color: statusColor }}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <div
          className="cyber-detail-panel"
          style={{ borderColor: "var(--cyber-pink)" }}
        >
          <h3
            className="cyber-detail-title"
            style={{ color: "var(--cyber-pink)" }}
          >
            {selectedOutfit === null
              ? language === "vi"
                ? "DIỆN MẠO MẶC ĐỊNH V"
                : "DEFAULT V"
              : language === "vi"
                ? `BỘ TRANG PHỤC KHÁC #${selectedOutfit + 1}`
                : `CIVILIAN OUTFIT #${selectedOutfit + 1}`}
          </h3>
          <div className="cyber-detail-subtitle">
            {language === "vi" ? "GIỚI TÍNH: " : "GENDER: "}{" "}
            {playerState.gender === "f"
              ? language === "vi"
                ? "NỮ"
                : "FEMALE"
              : language === "vi"
                ? "NAM"
                : "MALE"}
          </div>

          <OutfitPreview
            skinId={selectedOutfit}
            gender={playerState.gender}
            language={language}
          />

          {playerState.skin === selectedOutfit ? (
            <button
              className="cyber-action-btn primary"
              disabled
              style={{ opacity: 0.5 }}
            >
              {language === "vi" ? "ĐÃ ĐƯỢC TRANG BỊ" : "ALREADY EQUIPPED"}
            </button>
          ) : playerState.eddies < 100 ? (
            <button
              className="cyber-action-btn danger"
              disabled
              style={{ opacity: 0.5 }}
            >
              {language === "vi" ? "KHÔNG ĐỦ EDDIES" : "NOT ENOUGH EDDIES"}
            </button>
          ) : (
            <button
              className="cyber-action-btn primary"
              onClick={() => {
                playSynthSfx("click");
                if (window.buyWardrobeOutfit)
                  window.buyWardrobeOutfit(selectedOutfit);
              }}
            >
              {language === "vi" ? "TRANG BỊ LÊN — €$100" : "EQUIP — €$100"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCasino = () => {
    if (typeof window === "undefined" || !window.G || !window.G.uiS)
      return null;
    const s = window.G.uiS;
    s.bet = s.bet || 100;
    s.choice = s.choice !== undefined ? s.choice : 1;
    const choiceText =
      s.choice === 1
        ? language === "vi"
          ? "TÀI (BIG)"
          : "BIG (TÀI)"
        : language === "vi"
          ? "XỈU (SMALL)"
          : "SMALL (XỈU)";
    const fmt = (val) => Number(val).toLocaleString();

    return (
      <div className="cyber-modal-body" style={{ gap: "12px" }}>
        <p
          style={{
            color: "#8a93a6",
            fontSize: "11px",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          {language === "vi"
            ? "TRÒ CHƠI TÀI XỈU - NHÂN ĐÔI SỐ TIỀN CƯỢC"
            : "BET AND DOUBLE YOUR EDDIES ON DICE"}
        </p>

        <div className="gang-select-row">
          <span>{language === "vi" ? "TIỀN ĐẶT CƯỢC" : "BET SIZE"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="gang-nav-btn"
              onClick={() => {
                playSynthSfx("click");
                s.bet = Math.max(100, s.bet - 100);
                forceUpdate();
              }}
            >
              ◀
            </button>
            <span style={{ color: "var(--cyber-yellow)", fontWeight: "bold" }}>
              €$ {fmt(s.bet)}
            </span>
            <button
              className="gang-nav-btn"
              onClick={() => {
                playSynthSfx("click");
                s.bet = s.bet + 100;
                forceUpdate();
              }}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="gang-select-row">
          <span>{language === "vi" ? "LỰA CHỌN" : "CHOICE"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="gang-nav-btn"
              onClick={() => {
                playSynthSfx("click");
                s.choice = 1 - s.choice;
                forceUpdate();
              }}
            >
              ◀
            </button>
            <span style={{ color: "var(--cyber-cyan)", fontWeight: "bold" }}>
              {choiceText}
            </span>
            <button
              className="gang-nav-btn"
              onClick={() => {
                playSynthSfx("click");
                s.choice = 1 - s.choice;
                forceUpdate();
              }}
            >
              ▶
            </button>
          </div>
        </div>

        <button
          className="cyber-action-btn primary"
          onClick={() => {
            playSynthSfx("click");
            rollDice();
          }}
        >
          {language === "vi"
            ? "LẮC XÚC XẮC // ROLL DICE"
            : "ROLL DICE // LẮC XÚC XẮC"}
        </button>

        {s.dice && (
          <div>
            <div className="casino-dice-container">
              {s.dice.map((val, idx) => (
                <div key={idx} className="casino-dice-box">
                  {val}
                </div>
              ))}
            </div>

            <div className="casino-result">
              <span style={{ color: "#8a93a6" }}>
                SUM = {s.dice[0] + s.dice[1] + s.dice[2]}
              </span>{" "}
              &middot;{" "}
              {s.result === "win" && (
                <span style={{ color: "#2ecc71" }}>
                  {language === "vi" ? "THẮNG!" : "WIN!"} +€${fmt(s.bet)}
                </span>
              )}
              {s.result === "lose" && (
                <span style={{ color: "#ff2a3c" }}>
                  {language === "vi" ? "THUA!" : "LOSE!"} -€${fmt(s.bet)}
                </span>
              )}
              {s.result === "triple" && (
                <span style={{ color: "#ff2a3c" }}>
                  {language === "vi"
                    ? "BA CON GIỐNG NHAU - NHÀ CÁI ĂN!"
                    : "TRIPLE! DEALER WINS"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGangMenu = () => {
    if (typeof window === "undefined" || !window.G) return null;
    const names = window.PLAYER_GANG_NAMES || ["SOLO"];
    const icons = window.PLAYER_GANG_ICONS || [];
    const G = window.G;

    G.gangNameSel = G.gangNameSel || 0;
    G.gangIconSel = G.gangIconSel || 0;

    const iconObj = window.gangIconObj
      ? window.gangIconObj(G.gangIconSel)
      : { mark: "?", name: "SOLO", col: "#8a93a6" };

    const inviteTarget = window.nearestRemotePlayer
      ? window.nearestRemotePlayer(
          (rp) => G.gang && !window.sameGangProfile(rp, window.playerProfile()),
        )
      : null;
    const requestTarget = window.nearestRemotePlayer
      ? window.nearestRemotePlayer(
          (rp) => !G.gang && rp.gang && rp.gang !== "SOLO",
        )
      : null;

    const getGangLabel = (gang) =>
      window.gangLabel ? window.gangLabel(gang) : "CHƯA CÓ";
    const getFactionColor = (fac) =>
      window.factionColor ? window.factionColor(fac) : "#8a93a6";

    const fmtName = (name) =>
      window.cleanPlayerName ? window.cleanPlayerName(name) : name;

    const profile = window.playerProfile ? window.playerProfile() : null;

    return (
      <div className="cyber-modal-body gang-modal-body">
        {/* Section 1: Current Gang Membership Status Card */}
        <div className="gang-status-card">
          <div className="gang-status-header">
            {language === "vi" ? "THÔNG TIN BĂNG ĐẢNG" : "GANG OVERVIEW"}
          </div>
          <div className="gang-status-content">
            <div className="gang-status-badge-container">
              {profile?.gangIcon ? (
                <GangPixelBadge mark={profile.gangIcon} color={profile.gangIconCol} size="lg" />
              ) : (
                <span className="pixel-gang-empty lg" />
              )}
            </div>
            <div className="gang-status-details">
              <div className="gang-status-name" style={{ color: profile?.gangIconCol || "var(--cyber-cyan)" }}>
                {profile?.gang || "SOLO"}
              </div>
              <div className="gang-status-role">
                {G.gang
                  ? G.isGangLeader
                    ? (language === "vi" ? "THỦ LĨNH BĂNG" : "GANG LEADER")
                    : (language === "vi" ? "THÀNH VIÊN" : "ACTIVE MEMBER")
                  : (language === "vi" ? "LÃNG KHÁCH ĐỘC HÀNH" : "SOLO OUTLAW")}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Faction Generator (Editor) */}
        {(!G.gang || G.isGangLeader || G.gang === "player") && (
          <div className="gang-generator-box">
            <div className="gang-generator-header">
              {language === "vi" ? "THIẾT LẬP BĂNG ĐẢNG" : "FACTION GENERATOR"}
            </div>
            
            <div className="gang-generator-fields">
              {/* Field 1: Name Selector */}
              <div className="gang-field-group">
                <label className="gang-field-label">
                  {language === "vi" ? "TÊN BĂNG ĐẢNG MỚI:" : "SELECT GANG NAME:"}
                </label>
                <div className="gang-field-selector">
                  <button
                    className="gang-selector-btn"
                    onClick={() => {
                      playSynthSfx("click");
                      G.gangNameSel =
                        (G.gangNameSel - 1 + names.length) % names.length;
                      forceUpdate();
                    }}
                  >
                    ◀
                  </button>
                  <div className="gang-selector-value gang-name-value">
                    {names[G.gangNameSel]}
                  </div>
                  <button
                    className="gang-selector-btn"
                    onClick={() => {
                      playSynthSfx("click");
                      G.gangNameSel = (G.gangNameSel + 1) % names.length;
                      forceUpdate();
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Field 2: Icon Selector */}
              <div className="gang-field-group">
                <label className="gang-field-label">
                  {language === "vi" ? "BIỂU TƯỢNG BĂNG ĐẢNG:" : "SELECT GANG ICON:"}
                </label>
                <div className="gang-field-selector icon-selector-row">
                  <button
                    className="gang-selector-btn"
                    onClick={() => {
                      playSynthSfx("click");
                      G.gangIconSel =
                        (G.gangIconSel - 1 + icons.length) % icons.length;
                      forceUpdate();
                    }}
                  >
                    ◀
                  </button>
                  
                  <div className="gang-icon-preview-box" style={{ borderColor: iconObj.col }}>
                    <div className="gang-icon-badge-wrap">
                      <GangPixelBadge mark={iconObj.mark} color={iconObj.col} size="lg" />
                    </div>
                    <span className="gang-icon-name" style={{ color: iconObj.col }}>
                      {iconObj.name}
                    </span>
                  </div>

                  <button
                    className="gang-selector-btn"
                    onClick={() => {
                      playSynthSfx("click");
                      G.gangIconSel = (G.gangIconSel + 1) % icons.length;
                      forceUpdate();
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <button
              className="retro-arcade-btn primary gang-action-submit"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(0);
              }}
            >
              {G.gang === "player"
                ? language === "vi"
                  ? "CẬP NHẬT TÊN & BIỂU TƯỢNG"
                  : "UPDATE GANG DETAILS"
                : language === "vi"
                  ? "THÀNH LẬP BĂNG ĐẢNG // CREATE GANG"
                  : "ESTABLISH FACTION // CREATE GANG"}
            </button>
          </div>
        )}

        {/* Section 3: Interactive Network / Actions (Invite, Join, Approve) */}
        <div className="gang-actions-section">
          {inviteTarget ? (
            <button
              className="retro-arcade-btn gang-network-btn invite"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(1);
              }}
            >
              {language === "vi"
                ? `MỜI GIA NHẬP: ${fmtName(inviteTarget.name)}`
                : `INVITE TO GANG: ${fmtName(inviteTarget.name)}`}
            </button>
          ) : (
            <button
              className="retro-arcade-btn gang-network-btn invite disabled"
              disabled
            >
              {language === "vi"
                ? "KHÔNG CÓ NGƯỜI CHƠI GẦN ĐÂY ĐỂ MỜI"
                : "NO PLAYERS NEARBY TO INVITE"}
            </button>
          )}

          {requestTarget ? (
            <button
              className="retro-arcade-btn gang-network-btn join"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(2);
              }}
            >
              {language === "vi"
                ? `XIN GIA NHẬP BĂNG: ${requestTarget.gang}`
                : `REQUEST TO JOIN: ${requestTarget.gang}`}
            </button>
          ) : (
            <button
              className="retro-arcade-btn gang-network-btn join disabled"
              disabled
            >
              {language === "vi"
                ? "KHÔNG CÓ BĂNG GẦN ĐÂY ĐỂ GIA NHẬP"
                : "NO GANGS NEARBY TO JOIN"}
            </button>
          )}

          {G.gangJoinReq && G.gang ? (
            <button
              className="retro-arcade-btn gang-network-btn approve"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(3);
              }}
            >
              {language === "vi"
                ? `CHẤP THUẬN: ${fmtName(G.gangJoinReq.fromName)}`
                : `APPROVE JOIN: ${fmtName(G.gangJoinReq.fromName)}`}
            </button>
          ) : null}

          {G.playerInvite || G.gangInvite ? (
            <button
              className="retro-arcade-btn gang-network-btn accept-invite"
              onClick={() => {
                playSynthSfx("click");
                if (window.gangMenuAct) window.gangMenuAct(4);
              }}
            >
              {language === "vi"
                ? `ĐỒNG Ý GIA NHẬP: ${G.playerInvite ? G.playerInvite.gang : getGangLabel(G.gangInvite)}`
                : `ACCEPT INVITATION: ${G.playerInvite ? G.playerInvite.gang : getGangLabel(G.gangInvite)}`}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    const soundLabel =
      typeof window !== "undefined" && window.SFX && window.SFX.muted
        ? language === "vi"
          ? "ÂM THANH: TẮT"
          : "SOUND: OFF"
        : language === "vi"
          ? "ÂM THANH: BẬT"
          : "SOUND: ON";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Volume Option */}
        <div className="cyber-modal-option">
          <label className="settings-label">
            {language === "vi"
              ? "ÂM LƯỢNG HỆ THỐNG: "
              : "AUDIO INTERFACE VOLUME: "}
            {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setVolume(val);
              if (
                typeof window !== "undefined" &&
                window.SFX &&
                window.SFX.master
              ) {
                window.SFX.master.gain.value = (val / 100) * 0.6;
              }
            }}
            className="slider"
            style={{ width: "100%" }}
          />
        </div>

        {/* Sound Toggle & CRT screen */}
        <div style={{ display: "flex", gap: "10px" }}>
          <div className="cyber-modal-option" style={{ flex: 1 }}>
            <label className="settings-label">{language === "vi" ? "HIỆU ỨNG ÂM THANH" : "SYSTEM SOUND FX"}</label>
            <button
              className="cyber-modal-btn active"
              style={{ width: "100%", marginTop: "4px" }}
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

          <div className="cyber-modal-option" style={{ flex: 1 }}>
            <label className="settings-label">{language === "vi" ? "MÀN HÌNH CRT" : "CRT SCANLINE"}</label>
            <button
              className={`cyber-modal-btn ${crtActive ? "active" : ""}`}
              style={{ width: "100%", marginTop: "4px" }}
              onClick={() => {
                playSynthSfx("click");
                setCrtActive(!crtActive);
              }}
            >
              {crtActive
                ? language === "vi"
                  ? "KÍCH HOẠT"
                  : "ENABLED"
                : language === "vi"
                  ? "VÔ HIỆU"
                  : "DISABLED"}
            </button>
          </div>
        </div>

        {/* Radio Option */}
        <div className="cyber-modal-option">
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--cyber-cyan)" }}>{language === "vi" ? "KÊNH PHÁT THANH NET" : "ACTIVE NET RADIO"}</label>
          <div className="radio-display" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", padding: "6px 8px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="radio-name" style={{ color: "var(--cyber-yellow)", fontFamily: "var(--font-pixel-mono)", fontSize: "10px" }}>
              {typeof window !== "undefined" &&
              window.SFX &&
              window.SFX.stationName() === "OFF"
                ? language === "vi"
                  ? "TẮT"
                  : "OFF"
                : typeof window !== "undefined" && window.SFX
                  ? window.SFX.stationName()
                  : "OFF"}
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
              {language === "vi" ? "ĐỔI KÊNH" : "CYCLE"}
            </button>
          </div>
        </div>

        {/* Inventory Color Theme Selector */}
        <div className="cyber-modal-option">
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--cyber-cyan)" }}>
            {language === "vi" ? "MÀU SẮC GIAO DIỆN TÚI ĐỒ" : "INVENTORY INTERFACE THEME"}
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {(() => {
              const themesMap = (typeof window !== "undefined" && window.INV_THEMES) || {
                grey: { color: '#8a93a6', nameVi: 'XÁM CHIẾN THUẬT', nameEn: 'TACTICAL GREY' },
                pink: { color: '#ff2a6d', nameVi: 'HỒNG NEON', nameEn: 'NEON PINK' },
                yellow: { color: '#f9f002', nameVi: 'VÀNG CYBER', nameEn: 'CYBER YELLOW' },
                cyan: { color: '#05d9e8', nameVi: 'XANH ĐIỆN', nameEn: 'CYBER CYAN' },
                green: { color: '#39ff14', nameVi: 'XANH TOXIC', nameEn: 'TOXIC GREEN' },
                purple: { color: '#bd00ff', nameVi: 'TÍM ACID', nameEn: 'ACID PURPLE' },
                orange: { color: '#ff8c00', nameVi: 'CAM AMBER', nameEn: 'AMBER ORANGE' }
              };
              return Object.keys(themesMap).map((themeKey) => {
                const th = themesMap[themeKey];
                const active = (playerState.invTheme || "grey") === themeKey;
                return (
                  <button
                    key={themeKey}
                    className={`cyber-modal-btn ${active ? "active" : ""}`}
                    style={{
                      flex: "1 1 calc(33.3% - 6px)",
                      padding: "6px 4px",
                      fontSize: "8px",
                      borderColor: th.color,
                      color: active ? "#000" : th.color,
                      background: active ? th.color : "rgba(0,0,0,0.3)",
                      boxShadow: active ? `0 0 8px ${th.color}` : "none",
                    }}
                    onClick={() => {
                      playSynthSfx("click");
                      if (typeof window !== "undefined" && window.G) {
                        window.G.invTheme = themeKey;
                        if (window.saveGame) window.saveGame();
                      }
                    }}
                  >
                    {language === "vi" ? th.nameVi : th.nameEn}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Controls Guide */}
        <div className="cyber-modal-option">
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: "8.5px", color: "var(--cyber-cyan)" }}>{language === "vi" ? "HƯỚNG DẪN ĐIỀU KHIỂN" : "CONTROLS GUIDE"}</label>
          <div
            style={{
              fontSize: "9px",
              color: "#8a93a6",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginTop: "4px",
              padding: "8px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(5, 217, 232, 0.15)",
              fontFamily: "var(--font-pixel-mono)"
            }}
          >
            <div>WASD: {language === "vi" ? "Di chuyển" : "Move V"} | Mouse: {language === "vi" ? "Ngắm & Bắn" : "Aim & Shoot"}</div>
            <div>SPACE: {language === "vi" ? "Dash Lướt" : "Dash Action"} | R: {language === "vi" ? "Nạp đạn" : "Reload weapon"}</div>
            <div>Q: {language === "vi" ? "Kích hoạt OS" : "Use Deck OS"} | F: {language === "vi" ? "Tàng hình" : "Optical Camouflage"}</div>
            <div>C: {language === "vi" ? "Hồi máu Maxdoc" : "Inject Maxdoc HP"} | V: {language === "vi" ? "Gọi / Lên xe" : "Summon / Drive vehicle"}</div>
            <div>N: {language === "vi" ? "Đổi kênh Radio" : "Cycle vehicle radio"} | TAB: {language === "vi" ? "Đóng menu" : "Close menu"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            className="cyber-action-btn primary"
            style={{ flex: 1 }}
            onClick={() => {
              playSynthSfx("click");
              if (
                typeof window !== "undefined" &&
                typeof window.saveGame === "function"
              ) {
                window.saveGame();
                banner(
                  language === "vi" ? "ĐÃ LƯU TIẾN TRÌNH" : "DATA SEGMENT SYNCED",
                  language === "vi" ? "ĐÃ LƯU TRÒ CHƠI THÀNH CÔNG" : "SAVE STATE STORED TO CLOUD NEST",
                  "#00ff9f",
                );
              }
            }}
          >
            {language === "vi" ? "LƯU TRÒ CHƠI" : "SAVE GAME STATE"}
          </button>

          <button
            className="cyber-action-btn"
            style={{ flex: 1, background: "rgba(255, 42, 60, 0.15)", border: "2px solid #ff2a3c", color: "#ff2a3c" }}
            onClick={() => {
              playSynthSfx("click");
              if (confirm(language === "vi" ? "BẠN CÓ CHẮC MUỐN XÓA TIẾN TRÌNH KHÔNG?" : "ARE YOU SURE YOU WANT TO RESET SAVE STATE?")) {
                if (typeof window !== "undefined" && typeof window.wipeSave === "function") {
                  window.wipeSave();
                  window.G.ui = null;
                  window.G.state = "title";
                  window.G.titleMode = "name";
                  window.G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
                  forceUpdate();
                }
              }
            }}
          >
            {language === "vi" ? "XÓA FILE LƯU" : "WIPE SAVE DATA"}
          </button>
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    if (typeof window === "undefined" || !window.G) return null;
    const invTabs = [
      "WEAPONS",
      "CYBERWARE",
      "GARAGE",
      "MAP",
      "STATS",
      "RANKING",
      "GANG",
      "SETTINGS",
    ];
    const invTabsVi = [
      "VŨ KHÍ",
      "CẤY GHÉP CHROME",
      "NHÀ XE",
      "BẢN ĐỒ",
      "THÔNG SỐ",
      "XẾP HẠNG",
      "BĂNG ĐẢNG",
      "CÀI ĐẶT",
    ];

    const getDps = (w) => Math.round(w.dmg * (w.pellets || 1) * w.rof);
    const fmt = (val) => Number(val).toLocaleString();

    const getRepRanking = () => {
      const legends = [
        { id: "legend1", name: "MORGAN BLACKHAND", lvl: 50, status: "LEGEND / MISSING", color: "#f9f002", isPlayer: false },
        { id: "legend2", name: "ADAM SMASHER", lvl: 45, status: "ARASAKA ENFORCER", color: "#ff2a6d", isPlayer: false },
        { id: "legend3", name: "ROGUE AMENDIARES", lvl: 40, status: "AFTERLIFE QUEEN", color: "#00ff9f", isPlayer: false },
        { id: "legend4", name: "WEYLAND FANG", lvl: 35, status: "BOY TOY LEGEND", color: "#bd00ff", isPlayer: false },
        { id: "legend5", name: "KERRY EURODYNE", lvl: 30, status: "ROCKERBOY ICON", color: "#05d9e8", isPlayer: false },
        { id: "legend6", name: "SPIDER MURPHY", lvl: 25, status: "LEGEND NETRUNNER", color: "#05d9e8", isPlayer: false },
        { id: "legend7", name: "DAVID MARTINEZ", lvl: 20, status: "FLATLINED (2076)", color: "#ff8c00", isPlayer: false },
        { id: "legend8", name: "MAINE", lvl: 15, status: "FLATLINED (2076)", color: "#8a93a6", isPlayer: false },
        { id: "legend9", name: "REBECCA", lvl: 10, status: "FLATLINED (2076)", color: "#8a93a6", isPlayer: false },
      ];

      const playerLvl = playerState.lvl || 1;
      const playerRow = {
        id: "player_v",
        name: (playerName || "V").toUpperCase() + " (YOU)",
        lvl: playerLvl,
        status: playerLvl >= 50 ? "NIGHT CITY LEGEND" : "ACTIVE MERC",
        color: "var(--cyber-cyan)",
        isPlayer: true
      };

      const combined = [...legends, playerRow];
      combined.sort((a, b) => {
        if (b.lvl !== a.lvl) return b.lvl - a.lvl;
        return a.isPlayer ? -1 : 1;
      });

      return combined;
    };

    const getGangLabel = (gang) =>
      window.gangLabel ? window.gangLabel(gang) : "CHƯA CÓ";

    return (
      <div className="inv-modal-inner">
        {/* Left Column: Character Profile Sheet */}
        <div className="char-sheet-panel">
          <h4 className="char-sheet-title">{language === "vi" ? "ĐỐI TƯỢNG" : "OPERATIVE"}</h4>
          
          <div className="char-avatar-frame">
            <BootCharacterPreview gender={playerState.gender} skinId={playerState.skin} active={true} />
            <div className="char-meta-row">
              <span className="char-name">{playerName || "V"}</span>
              <span className="char-sub">LEVEL {playerState.lvl}</span>
              <span className="char-sub" style={{ color: "var(--cyber-cyan)", fontSize: "7.5px" }}>
                XP: {fmt(playerState.xp)}
              </span>
            </div>
          </div>

          <div className="char-quick-slots-title">
            {language === "vi" ? "Ô TRANG BỊ" : "QUICK SLOTS"}
          </div>
          <div className="char-quick-slots">
            {[0, 1, 2].map((slotIdx) => {
              const wId = playerState.loadout[slotIdx];
              const w = wId && window.WEAPONS ? window.WEAPONS.find((x) => x.id === wId) : null;
              const active = selectedInvWeaponId === wId && wId;
              return (
                <div
                  key={slotIdx}
                  className={`char-quick-slot-card ${active ? "active" : ""}`}
                  onClick={() => {
                    if (w) {
                      playSynthSfx("hover");
                      setSelectedInvWeaponId(w.id);
                      setSelectedInvTab(0); // Switch to weapons tab
                    }
                  }}
                >
                  <span className="char-quick-slot-num">{slotIdx + 1}</span>
                  <div className="char-quick-slot-preview">
                    {w ? (
                      <WeaponPixelPreview weapon={w} />
                    ) : (
                      <span style={{ fontSize: "8px", color: "#3a414e" }}>—</span>
                    )}
                  </div>
                  <span className="char-quick-slot-name">
                    {w ? w.name.split(" ")[0] : (language === "vi" ? "TRỐNG" : "EMPTY")}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="char-hp-container">
            <div className="char-hp-label">
              <span>HP</span>
              <span>{playerState.hp} / {playerState.maxhp}</span>
            </div>
            <div className="char-hp-bar-track">
              <div 
                className="char-hp-bar-fill" 
                style={{ width: `${Math.max(0, Math.min(100, (playerState.hp / playerState.maxhp) * 100))}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header strip */}
          <div className="inv-modal-header">
            <span className="inv-modal-header-title">
              {language === "vi" ? "▶ TÚI ĐỒ / CHỈ SỐ" : "▶ NEURAL GEAR SYSTEM"}
            </span>
            <span className="inv-modal-header-eddies">€$ {fmt(playerState.eddies)}</span>
          </div>

          <div className="cyber-tabs-wrapper">
            <button
              className="cyber-tabs-scroll-btn"
              onClick={() => {
                if (tabsRef.current) {
                  playSynthSfx("hover");
                  tabsRef.current.scrollBy({ left: -100, behavior: "smooth" });
                }
              }}
            >
              ◀
            </button>
            <div className="cyber-tabs" ref={tabsRef}>
              {invTabs.map((tab, idx) => (
                <button
                  key={tab}
                  className={`cyber-tab-btn ${selectedInvTab === idx ? "active" : ""}`}
                  onClick={() => {
                    playSynthSfx("hover");
                    setSelectedInvTab(idx);
                  }}
                >
                  {language === "vi" ? invTabsVi[idx] : tab}
                </button>
              ))}
            </div>
            <button
              className="cyber-tabs-scroll-btn"
              onClick={() => {
                if (tabsRef.current) {
                  playSynthSfx("hover");
                  tabsRef.current.scrollBy({ left: 100, behavior: "smooth" });
                }
              }}
            >
              ▶
            </button>
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            {selectedInvTab === 0 &&
              (() => {
                if (!window.WEAPONS) return null;
                const all = window.WEAPONS;
                const selectedWeapon =
                  all.find((w) => w.id === selectedInvWeaponId) || all[0];
                const isEquippedInSlot = selectedWeapon
                  ? playerState.loadout.indexOf(selectedWeapon.id)
                  : -1;

                const rarColors = {
                  0: "#cfd6e4",
                  1: "#00ff9f",
                  2: "#05d9e8",
                  3: "#bd00ff",
                  4: "#f9f002",
                };

                return (
                  <div className="cyber-grid-layout inv-tab-scroll-container">
                    <div
                      className="cyber-list"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "6px",
                        alignContent: "start",
                      }}
                    >
                      {all.map((w) => {
                        const have = !!playerState.weapons[w.id];
                        const slotIdx = playerState.loadout.indexOf(w.id);
                        return (
                          <div
                            key={w.id}
                            className={`inv-weapon-slot ${selectedInvWeaponId === w.id ? "active" : ""} ${have ? "have" : ""} rar-${w.rar || 0}`}
                            style={{
                              height: "52px",
                              padding: "4px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              position: "relative",
                            }}
                            onClick={() => {
                              playSynthSfx("hover");
                              setSelectedInvWeaponId(w.id);
                            }}
                          >
                            {slotIdx >= 0 && (
                              <span
                                style={{
                                  position: "absolute",
                                  left: "3px",
                                  top: "2px",
                                  color: "var(--cyber-yellow)",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                }}
                              >
                                {slotIdx + 1}
                              </span>
                            )}
                            <div className="inventory-pixel-preview">
                              {have ? (
                                <WeaponPixelPreview weapon={w} />
                              ) : (
                                <span>{w.hidden ? "???" : w.name.split(" ")[0]}</span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: "9px",
                                color: have
                                  ? rarColors[w.rar] || "#fff"
                                  : "#5a6372",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                width: "100%",
                                textAlign: "right",
                              }}
                            >
                              {have
                                ? w.name
                                : w.hidden
                                  ? "???"
                                  : w.name.split(" ")[0]}
                            </span>
                            <span
                              style={{
                                fontSize: "8px",
                                color: "#5a6372",
                                alignSelf: "flex-start",
                              }}
                            >
                              {weaponLabel(w.cls, language)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="cyber-detail-panel"
                      style={{ height: "100%" }}
                    >
                      {selectedWeapon ? (
                        <>
                          <div className="cyber-preview-hero weapon compact">
                            {playerState.weapons[selectedWeapon.id] ? (
                              <WeaponPixelPreview weapon={selectedWeapon} large />
                            ) : (
                              <span>{selectedWeapon.hidden ? "???" : weaponLabel(selectedWeapon.cls, language)}</span>
                            )}
                          </div>
                          <h3 className="cyber-detail-title">
                            {playerState.weapons[selectedWeapon.id]
                              ? selectedWeapon.name
                              : selectedWeapon.hidden
                                ? "???"
                                : selectedWeapon.name}
                          </h3>
                          <div className="cyber-detail-subtitle">
                            {window.RAR_NAME
                              ? window.RAR_NAME[selectedWeapon.rar]
                              : "COMMON"}{" "}
                            · {weaponLabel(selectedWeapon.kind, language)} ·{" "}
                            {weaponLabel(selectedWeapon.cls, language)}
                          </div>

                          {playerState.weapons[selectedWeapon.id] ? (
                            <>
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#cfd6e4",
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span>
                                  DMG:{" "}
                                  {selectedWeapon.dmg *
                                    (selectedWeapon.pellets || 1)}
                                </span>
                                <span>RPS: {selectedWeapon.rof}</span>
                                <span>DPS: {getDps(selectedWeapon)}</span>
                                {selectedWeapon.mag && (
                                  <span>MAG: {selectedWeapon.mag}</span>
                                )}
                              </div>
                              <div className="cyber-description">
                                {selectedWeapon.desc}
                              </div>

                              <div
                                style={{
                                  marginTop: "auto",
                                  borderTop: "1px dashed rgba(255,255,255,0.08)",
                                  paddingTop: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#f9f002",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  {language === "vi"
                                    ? "TRANG BỊ VÀO Ô CHỌN NHANH:"
                                    : "EQUIP TO QUICK SLOT:"}
                                </span>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  {[0, 1, 2].map((slotIdx) => (
                                    <button
                                      key={slotIdx}
                                      className={`cyber-modal-btn ${isEquippedInSlot === slotIdx ? "active" : ""}`}
                                      style={{ flex: 1, padding: "4px" }}
                                      onClick={() => {
                                        playSynthSfx("click");
                                        if (window.assignSlot)
                                          window.assignSlot(
                                            selectedWeapon.id,
                                            slotIdx,
                                          );
                                      }}
                                    >
                                      SLOT {slotIdx + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div
                              className="cyber-description"
                              style={{ color: "#5a6372" }}
                            >
                              {selectedWeapon.iconic
                                ? language === "vi"
                                  ? "RƠI RA TỪ CÁC PHẦN TỬ CYBERPSYCHOS - HÃY ĐI SĂN HỌ"
                                  : "DROPS FROM CYBERPSYCHOS — GO HUNTING"
                                : selectedWeapon.granted
                                  ? language === "vi"
                                    ? "ĐƯỢC CÀI ĐẶT BỞI RIPPERDOC VIK"
                                    : "INSTALLED BY RIPPERDOC VIK"
                                  : language === "vi"
                                    ? "ĐƯỢC BÁN TẠI CỬA HÀNG 2ND AMENDMENT"
                                    : "SOLD AT 2ND AMENDMENT"}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

            {selectedInvTab === 1 &&
              (() => {
                if (!window.CYBER || !window.CYBER_SLOTS) return null;
                const slots = window.CYBER_SLOTS;
                return (
                  <div
                    className="cyber-list inv-tab-scroll-container"
                    style={{ padding: "12px", display: "flex", flexDirection: "column" }}
                  >
                    <div className="inv-cyber-header">
                      {language === "vi"
                        ? "HỆ THỐNG CẤY GHÉP THẦN KINH CHI TIẾT"
                        : "CHROME IMPLANTS SYSTEM DIAGNOSTIC"}
                    </div>
                    <div className="inv-cyber-list-container">
                      {slots.map((slot) => {
                        const items = window.CYBER.filter(
                          (x) => x.slot === slot && playerState.cyber[x.id],
                        );
                        return (
                          <div key={slot} className="inv-cyber-row">
                            <span className="inv-cyber-slot-name">
                              {slot}
                            </span>
                            <span className={`inv-cyber-slot-val ${items.length ? "" : "empty"}`}>
                              {items.length
                                ? items
                                    .map(
                                      (x) =>
                                        `${x.name} MK.${playerState.cyber[x.id]}${x.os ? (playerState.os === x.id ? " [ACTIVE]" : " [OFF]") : ""}`,
                                    )
                                    .join(" · ")
                                : language === "vi"
                                  ? "— TRỐNG —"
                                  : "— EMPTY —"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="inv-cyber-footer">
                      {language === "vi"
                        ? "HÃY TỚI GẶP VIK [KÝ HIỆU R TRÊN BẢN ĐỒ] ĐỂ CÀI ĐẶT / NÂNG CẤP CHROME"
                        : "VISIT VIK [R ON MAP] TO INSTALL AND UPGRADE IMPLANTS"}
                    </div>
                  </div>
                );
              })()}

            {selectedInvTab === 2 &&
              (() => {
                if (!window.CARS) return null;
                const cars = window.CARS;
                const selectedCar =
                  cars.find((c) => c.id === selectedInvCarId) || cars[0];

                return (
                  <div className="cyber-grid-layout inv-tab-scroll-container">
                    <div
                      className="cyber-list"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "6px",
                        alignContent: "start",
                      }}
                    >
                      {cars.map((c) => {
                        const have = !!playerState.cars[c.id];
                        const active = playerState.activeCar === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`cyber-list-item ${selectedInvCarId === c.id ? "active" : ""}`}
                            style={{
                              height: "46px",
                              display: "grid",
                              gridTemplateColumns: "58px 1fr",
                              alignItems: "flex-start",
                              justifyContent: "center",
                              opacity: have ? 1 : 0.5,
                              gap: "6px",
                            }}
                            onClick={() => {
                              playSynthSfx("hover");
                              setSelectedInvCarId(c.id);
                            }}
                          >
                            <CarPixelPreview car={c} />
                            <span className="inventory-car-meta">
                              <span>{c.name}</span>
                              <span
                                style={{
                                  color: active
                                    ? "#00ff9f"
                                    : have
                                      ? "#8a93a6"
                                      : "#5a6372",
                                }}
                              >
                                {active
                                  ? language === "vi"
                                    ? "ĐANG CHẠY"
                                    : "ACTIVE"
                                  : have
                                    ? language === "vi"
                                      ? "TRONG KHO"
                                      : "OWNED"
                                    : language === "vi"
                                      ? "CHƯA MUA"
                                      : "AVAILABLE"}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="cyber-detail-panel"
                      style={{ height: "100%" }}
                    >
                      {selectedCar ? (
                        <>
                          <div className="cyber-preview-hero car compact">
                            <CarPixelPreview car={selectedCar} large />
                          </div>
                          <h3
                            className="cyber-detail-title"
                          >
                            {selectedCar.name}
                          </h3>
                          <div className="cyber-detail-subtitle">
                            {selectedCar.bike ? "MOTORCYCLE" : "CAR"} ·{" "}
                            {selectedCar.shape.toUpperCase()}
                          </div>

                          {playerState.cars[selectedCar.id] ? (
                            <>
                              <div className="inv-car-specs">
                                <span>TOP SPEED: {selectedCar.top} KM/H</span>
                                <span>ACCELERATION: {selectedCar.acc}</span>
                                <span>GRIP STABILITY: {selectedCar.grip}</span>
                                <span>STRUCTURE HEALTH: {selectedCar.hp} HP</span>
                              </div>

                              {playerState.activeCar === selectedCar.id ? (
                                <button
                                  className="cyber-action-btn primary"
                                  disabled
                                  style={{ opacity: 0.5, marginTop: "auto" }}
                                >
                                  {language === "vi"
                                    ? "XE ĐANG DÙNG"
                                    : "ACTIVE RIDE"}
                                </button>
                              ) : (
                                <button
                                  className="cyber-action-btn primary"
                                  style={{ marginTop: "auto" }}
                                  onClick={() => {
                                    playSynthSfx("click");
                                    if (window.setActiveCar)
                                      window.setActiveCar(selectedCar.id);
                                  }}
                                >
                                  {language === "vi"
                                    ? "TRIỆU HỒI XE NÀY"
                                    : "SET AS ACTIVE"}
                                </button>
                              )}
                            </>
                          ) : (
                            <div
                              className="cyber-description"
                              style={{ color: "#5a6372" }}
                            >
                              {language === "vi"
                                ? `CÓ THỂ MUA TẠI PHÂN HỆ NC AUTOFIXER — GIÁ €$${fmt(selectedCar.price)}`
                                : `AVAILABLE AT NC AUTOFIXER FOR €$${fmt(selectedCar.price)}`}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

            {selectedInvTab === 3 && <MapTab language={language} />}

            {selectedInvTab === 4 &&
              (() => {
                const st = playerState.stats || {};
                let worth = playerState.eddies;

                if (typeof window !== "undefined") {
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
                          if (window.CYB[id].tiers[k])
                            worth += window.CYB[id].tiers[k].price;
                        }
                      }
                    }
                  }
                }

                const playMins = Math.floor((st.playT || 0) / 60);

                const statRows = [
                  [
                    language === "vi"
                      ? "TIẾNG TĂM ĐƯỜNG PHỐ"
                      : "STREET CRED CREDIBILITY",
                    `LV ${playerState.lvl} (${playerState.xp} XP)`,
                  ],
                  [
                    language === "vi"
                      ? "TỔNG TÀI SẢN NET WORTH"
                      : "NET WORTH VALUE",
                    `€$${fmt(worth)}`,
                  ],
                  [
                    language === "vi"
                      ? "KẺ ĐỊCH ĐÃ FLATLINED"
                      : "ENEMIES FLATLINED",
                    st.kills || 0,
                  ],
                  [
                    language === "vi"
                      ? "TÊN ĐIÊN CYBERPSYCHO"
                      : "CYBERPSYCHOS DOWNDED",
                    `${st.psychos || 0}/${window.ICONICS ? window.ICONICS.length : 8}`,
                  ],
                  [
                    language === "vi"
                      ? "HỢP ĐỒNG SĂN TIỀN THƯỞNG"
                      : "BOUNTIES CLEARED",
                    st.bounties || 0,
                  ],
                  [
                    language === "vi"
                      ? "HÒM THẢ AIRDROP SECURED"
                      : "AIRDROPS SECURED",
                    st.airdrops || 0,
                  ],
                  [
                    language === "vi"
                      ? "HÒM HÀNG CRATES CRACKED"
                      : "CRATES CRACKED",
                    st.crates || 0,
                  ],
                  [
                    language === "vi" ? "QUÃNG ĐƯỜNG ĐI LẠI" : "DISTANCE ROAMED",
                    `${((st.dist || 0) / 1000).toFixed(1)} KM`,
                  ],
                  [
                    language === "vi"
                      ? "THỜI GIAN TRONG NIGHT CITY"
                      : "TIME IN NIGHT CITY",
                    `${playMins} MIN`,
                  ],
                  [
                    language === "vi" ? "BĂNG ĐẢNG HIỆN TẠI" : "PLAYER faction",
                    playerState.gang
                      ? getGangLabel(playerState.gang)
                      : language === "vi"
                        ? "CHƯA CÓ"
                        : "NONE",
                  ],
                ];

                return (
                  <div
                    className="cyber-list inv-tab-scroll-container"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0",
                      overflowY: "auto",
                    }}
                  >
                    {statRows.map(([lbl, val]) => (
                      <div key={lbl} className="inv-pixel-stat-row">
                        <span className="inv-pixel-stat-label">{lbl}</span>
                        <span className="inv-pixel-stat-value">{val}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: "auto",
                        textAlign: "center",
                        fontFamily: "var(--font-pixel-mono)",
                        fontSize: "8px",
                        color: "#2a3848",
                        paddingTop: "12px",
                        letterSpacing: "1px",
                      }}
                    >
                      &ldquo;{language === "vi" ? "SAI THÀNH PHỐ, SAI KẺ." : "WRONG CITY, WRONG PEOPLE."}&rdquo;
                    </div>
                  </div>
                );
              })()}

            {selectedInvTab === 5 &&
              (() => {
                const ranking = getRepRanking();
                return (
                  <div
                    className="rep-ranking-container inv-tab-scroll-container"
                    style={{
                      padding: "8px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "8px",
                        color: "var(--cyber-cyan)",
                        fontWeight: "bold",
                        marginBottom: "6px",
                        borderBottom: "2px solid rgba(5, 217, 232, 0.3)",
                        paddingBottom: "5px",
                        display: "grid",
                        gridTemplateColumns: "36px 1fr 52px 1fr",
                        fontFamily: "var(--font-pixel), monospace",
                        letterSpacing: "1px",
                      }}
                    >
                      <span>#</span>
                      <span>{language === "vi" ? "DANH HIỆU" : "OPERATIVE"}</span>
                      <span style={{ textAlign: "center" }}>LV</span>
                      <span style={{ textAlign: "right" }}>{language === "vi" ? "TRẠNG THÁI" : "STATUS"}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {ranking.map((row, idx) => {
                        const rankNum = idx + 1;
                        const isTop3 = rankNum <= 3;
                        const badgeCol = rankNum === 1 ? "#f9f002" : rankNum === 2 ? "#cfd6e4" : rankNum === 3 ? "#d87d4a" : "#3a414e";
                        return (
                          <div
                            key={row.id}
                            className={`rep-ranking-row ${row.isPlayer ? "player-row" : ""}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "36px 1fr 52px 1fr",
                              alignItems: "center",
                              fontSize: "9px",
                              padding: "5px 8px",
                              background: row.isPlayer ? "rgba(5, 217, 232, 0.12)" : "rgba(0,0,0,0.4)",
                              border: row.isPlayer ? "2px solid var(--cyber-cyan)" : "2px solid #1c2540",
                              color: row.isPlayer ? "#fff" : "#cfd6e4",
                              boxShadow: row.isPlayer ? "2px 2px 0 #000, 0 0 8px rgba(5, 217, 232, 0.2)" : "2px 2px 0 #000",
                              fontFamily: "var(--font-pixel-mono), monospace",
                            }}
                          >
                            <span 
                              style={{ 
                                color: badgeCol, 
                                fontWeight: "bold",
                                textShadow: isTop3 ? `0 0 4px ${badgeCol}` : "none" 
                              }}
                            >
                              #{rankNum}
                            </span>
                            <span style={{ color: row.isPlayer ? "#fff" : row.color, fontWeight: row.isPlayer ? "bold" : "normal" }}>
                              {row.name}
                            </span>
                            <span style={{ textAlign: "center", color: row.isPlayer ? "var(--cyber-yellow)" : "#cfd6e4" }}>
                              {row.lvl}
                            </span>
                            <span style={{ textAlign: "right", fontSize: "9px", color: row.isPlayer ? "var(--cyber-cyan)" : "#8a93a6" }}>
                              {row.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {selectedInvTab === 6 && (
              <div className="inv-tab-scroll-container" style={{ overflowY: "auto" }}>
                {renderGangMenu()}
              </div>
            )}

            {selectedInvTab === 7 && (
              <div className="inv-tab-scroll-container" style={{ overflowY: "auto", padding: "4px" }}>
                {renderSettingsTab()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={`game-shell ${isJackedIn ? "jacked-in" : ""} ${forcedLandscape ? "forced-landscape" : ""}`}>
      {/* Animated 3DPerspective Cyber-Grid Background */}
      {!PERFORMANCE_MODE && <div className="cyber-grid-bg" />}

      {/* HUD Panels (Top Left / Right) */}
      {!PERFORMANCE_MODE && (
        <div
          className={`cloud-panel ${cloudPanelVisible ? "visible" : ""}`}
          data-status={status}
        >
          <span className="cloud-dot" />
          <span className="cyber-status-text">{message}</span>
        </div>
      )}
      {!PERFORMANCE_MODE && isJackedIn && playerState.state !== 'title' && (
        <PixelUserHud
          account={activeAccount}
          player={playerState}
          playerName={playerName}
          language={language}
          message={message}
          token={accountToken}
        />
      )}
      {!PERFORMANCE_MODE && isJackedIn && playerState.state !== 'title' && <PixelWeaponHud player={playerState} />}
      {!PERFORMANCE_MODE && isJackedIn && playerState.state !== 'title' && (
        <PixelMiniMapHud
          onOpenMap={() => {
            playSynthSfx("click");
            if (typeof window !== "undefined" && window.G) {
              window.G.ui = "map";
              if (window.SFX && window.SFX.ui) window.SFX.ui();
            }
            setActiveUi("map");
          }}
        />
      )}
      {!PERFORMANCE_MODE && isJackedIn && playerState.state === 'play' && (
        <MobileTouchControls player={playerState} playSynthSfx={playSynthSfx} />
      )}
      {!PERFORMANCE_MODE && isJackedIn && playerState.state === 'dead' && (
        <PixelDeadOverlay player={playerState} language={language} />
      )}
      {/* Top Center Controls Removed */}

      {activeUi && (
        <div className="cyber-modal-overlay" onClick={closeModal}>
          <div
            className={`cyber-modal-container ${activeUi === "inv" ? "inv-modal theme-" + (playerState.invTheme || "grey") : ""} ${activeUi === "map" ? "large-map-modal" : ""} ${isWideUi(activeUi) ? "wide" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cyber-modal-header">
              <h2>{getModalTitle(activeUi, language)}</h2>
              <button className="cyber-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="cyber-modal-body">
              {renderModalContent(activeUi)}
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Container with CRT scanning lines filter */}
      {useMemo(() => (
        <div className={`canvas-wrapper ${crtActive ? "crt-active" : ""}`}>
          <canvas id="cv" width="640" height="360" />
        </div>
      ), [crtActive])}

      {/* Premium JSX Notification Banner */}
      {!PERFORMANCE_MODE && jsxBanner && (
        <div className="jsx-banner-alert" style={{ "--banner-col": jsxBanner.col }}>
          <div className="banner-alert-hazard-line"></div>
          <div className="banner-alert-content">
            <span className="banner-alert-warning-icon">⚠</span>
            <div className="banner-alert-text-block">
              <h2 className="banner-alert-title">{jsxBanner.text}</h2>
              {jsxBanner.sub && <p className="banner-alert-subtitle">{jsxBanner.sub}</p>}
            </div>
          </div>
          <div className="banner-alert-hazard-line"></div>
        </div>
      )}

      {/* Premium JSX Messages Logs Overlay */}
      {!PERFORMANCE_MODE && jsxMsgs && jsxMsgs.length > 0 && (
        <div className="jsx-msgs-container">
          {jsxMsgs.slice(-5).map((m, idx) => (
            <div key={idx} className="jsx-msg-item" style={{ "--msg-col": m.col, opacity: Math.min(1, m.t) }}>
              <span className="msg-bullet"></span>
              <span className="msg-text">{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Netrunner Sidebar Database Panel */}
      {!PERFORMANCE_MODE && isJackedIn && (
        <div className={`cyber-sidebar ${sidebarOpen ? "open" : ""}`}>
          <button
            className="sidebar-toggle-btn"
            onClick={() => {
              playSynthSfx("click");
              setSidebarOpen(!sidebarOpen);
            }}
          >
            {sidebarOpen
              ? language === "vi"
                ? "◀ NGẮT KẾT NỐI"
                : "◀ DISCONNECT"
              : language === "vi"
                ? "▶ CSDL NETRUNNER"
                : "▶ NETRUNNER DB"}
          </button>
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h2>
                {language === "vi"
                  ? "TRUY CẬP THIẾT BỊ MẠNG"
                  : "CYBER DECK ACCESS"}
              </h2>
              <div className="deck-serial">
                {language === "vi"
                  ? "SỐ SÊ-RI: NCPX-2077_V2"
                  : "SERIAL NO: NCPX-2077_V2"}
              </div>
            </div>

            <div className="sidebar-tabs">
              <button
                className={sidebarTab === "lore" ? "active" : ""}
                onClick={() => {
                  playSynthSfx("hover");
                  setSidebarTab("lore");
                }}
              >
                {language === "vi" ? "CƠ SỞ DỮ LIỆU" : "DATABASE"}
              </button>
              <button
                className={sidebarTab === "controls" ? "active" : ""}
                onClick={() => {
                  playSynthSfx("hover");
                  setSidebarTab("controls");
                }}
              >
                {language === "vi" ? "GIAO DIỆN" : "INTERFACE"}
              </button>
              <button
                className={sidebarTab === "system" ? "active" : ""}
                onClick={() => {
                  playSynthSfx("hover");
                  setSidebarTab("system");
                }}
              >
                {language === "vi" ? "HỆ THỐNG" : "SYSTEM"}
              </button>
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
          <div className={`cyber-splash-container ${
            bootStage === "char-create" || needsCharacter ? "wide-char" : 
            bootStage === "slot" ? "wide-login" : ""
          }`}>
            {/* Hologram/Branding Header */}
            <div className="cyber-splash-header">
              <div className="cyber-logo-glitch" data-text="NIGHT CITY">
                NIGHT CITY
              </div>
              <div className="cyber-logo-sub">
                {language === "vi"
                  ? "GIAO DIỆN LIÊN KẾT THẦN KINH v2077"
                  : "NEURAL LINK INTERFACE v2077"}
              </div>
            </div>

            {/* Stage: Loading */}
            {bootStage === "loading" && (
              <>
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
                    <div className="cyber-progress-percentage">
                      {loadingProgress}%
                    </div>
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
                        ? language === "vi"
                          ? "HOẠT ĐỘNG"
                          : "ONLINE"
                        : language === "vi"
                          ? "ĐANG KHỞI ĐỘNG"
                          : "BOOTING"}
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

                <div className="cyber-action-panel">
                  {!authReady ? (
                    <div className="cyber-boot-loader-msg">
                      <span className="blinking-dot"></span>
                      {language === "vi"
                        ? "ĐANG XÁC THỰC TÀI KHOẢN..."
                        : "AUTHENTICATING ACCOUNT..."}
                    </div>
                  ) : !activeAccount ? (
                    <div className="cyber-boot-loader-msg">
                      <span className="blinking-dot"></span>
                      {language === "vi"
                        ? "KHÔNG CÓ TÀI KHOẢN ĐĂNG NHẬP..."
                        : "NO ACCOUNT LOGGED IN..."}
                    </div>
                  ) : showJackButton ? (
                    <button
                      className="jack-in-premium-btn"
                      onClick={() => {
                        playSynthSfx("click");
                        setBootStage("title");
                      }}
                      onMouseEnter={() => playSynthSfx("hover")}
                    >
                      <span className="btn-glitch-layer"></span>
                      <span className="btn-content">
                        {language === "vi" ? "BẮT ĐẦU // ENTER MATRIX" : "START // ENTER MATRIX"}
                      </span>
                    </button>
                  ) : (
                    <div className="cyber-boot-loader-msg">
                      <span className="blinking-dot"></span>
                      {language === "vi"
                        ? "ĐANG ĐỒNG BỘ CÁC THIẾT BỊ CẤY GHÉP... VUI LÒNG CHỜ"
                        : "SYNCHRONIZING IMPLANTS... PLEASE WAIT"}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Stage: Title Screen */}
            {bootStage === "title" && (
              <div
                className="retro-arcade-title-screen"
                onClick={() => {
                  playSynthSfx("click");
                  setBootStage("menu");
                }}
              >
                <div className="cabinet-marquee">
                  <span className="marquee-star">★</span>
                  <span className="marquee-text">{language === "vi" ? "NHẤN ĐỂ CHƠI" : "INSERT COIN"}</span>
                  <span className="marquee-star">★</span>
                </div>
                <div className="retro-press-start blinking">
                  {language === "vi" ? "NHẤN ENTER ĐỂ BẮT ĐẦU" : "PRESS ENTER TO START"}
                </div>
                <div className="retro-click-hint">
                  {language === "vi" ? "(HOẶC NHẤP CHUỘT VÀO ĐÂY)" : "(OR CLICK HERE)"}
                </div>
              </div>
            )}

            {/* Stage: Main Menu */}
            {bootStage === "menu" && (
              <div className="retro-arcade-menu">
                <div className="retro-menu-list">
                  <div
                    className={`retro-menu-item ${selectedMenuIdx === 0 ? "active" : ""} ${!getHasSavedCharacter() ? "disabled" : ""}`}
                    onClick={() => {
                      if (getHasSavedCharacter()) triggerMenuAction(0);
                    }}
                    onMouseEnter={() => {
                      if (getHasSavedCharacter()) {
                        playSynthSfx("hover");
                        setSelectedMenuIdx(0);
                      }
                    }}
                  >
                    <span className="menu-arrow">{selectedMenuIdx === 0 ? "> " : "  "}</span>
                    {language === "vi" ? "TIẾP TỤC" : "CONTINUE"}
                  </div>

                  <div
                    className={`retro-menu-item ${selectedMenuIdx === 1 ? "active" : ""}`}
                    onClick={() => triggerMenuAction(1)}
                    onMouseEnter={() => {
                      playSynthSfx("hover");
                      setSelectedMenuIdx(1);
                    }}
                  >
                    <span className="menu-arrow">{selectedMenuIdx === 1 ? "> " : "  "}</span>
                    {language === "vi" ? "TRÒ CHƠI MỚI" : "NEW GAME"}
                  </div>

                  <div
                    className={`retro-menu-item ${selectedMenuIdx === 2 ? "active" : ""}`}
                    onClick={() => triggerMenuAction(2)}
                    onMouseEnter={() => {
                      playSynthSfx("hover");
                      setSelectedMenuIdx(2);
                    }}
                  >
                    <span className="menu-arrow">{selectedMenuIdx === 2 ? "> " : "  "}</span>
                    {language === "vi" ? "CHỌN SLOT TÀI KHOẢN" : "CHOOSE SLOT"}
                  </div>

                  <div
                    className={`retro-menu-item ${selectedMenuIdx === 3 ? "active" : ""}`}
                    onClick={() => triggerMenuAction(3)}
                    onMouseEnter={() => {
                      playSynthSfx("hover");
                      setSelectedMenuIdx(3);
                    }}
                  >
                    <span className="menu-arrow">{selectedMenuIdx === 3 ? "> " : "  "}</span>
                    {language === "vi" ? "HƯỚNG DẪN" : "INSTRUCTIONS"}
                  </div>
                </div>
              </div>
            )}

            {/* Stage: Character Creation */}
            {(bootStage === "char-create" || needsCharacter) && (
              <div className="retro-slot-panel character-create-panel wide">
                <div className="retro-panel-title">
                  {language === "vi" ? "THIẾT LẬP THẦN KINH V2077" : "NEURAL CONFIGURATION V2077"}
                </div>

                <div className="character-create-columns">
                  {/* Left Column: Holographic Bios Pod */}
                  <div className="char-bios-pod">
                    <div className="pod-header">
                      <span className="pod-pulse-dot"></span>
                      <span>{language === "vi" ? "THIẾT BỊ CẤY GHÉP HOẠT ĐỘNG" : "BIOPOD ACTIVATED"}</span>
                    </div>

                    <div className="pod-preview-wrapper">
                      <div className="pod-grid-bg"></div>
                      <div className="pod-scanline"></div>
                      <BootCharacterPreview gender={characterGender} active={true} />
                    </div>

                    <div className="pod-stats-panel">
                      <div className="pod-stat-title">{language === "vi" ? "CHỈ SỐ TIỀM NĂNG" : "COGNITIVE ATTRIBUTES"}</div>
                      {(() => {
                        const lpStats = {
                          nomad: { ref: 8, bdy: 7, int: 5, tec: 8, col: 6 },
                          streetkid: { ref: 7, bdy: 6, int: 7, tec: 5, col: 9 },
                          corpo: { ref: 6, bdy: 5, int: 9, tec: 7, col: 7 }
                        }[characterLifepath] || { ref: 7, bdy: 6, int: 7, tec: 5, col: 9 };
                        
                        const statsLabels = [
                          { key: "ref", label: language === "vi" ? "PHẢN XẠ / REF" : "REFLEXES" },
                          { key: "bdy", label: language === "vi" ? "THỂ CHẤT / BDY" : "BODY" },
                          { key: "int", label: language === "vi" ? "TRÍ TUỆ / INT" : "INTELLIGENCE" },
                          { key: "tec", label: language === "vi" ? "KỸ THUẬT / TEC" : "TECHNICAL" },
                          { key: "col", label: language === "vi" ? "BẢN LĨNH / COL" : "COOL" }
                        ];
                        
                        return statsLabels.map(s => (
                          <div key={s.key} className="pod-stat-row">
                            <span className="stat-label">{s.label}</span>
                            <div className="stat-bar-track">
                              <div className="stat-bar-fill" style={{ width: `${lpStats[s.key] * 10}%` }}></div>
                            </div>
                            <span className="stat-val">{lpStats[s.key]}/10</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Configuration Details */}
                  <div className="char-config-details">
                    <div className="config-section">
                      <label className="config-section-label">
                        {language === "vi" ? "1. GIỚI TÍNH SINH HỌC:" : "1. BIOLOGICAL GENDER:"}
                      </label>
                      <div className="character-gender-row">
                        <div
                          className={`character-gender-btn ${characterGender === "m" ? "active" : ""}`}
                          onClick={() => {
                            setCharacterGender("m");
                            playSynthSfx("hover");
                          }}
                        >
                          {language === "vi" ? "MALE V / NAM V" : "MALE V"}
                        </div>
                        <div
                          className={`character-gender-btn ${characterGender === "f" ? "active" : ""}`}
                          onClick={() => {
                            setCharacterGender("f");
                            playSynthSfx("hover");
                          }}
                        >
                          {language === "vi" ? "FEMALE V / NỮ V" : "FEMALE V"}
                        </div>
                      </div>
                    </div>

                    <div className="config-section">
                      <label className="config-section-label">
                        {language === "vi" ? "2. LỰA CHỌN XUẤT THÂN:" : "2. SELECT LIFEPATH:"}
                      </label>
                      <div className="lifepath-selector-row">
                        {["nomad", "streetkid", "corpo"].map(lp => (
                          <div
                            key={lp}
                            className={`lifepath-card ${characterLifepath === lp ? "active" : ""}`}
                            onClick={() => {
                              setCharacterLifepath(lp);
                              playSynthSfx("hover");
                            }}
                            onMouseEnter={() => setLifepathHovered(lp)}
                          >
                            <span className="lp-dot"></span>
                            <span className="lp-name">{lp.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="lifepath-desc-box">
                        <div className="lp-desc-title">{lifepathHovered.toUpperCase()}</div>
                        <div className="lp-desc-text">
                          {lifepathHovered === "nomad" ? 
                            (language === "vi" ? "Lớn lên ở Badlands, lục lọi bãi phế thải và cướp kho xăng. Tự do và tự lập là tất cả trong vùng hoang dã." : "Grew up in the Badlands, scavenging dumps and raiding fuel depots. Freedom and self-reliance are everything in the wastes.") :
                           lifepathHovered === "streetkid" ?
                            (language === "vi" ? "Muốn hiểu đường phố thì phải sống ở đó. Băng đảng và fixers là gia đình của bạn. Bạn thuộc lòng mọi ngóc ngách Night City." : "They say if you want to understand the streets, you gotta live 'em. Gangs and fixers are your family. You know every dark corner of Night City.") :
                            (language === "vi" ? "Ít ai rời khỏi giới tập đoàn với linh hồn nguyên vẹn. Bạn đã bước qua các sảnh Arasaka, dùng bí mật bẩn thỉu để thăng tiến." : "Few leave the corporate world with their souls intact. You've walked the high-stress halls of Arasaka, using dirty secrets to climb the corporate ladder.")
                          }
                        </div>
                      </div>
                    </div>

                    <div className="config-section">
                      <div className="retro-codename-container">
                        <label className="retro-codename-label">
                          {language === "vi" ? "3. MẬT DANH NEURAL:" : "3. NEURAL CODENAME:"}
                        </label>
                        <input
                          className="retro-codename-input"
                          value={characterNameDraft}
                          maxLength={18}
                          onChange={(e) => setCharacterNameDraft(e.target.value)}
                          placeholder="V"
                          readOnly={forcedLandscape || (typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent))}
                          autoFocus
                        />
                      </div>

                      {/* Virtual Cyber Arcade Keyboard */}
                      <div className="retro-keyboard">
                        {[
                          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                          ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
                          ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
                          ["Z", "X", "C", "V", "B", "N", "M", "SPACE", "DEL"]
                        ].map((row, rIdx) => (
                          <div key={rIdx} className="retro-keyboard-row">
                            {row.map((key) => (
                              <button
                                key={key}
                                type="button"
                                className={`retro-keyboard-key ${key === "SPACE" ? "space-key" : ""} ${key === "DEL" ? "del-key" : ""}`}
                                onClick={() => handleVirtualKey(key)}
                              >
                                {key === "SPACE" ? (language === "vi" ? "KHOẢNG TRẮNG" : "SPACE") : key}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="retro-char-actions">
                      <button
                        className="retro-arcade-btn primary"
                        onClick={handleCreateCharacter}
                      >
                        {language === "vi" ? "BẮT ĐẦU NHIỆM VỤ" : "START MISSION"}
                      </button>
                      <button
                        className="retro-arcade-btn secondary"
                        onClick={() => {
                          playSynthSfx("click");
                          setNeedsCharacter(false);
                          setBootStage("menu");
                        }}
                      >
                        {language === "vi" ? "QUAY LẠI" : "BACK"}
                      </button>
                    </div>

                    <div className="retro-status-msg">
                      {language === "vi"
                        ? "CHỈ KHỞI TẠO MỘT LẦN CHO SLOT NÀY"
                        : "CREATED ONCE FOR THIS SLOT"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stage: Choose Slot (Accounts) */}
            {bootStage === "slot" && (
              <div className="retro-slot-panel login-portal-panel">
                <div className="retro-panel-title">
                  {language === "vi" ? "CỔNG XÁC THỰC THẦN KINH" : "NEURAL SECURITY GATEWAY"}
                </div>

                <div className="login-portal-columns">
                  {/* Left Column: Register */}
                  <div className="login-column">
                    <div className="login-column-header">
                      <span className="column-icon">⚡</span>
                      <span>{language === "vi" ? "ĐĂNG KÝ TÂN MERCS" : "NEW REGISTRATION"}</span>
                    </div>

                    <div className="retro-input-group">
                      <label>{language === "vi" ? "TÊN TÀI KHOẢN:" : "ACCOUNT NAME:"}</label>
                      <input
                        className="retro-codename-input"
                        value={accountNameDraft}
                        maxLength={18}
                        onChange={(e) => setAccountNameDraft(e.target.value)}
                        placeholder={language === "vi" ? "NHẬP TÊN" : "ENTER NAME"}
                        readOnly={forcedLandscape || (typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent))}
                      />

                      {/* Virtual Cyber Arcade Keyboard */}
                      <div className="retro-keyboard">
                        {[
                          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                          ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
                          ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
                          ["Z", "X", "C", "V", "B", "N", "M", "SPACE", "DEL"]
                        ].map((row, rIdx) => (
                          <div key={rIdx} className="retro-keyboard-row">
                            {row.map((key) => (
                              <button
                                key={key}
                                type="button"
                                className={`retro-keyboard-key ${key === "SPACE" ? "space-key" : ""} ${key === "DEL" ? "del-key" : ""}`}
                                onClick={() => handleVirtualKey(key, "login")}
                              >
                                {key === "SPACE" ? (language === "vi" ? "KHOẢNG TRẮNG" : "SPACE") : key}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="retro-button-group">
                      <button
                        className="retro-arcade-btn primary"
                        disabled={authBusy}
                        onClick={handleQuickAccount}
                      >
                        {authBusy
                          ? language === "vi"
                            ? "ĐANG TẠO..."
                            : "CREATING..."
                          : language === "vi"
                            ? "ĐĂNG NHẬP NHANH"
                            : "QUICK SIGN IN"}
                      </button>

                      <button
                        className="retro-arcade-btn google"
                        disabled={authBusy}
                        onClick={handleGoogleAccount}
                      >
                        {authBusy
                          ? language === "vi"
                            ? "ĐANG KẾT NỐI..."
                            : "CONNECTING..."
                          : language === "vi"
                            ? "ĐĂNG NHẬP GOOGLE"
                            : "SIGN IN WITH GOOGLE"}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Code Recovery */}
                  <div className="login-column">
                    <div className="login-column-header">
                      <span className="column-icon">🔑</span>
                      <span>{language === "vi" ? "MÃ TRUY CẬP PHỤC HỒI" : "RECOVERY CODE ACCESS"}</span>
                    </div>

                    <div className="retro-input-group">
                      <label>{language === "vi" ? "MÃ TOKEN (ACCOUNT:TOKEN):" : "TOKEN CODE (ACCOUNT:TOKEN):"}</label>
                      <input
                        className="retro-codename-input token-input"
                        value={loginCodeDraft}
                        onChange={(e) => setLoginCodeDraft(e.target.value)}
                        placeholder="acct_xxx:ncp_xxx"
                      />
                    </div>

                    <button
                      className="retro-arcade-btn secondary"
                      disabled={authBusy}
                      onClick={handleLoginCode}
                    >
                      {language === "vi" ? "XÁC THỰC MÃ CODE" : "SIGN IN WITH CODE"}
                    </button>
                  </div>
                </div>

                <div className="login-status-footer">
                  <div className="terminal-status-logs">
                    <div className="log-line">
                      <span className="log-cyan">[SYS]</span> {language === "vi" ? "KHỞI ĐỘNG LIÊN KẾT... OK" : "LINK STARTING... OK"}
                    </div>
                    <div className="log-line">
                      <span className="log-magenta">[SEC]</span> {language === "vi" ? "BẢO MẬT MATRIX: CHÂN THỰC 100%" : "MATRIX AUTH: 100% SECURE"}
                    </div>
                    {authMessage && (
                      <div className="log-line log-yellow">
                        <span className="log-yellow">[FDB]</span> {authMessage}
                      </div>
                    )}
                  </div>

                  <div className="login-actions-row">
                    {activeAccount && (
                      <button
                        className="retro-arcade-btn cancel-btn"
                        onClick={() => {
                          playSynthSfx("click");
                          setBootStage("menu");
                        }}
                      >
                        {language === "vi" ? "QUAY LẠI MENU" : "BACK TO MENU"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {status !== "ready" && status !== "synced" && status !== "booting" ? (
            <div className="boot-message">{message}</div>
          ) : null}
        </div>
      )}

      {showInstructions && (
        <div className="retro-modal-overlay">
          <div className="retro-modal-container">
            <div className="retro-modal-header">
              <h2>{language === "vi" ? "HƯỚNG DẪN ĐIỀU KHIỂN" : "GAME CONTROLS"}</h2>
              <button className="retro-close-btn" onClick={() => { playSynthSfx("click"); setShowInstructions(false); }}>X</button>
            </div>
            <div className="retro-modal-content">
              {renderControls()}
            </div>
            <button className="retro-modal-action-btn" onClick={() => { playSynthSfx("click"); setShowInstructions(false); }}>
              {language === "vi" ? "ĐÃ HIỂU" : "OK"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function setupRealtimeBridge(getStore) {
  if (typeof window === "undefined" || window.NCPX_NET) return;
  const cleanRoom = (value) =>
    String(value || "default")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40) || "default";
  const realtimeRoom = () => {
    let fromUrl = "";
    try {
      fromUrl = new URLSearchParams(window.location.search).get("room") || "";
    } catch (error) {}
    let fromStorage = "";
    try {
      fromStorage = localStorage.getItem("ncpx_realtime_room") || "";
    } catch (error) {}
    return cleanRoom(
      fromUrl ||
        window.NCPX_REALTIME_ROOM ||
        fromStorage ||
        "nightcity",
    );
  };
  const net = {
    id: null,
    hostId: null,
    isHost: false,
    ws: null,
    room: realtimeRoom(),
    players: [],
    playerCache: new Map(),
    invites: [],
    requests: [],
    events: [],
    dropEvents: [],
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
      net.ws.send(
        JSON.stringify({ type: "hit", to: playerId, ...(payload || {}) }),
      );
    },
    combatFx(payload) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !payload?.kind)
        return;
      net.ws.send(JSON.stringify({ type: "combatFx", ...(payload || {}) }));
    },
    playerDrop(payload) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !payload?.drops?.length)
        return;
      net.ws.send(JSON.stringify({ type: "playerDrop", ...(payload || {}) }));
    },
    sendNpcState(snapshot) {
      if (
        !net.isHost ||
        !net.ws ||
        net.ws.readyState !== WebSocket.OPEN ||
        !snapshot
      )
        return;
      net.ws.send(JSON.stringify({ type: "npcState", ...snapshot }));
    },
    npcHit(payload) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !payload?.enemyId)
        return;
      net.ws.send(JSON.stringify({ type: "npcHit", ...payload }));
    },
    invite(playerId, profile) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(
        JSON.stringify({ type: "invite", to: playerId, ...(profile || {}) }),
      );
    },
    requestJoin(playerId, profile) {
      if (!net.ws || net.ws.readyState !== WebSocket.OPEN || !playerId) return;
      net.ws.send(
        JSON.stringify({
          type: "joinRequest",
          to: playerId,
          ...(profile || {}),
        }),
      );
    },
    takeEvents() {
      const out = net.events;
      net.events = [];
      return out;
    },
    takeDropEvents() {
      const out = net.dropEvents;
      net.dropEvents = [];
      return out;
    },
    takeNpcEvents() {
      const out = net.npcEvents;
      net.npcEvents = [];
      return out;
    },
    switchRoom(room) {
      const next = cleanRoom(room || "nightcity");
      if (next === net.room) return;
      net.room = next;
      try {
        localStorage.setItem("ncpx_realtime_room", next);
      } catch (error) {}
      if (net.ws) {
        net.closed = true;
        try {
          net.ws.close();
        } catch (error) {}
      }
      net.closed = false;
      net.players = [];
      net.playerCache.clear();
      net.invites = [];
      net.requests = [];
      connect();
    },
  };
  window.NCPX_NET = net;

  const connect = () => {
    if (net.closed) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    net.room = realtimeRoom();
    const ws = new WebSocket(
      `${proto}://${window.location.host}/ws?room=${encodeURIComponent(net.room)}`,
    );
    net.ws = ws;
    ws.onopen = () => {
      net.connected = true;
      net.retry = 0;
    };
    ws.onmessage = (event) => {
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
        const seenAt =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        net.hostId = msg.hostId || net.hostId;
        net.isHost = !!net.hostId && net.hostId === net.id;
        const liveIds = new Set();
        for (const p of msg.players || []) {
          if (!p || p.id === net.id) continue;
          liveIds.add(p.id);
          net.playerCache.set(p.id, { ...p, _seenAt: seenAt });
        }
        for (const id of net.playerCache.keys()) {
          if (!liveIds.has(id)) net.playerCache.delete(id);
        }
        const keepMs = net.connected ? 20000 : 45000;
        net.players = [...net.playerCache.values()].filter((p) => {
          if (seenAt - (p._seenAt || 0) <= keepMs) return true;
          net.playerCache.delete(p.id);
          return false;
        });
      }
      if (msg.type === "invite")
        net.invites = [
          msg,
          ...net.invites.filter((inv) => inv.from !== msg.from),
        ].slice(0, 4);
      if (msg.type === "joinRequest")
        net.requests = [
          msg,
          ...net.requests.filter((req) => req.from !== msg.from),
        ].slice(0, 4);
      if (msg.type === "damage" || msg.type === "combatFx")
        net.events = [msg, ...net.events].slice(0, 24);
      if (msg.type === "playerDrop")
        net.dropEvents = [msg, ...net.dropEvents].slice(0, 12);
      if (msg.type === "npcState") net.npcState = msg;
      if (msg.type === "npcHit")
        net.npcEvents = [msg, ...net.npcEvents].slice(0, 24);
      // Immediate host promotion: server notifies new host directly so gang AI resumes instantly
      if (msg.type === "hostChanged") {
        net.hostId = msg.hostId || net.hostId;
        net.isHost = !!msg.isHost;
      }
    };
    ws.onclose = () => {
      net.connected = false;
      net.players = [];
      net.playerCache.clear();
      net.hostId = null;
      net.isHost = false;
      net.npcState = null;
      if (!net.closed) {
        const delay = Math.min(3000, 350 + net.retry * 450);
        net.retry++;
        setTimeout(connect, delay);
      }
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch (error) {}
    };
  };
  connect();
}
