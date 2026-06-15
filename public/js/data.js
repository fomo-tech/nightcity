'use strict';
// ============ Static game data: weapons / cars / cyberware / districts ============
const TILE = 16;
let VIEW_W = 640, VIEW_H = 360;

const NEON = ['#ff2a6d', '#05d9e8', '#f9f002', '#bd00ff', '#00ff9f', '#ff9f1c'];
const RAR_NAME = ['THƯỜNG', 'KHÁ', 'HIẾM', 'SỬ THI', 'HUYỀN THOẠI', 'BIỂU TƯỢNG'];
const RAR_COL  = ['#9aa0a6', '#2ecc71', '#3da9fc', '#bd00ff', '#ff9f1c', '#f9f002'];
const KIND_COL = { power: '#ff9f1c', tech: '#05d9e8', smart: '#ff2a6d', melee: '#cfd6e4' };
const MELEE_CLS = { blade: 1, blunt: 1, mantis: 1, gorilla: 1, wire: 1 };

// dmg=per bullet/pellet, rof=shots per sec, spd=bullet px/s, spread=degrees
// melee: range px, arc degrees. pierce=walls&bodies passed. kb=knockback px/s
const WEAPONS = [
  // ---- pistols / revolvers ----
  { id:'liberty',    name:'CT-9M LIBERTY',      cls:'pistol',  kind:'power', rar:0, dmg:9,  rof:4.5, mag:12, rel:0.9, spd:380, spread:5,  price:0,     lvl:1,  desc:'SÚNG LỤC TIÊU CHUẨN. LÍNH ĐÁNH THUÊ NÀO CŨNG PHẢI BẮT ĐẦU TỪ ĐÂU ĐÓ.' },
  { id:'lexington',  name:'M-10AF LEXINGTON',   cls:'pistol',  kind:'power', rar:0, dmg:7,  rof:7,   mag:18, rel:0.9, spd:380, spread:6,  price:450,   lvl:1,  desc:'RẺ, NHANH, DỄ KIẾM. MÓN ĐỒ ĐẶC SẢN ĐƯỜNG PHỐ.' },
  { id:'unity',      name:'UNITY',              cls:'pistol',  kind:'power', rar:1, dmg:10, rof:5.5, mag:14, rel:0.9, spd:400, spread:5,  price:900,   lvl:2,  desc:'MÓN TỦ CỦA DÂN DU MỤC. BỀN VÀ ÍT KẸT ĐẠN.' },
  { id:'nue',        name:'HJKE-11 NUE',        cls:'pistol',  kind:'power', rar:2, dmg:17, rof:3.6, mag:10, rel:1.0, spd:440, spread:4,  price:2600,  lvl:5,  desc:'SÚNG NGẮN KIỂU CORPO. GỌN GÀNG VÀ RẤT ĐAU.' },
  { id:'omaha',      name:'JKE-X2 OMAHA',       cls:'pistol',  kind:'tech',  rar:2, dmg:14, rof:4,   mag:12, rel:1.0, spd:520, spread:3,  pierce:1, price:3400, lvl:7, desc:'ĐẠN CÔNG NGHỆ XUYÊN THẲNG QUA GIÁP.' },
  { id:'overture',   name:'DR5 NOVA OVERTURE',  cls:'revolver',kind:'power', rar:1, dmg:30, rof:1.6, mag:6,  rel:1.6, spd:460, spread:3,  kb:120, price:1900, lvl:4, desc:'SÁU VIÊN ĐẠN, SÁU LÝ DO ĐỂ IM LẶNG.' },
  { id:'burya',      name:'RT-46 BURYA',        cls:'revolver',kind:'tech',  rar:3, dmg:44, rof:1.2, mag:5,  rel:1.8, spd:560, spread:2,  pierce:1, kb:160, price:7800, lvl:11, desc:'SÚNG RAILGUN TRONG DÁNG REVOLVER. KỸ THUẬT SOVOIL.' },
  // ---- SMG ----
  { id:'saratoga',   name:'G-58 DIAN SARATOGA', cls:'smg',     kind:'power', rar:1, dmg:6,  rof:11,  mag:28, rel:1.2, spd:360, spread:9,  price:1400,  lvl:3,  desc:'XẢ ĐẠN RỒI CẦU MAY. THIẾT KẾ DỄ DÙNG CHO DÂN ĐƯỜNG PHỐ.' },
  { id:'pulsar',     name:'M2038 TACTICIAN PULSAR', cls:'smg', kind:'power', rar:2, dmg:7,  rof:14,  mag:36, rel:1.3, spd:380, spread:8,  price:5200,  lvl:9,  desc:'VÒI ĐẠN CỦA MILITECH. CỨ GIỮ CÒ NÓNG.' },
  { id:'shingen',    name:'TKI-20 SHINGEN',     cls:'smg',     kind:'smart', rar:3, dmg:6,  rof:12,  mag:30, rel:1.3, spd:300, spread:10, homing:5, price:9800, lvl:12, desc:'SMG THÔNG MINH ARASAKA. ĐẠN TỰ SĂN MỤC TIÊU SỐNG. CẦN SMART LINK.' },
  // ---- rifles ----
  { id:'copperhead', name:'D5 COPPERHEAD',      cls:'rifle',   kind:'power', rar:1, dmg:9,  rof:8,   mag:24, rel:1.4, spd:440, spread:6,  price:2200,  lvl:4,  desc:'CON NGỰA THỒ CỦA DÂN DU MỤC. NUỐT BỤI, NHẢ CHÌ.' },
  { id:'ajax',       name:'D5 SIDEWINDER AJAX', cls:'rifle',   kind:'power', rar:2, dmg:11, rof:8,   mag:28, rel:1.4, spd:460, spread:5,  price:4400,  lvl:8,  desc:'NỀN TẢNG SÚNG TRƯỜNG TIÊU CHUẨN CỦA MILITECH.' },
  { id:'sidewinder', name:'D5 SIDEWINDER SMART',cls:'rifle',   kind:'smart', rar:3, dmg:8,  rof:10,  mag:32, rel:1.4, spd:320, spread:9,  homing:5, price:8400, lvl:11, desc:'BẮN RỒI QUÊN. SÚNG TỰ NGẮM CHO BẠN. CẦN SMART LINK.' },
  { id:'masamune',   name:'HJSH-18 MASAMUNE',   cls:'rifle',   kind:'power', rar:3, dmg:13, rof:10,  mag:30, rel:1.4, spd:480, spread:4,  price:12500, lvl:14, desc:'SÚNG TỰ ĐỘNG CHÍNH XÁC CỦA ARASAKA. KIỂU DÁNG SẮC LẠNH.' },
  { id:'kyubi',      name:'TKI-30 KYUBI',       cls:'rifle',   kind:'power', rar:4, dmg:18, rof:7,   mag:22, rel:1.3, spd:520, spread:3,  price:21000, lvl:17, desc:'CÁO CHÍN ĐUÔI. MỖI VIÊN ĐẠN LÀ MỘT LỜI TUYÊN BỐ.' },
  // ---- shotguns ----
  { id:'igla',       name:'TESTERA IGLA',       cls:'shotgun', kind:'power', rar:1, dmg:7,  rof:1.8, mag:6,  rel:1.7, spd:320, spread:14, pellets:6,  kb:90,  price:1700,  lvl:3,  desc:'SHOTGUN GIÁ MỀM. ĐỨNG ĐỦ GẦN LÀ ĐỦ.' },
  { id:'carnage',    name:'M2038 CARNAGE',      cls:'shotgun', kind:'power', rar:2, dmg:9,  rof:1.3, mag:5,  rel:1.8, spd:340, spread:16, pellets:8,  kb:140, price:6200,  lvl:9,  desc:'CÂU TRẢ LỜI CỦA CONSTITUTIONAL ARMS CHO MỌI CÂU HỎI.' },
  { id:'tactician',  name:'M2038 TACTICIAN',    cls:'shotgun', kind:'power', rar:3, dmg:8,  rof:2.4, mag:8,  rel:1.8, spd:360, spread:13, pellets:7,  kb:110, price:11000, lvl:13, desc:'SHOTGUN BÁN TỰ ĐỘNG CHO MERC LÀM VIỆC CHUYÊN NGHIỆP.' },
  { id:'sovereign',  name:'DB-4 SOVEREIGN',     cls:'shotgun', kind:'power', rar:4, dmg:8,  rof:1.0, mag:2,  rel:1.9, spd:360, spread:20, pellets:14, kb:220, price:19500, lvl:16, desc:'TẬN THẾ HAI NÒNG. BẮN CẢ HAI, KHÔNG HỐI HẬN.' },
  // ---- snipers ----
  { id:'nekomata',   name:'M-179E ACHILLES NEKOMATA', cls:'sniper', kind:'tech', rar:3, dmg:75, rof:0.9, mag:4, rel:2.2, spd:760, spread:0.5, pierce:2, price:14500, lvl:14, desc:'SÚNG BẮN TỈA CÔNG NGHỆ. NẠP RAIL, XÓA VẤN ĐỀ.' },
  { id:'ashura',     name:'ASHURA',             cls:'sniper',  kind:'smart', rar:4, dmg:85, rof:0.8, mag:5,  rel:2.3, spd:600, spread:1,  homing:3, price:36000, lvl:19, desc:'SÚNG BẮN TỈA THÔNG MINH. KHÓA MỤC TIÊU RỒI KẾT LIỄU. CẦN SMART LINK.' },
  // ---- LMG ----
  { id:'defender',   name:'L-69 ZHUO DEFENDER', cls:'lmg',     kind:'power', rar:3, dmg:7,  rof:12,  mag:70, rel:2.8, spd:420, spread:8,  price:16500, lvl:15, desc:'ÁP CHẾ HỎA LỰC NHƯ MỘT PHONG CÁCH SỐNG.' },
  // ---- melee (shop) ----
  { id:'knife',      name:'DAO ĐƯỜNG PHỐ',      cls:'blade',   kind:'melee', rar:0, dmg:16, rof:3.2, range:20, arc:100, price:350,  lvl:1, desc:'YÊN LẶNG, NHANH GỌN, RẤT RIÊNG TƯ.' },
  { id:'bat',        name:'GẬY GẮN ĐINH',       cls:'blunt',   kind:'melee', rar:0, dmg:26, rof:1.7, range:24, arc:110, kb:200, price:700, lvl:2, desc:'NGOẠI GIAO KIỂU NIGHT CITY.' },
  { id:'katana',     name:'KATANA',             cls:'blade',   kind:'melee', rar:2, dmg:40, rof:2.4, range:26, arc:120, price:5600, lvl:8, desc:'LƯỠI KIẾM CỦA SAMURAI ĐƯỜNG PHỐ.' },
  // ---- ICONICS: dropped by cyberpsychos, never sold ----
  { id:'problem_solver', name:'PROBLEM SOLVER', cls:'smg',     kind:'power', rar:5, dmg:7,  rof:16,  mag:60, rel:1.5, spd:380, spread:9, iconic:1, price:24000, lvl:1, desc:'VŨ KHÍ BIỂU TƯỢNG. 60 CÂU TRẢ LỜI TRONG MỘT BĂNG ĐẠN.' },
  { id:'headsman',   name:'THE HEADSMAN',       cls:'shotgun', kind:'power', rar:5, dmg:9,  rof:1.7, mag:6,  rel:1.6, spd:360, spread:14, pellets:9, kb:170, iconic:1, price:26000, lvl:1, desc:'VŨ KHÍ BIỂU TƯỢNG. SHOTGUN CỦA KẺ HÀNH QUYẾT.' },
  { id:'moron_labe', name:'MORON LABE',         cls:'rifle',   kind:'power', rar:5, dmg:12, rof:11,  mag:35, rel:1.3, spd:480, spread:4, iconic:1, price:30000, lvl:1, desc:'VŨ KHÍ BIỂU TƯỢNG. MUỐN THÌ TỚI LẤY.' },
  { id:'satori',     name:'SATORI',             cls:'blade',   kind:'melee', rar:5, dmg:48, rof:2.6, range:28, arc:130, crit:0.25, iconic:1, price:32000, lvl:1, desc:'KATANA BIỂU TƯỢNG. MỘT NHÁT CHO TỈNH NGỘ.' },
  { id:'overwatch',  name:'OVERWATCH',          cls:'sniper',  kind:'power', rar:5, dmg:110,rof:0.7, mag:5,  rel:2.0, spd:820, spread:0.5, pierce:2, iconic:1, price:38000, lvl:1, desc:'SÚNG BẮN TỈA BIỂU TƯỢNG. LỜI HỨA CỦA DÂN DU MỤC.' },
  { id:'errata',     name:'ERRATA',             cls:'blade',   kind:'melee', rar:5, dmg:46, rof:2.2, range:28, arc:120, burn:1, iconic:1, price:34000, lvl:1, desc:'KATANA NHIỆT BIỂU TƯỢNG. CẮT TỚI ĐÂU ĐỐT TỚI ĐÓ.' },
  { id:'malorian',   name:'MALORIAN ARMS 3516', cls:'pistol',  kind:'power', rar:5, dmg:60, rof:2.2, mag:6,  rel:1.5, spd:560, spread:1, pierce:1, kb:150, burn:1, iconic:1, price:45000, lvl:1, desc:'VŨ KHÍ BIỂU TƯỢNG. KHẨU SÚNG CỦA MỘT HUYỀN THOẠI. DẬY ĐI, SAMURAI.' },
  { id:'breakthrough', name:'BREAKTHROUGH',     cls:'sniper',  kind:'tech',  rar:5, dmg:85, rof:0.8, mag:4,  rel:2.2, spd:820, spread:0.5, pierce:9, wallPierce:1, iconic:1, price:42000, lvl:1, desc:'SÚNG BẮN TỈA CÔNG NGHỆ BIỂU TƯỢNG. TƯỜNG CHỈ LÀ GỢI Ý.' },
  { id:'skippy',     name:'SKIPPY',             cls:'pistol',  kind:'smart', rar:5, dmg:11, rof:7,   mag:20, rel:1.0, spd:340, spread:6, homing:8, iconic:1, hidden:1, price:21000, lvl:1, desc:'SÚNG THÔNG MINH BIẾT NÓI. NÓ TỰ NGẮM, VÀ NÓ KHÔNG BAO GIỜ IM.' },
  // ---- cyberware arm weapons (granted by ripperdoc) ----
  { id:'mantis_blades', name:'LƯỠI MANTIS',     cls:'mantis',  kind:'melee', rar:4, dmg:38, rof:3.4, range:26, arc:140, granted:1, price:15000, lvl:1, desc:'CYBERWARE Ở TAY. MỞ LƯỠI RA LÀ CÓ CHUYỆN.' },
  { id:'gorilla_arms',  name:'TAY GORILLA',     cls:'gorilla', kind:'melee', rar:4, dmg:55, rof:1.5, range:22, arc:100, kb:260, granted:1, price:12000, lvl:1, desc:'CYBERWARE Ở TAY. CÚ ĐẤM HẠNG NẶNG KIỂU CÔNG NGHIỆP.' },
  { id:'monowire',      name:'MONOWIRE',        cls:'wire',    kind:'melee', rar:4, dmg:60, rof:2.0, range:46, arc:80, granted:1, price:18000, lvl:1, desc:'CYBERWARE Ở TAY. ROI SỢI PHÂN TỬ CỰC MẢNH.' },
  { id:'proj_launcher', name:'HỆ PHÓNG ĐẠN',    cls:'launcher', kind:'power', rar:4, dmg:85, rof:0.8, mag:4, rel:2.5, spd:300, spread:2, aoe:45, granted:1, price:26000, lvl:1, desc:'CYBERWARE Ở TAY. CÁNH TAY CỦA BẠN GIỜ LÀ PHÁO BINH.' },
];
const WPN = {}; WEAPONS.forEach(w => WPN[w.id] = w);
const ICONICS = ['problem_solver', 'headsman', 'moron_labe', 'satori', 'overwatch', 'errata', 'malorian', 'breakthrough'];

// ---- vehicles ---- top = px/s, acc = px/s^2
const CARS = [
  { id:'galena',   name:'THORTON GALENA G240',    price:3200,   top:190, acc:150, grip:0.88, hp:250, shape:'sedan',  col:'#b05c1a', col2:'#f9f002' },
  { id:'supron',   name:'MAHIR SUPRON FS3',       price:5500,   top:170, acc:120, grip:0.85, hp:420, shape:'van',    col:'#3d5a66', col2:'#05d9e8' },
  { id:'colby',    name:'THORTON COLBY C125',     price:8000,   top:200, acc:150, grip:0.87, hp:320, shape:'pickup', col:'#6e2f1d', col2:'#cfd6e4' },
  { id:'hella',    name:'ARCHER HELLA EC-D',      price:16000,  top:230, acc:180, grip:0.90, hp:300, shape:'sedan',  col:'#27414f', col2:'#ff9f1c' },
  { id:'alvarado', name:'VILLEFORT ALVARADO',     price:28000,  top:240, acc:185, grip:0.90, hp:340, shape:'muscle', col:'#3a1030', col2:'#ff2a6d' },
  { id:'type66',   name:'QUADRA TYPE-66 640 TS',  price:58000,  top:290, acc:240, grip:0.86, hp:330, shape:'muscle', col:'#23262e', col2:'#f9f002' },
  { id:'shion',    name:'MIZUTANI SHION MZ2',     price:72000,  top:300, acc:250, grip:0.92, hp:300, shape:'sport',  col:'#1b4f72', col2:'#05d9e8' },
  { id:'outlaw',   name:'HERRERA OUTLAW GTS',     price:99000,  top:320, acc:265, grip:0.93, hp:290, shape:'sport',  col:'#5b1020', col2:'#ff9f1c' },
  { id:'turbo',    name:'QUADRA TURBO-R V-TECH',  price:129000, top:330, acc:285, grip:0.94, hp:320, shape:'sport',  col:'#8a1538', col2:'#f9f002' },
  { id:'caliburn', name:'RAYFIELD CALIBURN',      price:157000, top:360, acc:320, grip:0.95, hp:300, shape:'hyper',  col:'#0c0c10', col2:'#f9f002' },
  { id:'kusanagi', name:'YAIBA KUSANAGI CT-3X',   price:22000,  top:310, acc:270, grip:0.90, hp:140, shape:'bike',   col:'#15151c', col2:'#ff2a6d', bike:1 },
  { id:'nazare',   name:'ARCH NAZARE',            price:46000,  top:330, acc:290, grip:0.88, hp:160, shape:'bike',   col:'#26262e', col2:'#ff9f1c', bike:1 },
];
const CARD = {}; CARS.forEach(c => CARD[c.id] = c);

// ---- cyberware ----  tiers: [{price,lvl,...}]; effects read by recalcStats()
const CYBER = [
  { id:'sandevistan', slot:'HỆ ĐIỀU HÀNH', name:'SANDEVISTAN', os:1, desc:'BỘ TĂNG PHẢN XẠ. [Q] LÀM CHẬM THỜI GIAN KHI BẠN DI CHUYỂN CỰC NHANH.',
    tiers:[{price:12000,lvl:6,dur:2.6,cd:28,ts:0.35},{price:26000,lvl:12,dur:3.6,cd:24,ts:0.30},{price:48000,lvl:18,dur:4.6,cd:20,ts:0.25}] },
  { id:'berserk', slot:'HỆ ĐIỀU HÀNH', name:'BERSERK', os:1, desc:'OS KÍCH THÍCH CHIẾN ĐẤU. [Q] TĂNG SÁT THƯƠNG, GIÁP VÀ HỒI MÁU KHI ĐÁNH CẬN CHIẾN.',
    tiers:[{price:9000,lvl:5,dur:6,cd:28,dmg:1.25,armor:20},{price:21000,lvl:11,dur:6,cd:26,dmg:1.4,armor:35},{price:40000,lvl:17,dur:7,cd:24,dmg:1.6,armor:50}] },
  { id:'memboost', slot:'VỎ NÃO TRƯỚC', name:'TĂNG TRÍ NHỚ', desc:'TỐI ƯU GHI NHỚ. NHẬN NHIỀU XP HƠN TỪ MỌI HOẠT ĐỘNG.',
    tiers:[{price:3500,lvl:2,xp:1.12},{price:9000,lvl:8,xp:1.25},{price:20000,lvl:14,xp:1.4}] },
  { id:'kiroshi', slot:'MẮT', name:'MẮT KIROSHI', desc:'NHÌN CHỈ SỐ KẺ ĐỊCH. TĂNG TỈ LỆ CHÍ MẠNG. MK.2+ MỞ RỘNG QUÉT MINIMAP.',
    tiers:[{price:2500,lvl:1,crit:0.07},{price:8000,lvl:7,crit:0.12},{price:18000,lvl:13,crit:0.18}] },
  { id:'biomonitor', slot:'TUẦN HOÀN', name:'BIOMONITOR', desc:'TỰ TIÊM MAXDOC KHI MÁU XUỐNG DƯỚI 30%.',
    tiers:[{price:6500,lvl:4}] },
  { id:'second_heart', slot:'TUẦN HOÀN', name:'TRÁI TIM THỨ HAI', desc:'LÁCH CỬA TỬ. HỒI SINH ĐẦY MÁU KHI NHẬN ĐÒN CHÍ MẠNG. HỒI 180S.',
    tiers:[{price:46000,lvl:20}] },
  { id:'kerenzikov', slot:'THẦN KINH', name:'KERENZIKOV', desc:'THỜI GIAN CHẬM LẠI KHI LƯỚT. VỪA NÉ VỪA BẮN NHƯ HUYỀN THOẠI.',
    tiers:[{price:7500,lvl:3,ts:0.55,dur:0.5},{price:16000,lvl:9,ts:0.45,dur:0.75},{price:30000,lvl:15,ts:0.35,dur:1.0}] },
  { id:'subdermal', slot:'DA', name:'GIÁP DƯỚI DA', desc:'TẤM GIÁP CẤY DƯỚI DA. GIẢM SÁT THƯƠNG TRỰC TIẾP.',
    tiers:[{price:4000,lvl:2,armor:18},{price:12000,lvl:8,armor:36},{price:26000,lvl:14,armor:60}] },
  { id:'camo', slot:'DA', name:'TÀNG HÌNH QUANG HỌC', desc:'[F] BẺ CONG ÁNH SÁNG TRONG 4S. KẺ ĐỊCH MẤT DẤU BẠN HOÀN TOÀN.',
    tiers:[{price:24000,lvl:13,dur:4,cd:26}] },
  { id:'titanium', slot:'XƯƠNG', name:'XƯƠNG TITANIUM', desc:'KHUNG XƯƠNG GIA CỐ. TĂNG MÁU TỐI ĐA.',
    tiers:[{price:3000,lvl:1,hp:30},{price:10000,lvl:7,hp:60},{price:24000,lvl:13,hp:100}] },
  { id:'microrotor', slot:'XƯƠNG', name:'MICROROTOR THẦN KINH', desc:'KHỚP NHANH HƠN, BÓP CÒ NHANH HƠN. TĂNG TỐC ĐỘ BẮN.',
    tiers:[{price:5000,lvl:5,rof:1.08},{price:14000,lvl:11,rof:1.16},{price:28000,lvl:16,rof:1.25}] },
  { id:'smartlink', slot:'TAY', name:'SMART LINK', desc:'GIAO DIỆN KHÓA MỤC TIÊU. CẦN CHO VŨ KHÍ THÔNG MINH, GIÚP BÁM MỤC TIÊU TỐT HƠN.',
    tiers:[{price:4500,lvl:3,turn:4},{price:13000,lvl:9,turn:6},{price:26000,lvl:15,turn:9}] },
  { id:'tendons', slot:'CHÂN', name:'GÂN GIA CỐ', desc:'DI CHUYỂN NHANH HƠN. LƯỚT HỒI NHANH HƠN.',
    tiers:[{price:4500,lvl:2,spd:1.08,dash:0.85},{price:12500,lvl:8,spd:1.15,dash:0.7},{price:26000,lvl:14,spd:1.22,dash:0.55}] },
  { id:'arm_mantis', slot:'CÁNH TAY', name:'LƯỠI MANTIS', grants:'mantis_blades', desc:'CÀI LƯỠI DAO BẬT RA TỪ TAY. THÊM LƯỠI MANTIS VÀO KHO VŨ KHÍ.',
    tiers:[{price:15000,lvl:10}] },
  { id:'arm_gorilla', slot:'CÁNH TAY', name:'TAY GORILLA', grants:'gorilla_arms', desc:'NẮM ĐẤM THỦY LỰC. THÊM TAY GORILLA VÀO KHO VŨ KHÍ.',
    tiers:[{price:12000,lvl:8}] },
  { id:'arm_wire', slot:'CÁNH TAY', name:'MONOWIRE', grants:'monowire', desc:'ROI SỢI NANO. THÊM MONOWIRE VÀO KHO VŨ KHÍ.',
    tiers:[{price:18000,lvl:12}] },
  { id:'arm_launcher', slot:'CÁNH TAY', name:'HỆ PHÓNG ĐẠN', grants:'proj_launcher', desc:'VŨ KHÍ GẮN TRÊN TAY. THÊM BỆ PHÓNG VÀO KHO VŨ KHÍ.',
    tiers:[{price:26000,lvl:15}] },
];
const CYB = {}; CYBER.forEach(c => CYB[c.id] = c);
const CYBER_SLOTS = ['HỆ ĐIỀU HÀNH','VỎ NÃO TRƯỚC','MẮT','TUẦN HOÀN','THẦN KINH','DA','XƯƠNG','TAY','CÁNH TAY','CHÂN'];

// ---- districts & gangs ----
const DISTRICTS = {
  center:    { name:'TRUNG TÂM',     danger:1, fac:'scavs',     col:'#f9f002' },
  watson:    { name:'WATSON',        danger:2, fac:'maelstrom', col:'#05d9e8' },
  westbrook: { name:'WESTBROOK',     danger:3, fac:'tygers',    col:'#ff2a6d' },
  santo:     { name:'SANTO DOMINGO', danger:3, fac:'sixth',     col:'#ff9f1c' },
  pacifica:  { name:'PACIFICA',      danger:3, fac:'voodoo',    col:'#00ff9f' },
  dogtown:   { name:'DOGTOWN',       danger:4, fac:'barghest',  col:'#ff6a00' },
};
const FACTIONS = {
  player:    { name:'BĂNG CỦA BẠN', gun:0.65, pal:{ H:'#111116', S:'#d8a87c', E:'#00ff9f', J:'#132420', T:'#00ff9f', P:'#1a2024', B:'#090b0d' } },
  scavs:     { name:'SCAV',        gun:0.55, pal:{ H:'#3a3a3a', S:'#cfa884', E:'#ff4444', J:'#2c2c2c', T:'#884444', P:'#22222a', B:'#101014' } },
  maelstrom: { name:'MAELSTROM',   gun:0.7,  pal:{ H:'#1a1a1a', S:'#b9b3a8', E:'#ff2a3c', J:'#16161a', T:'#ff2a3c', P:'#1a1a20', B:'#0c0c10' } },
  tygers:    { name:'TYGER CLAW',  gun:0.45, pal:{ H:'#101014', S:'#e0b48c', E:'#ff2a6d', J:'#2a1130', T:'#ff2a6d', P:'#1c1424', B:'#101014' } },
  sixth:     { name:'6TH STREET',  gun:0.65, pal:{ H:'#4a3826', S:'#d8a87c', E:'#f5b83d', J:'#1d2a4a', T:'#f5b83d', P:'#26262e', B:'#14141a' } },
  voodoo:    { name:'VOODOO BOY',  gun:0.6,  pal:{ H:'#0c0c10', S:'#7a5642', E:'#00ff9f', J:'#11281e', T:'#00ff9f', P:'#161e1a', B:'#0c0c10' } },
  barghest:  { name:'BARGHEST',    gun:0.8,  pal:{ H:'#1a1a14', S:'#c8a078', E:'#ff6a00', J:'#262a1c', T:'#ff6a00', P:'#1e2018', B:'#101008' } },
  valentinos:{ name:'VALENTINOS',  gun:0.55, pal:{ H:'#171010', S:'#d8a87c', E:'#f9f002', J:'#2c1418', T:'#ff2a6d', P:'#1a1014', B:'#090608' } },
  mox:       { name:'MOX',         gun:0.5,  pal:{ H:'#ff2a6d', S:'#e8b88a', E:'#05d9e8', J:'#24122a', T:'#bd00ff', P:'#17101d', B:'#0a0610' } },
  wraiths:   { name:'WRAITHS',     gun:0.62, pal:{ H:'#24180c', S:'#c89564', E:'#ff9f1c', J:'#2c2018', T:'#ff6a00', P:'#18120e', B:'#0a0704' } },
  arasaka:   { name:'ARASAKA',     gun:0.82, pal:{ H:'#08080a', S:'#d8a87c', E:'#ff2a3c', J:'#151518', T:'#e8f6ff', P:'#101014', B:'#050506' } },
};
const FACTION_LABELS = {
  player: 'BĂNG CỦA BẠN',

  scavs: 'KỀN KỀN',
  maelstrom: 'HẮC THỦY',
  tygers: 'MÃNH HỔ',
  sixth: 'ĐƯỜNG SỐ 6',
  voodoo: 'BÓNG ĐÊM',
  barghest: 'CHIẾN KHUYỂN',
  valentinos: 'VALENTINO',
  mox: 'HỒNG MÔI',
  wraiths: 'U LINH',
  arasaka: 'TẬP ĐOÀN ARASAKA',
};
const GANG_NPC_NAMES = {
  scavs: ['BONE SAW','RUST JOY','MƯỜI SẸO','BLOOD NICK','CROWBAR','MẮT ĐỎ'],
  maelstrom: ['HEX WIRE','REDLINE','CHROME LEE','VEX','SPARK','MÁY XÉ'],
  tygers: ['AKI','KAZ','NEON HAN','YORI','KIRA','MÓNG ĐEN'],
  sixth: ['BRAVO','MAVERICK','DUSTY','OLD GLORY','COBRA','HARDCASE'],
  voodoo: ['MAMAN RUE','ZERO DAY','GHOST I/O','PATCH','LWA','NET RAIN'],
  barghest: ['KURT JR','DOGTOWN VIC','ORANGE','BUNKER','HOUND','IRON GATE'],
  valentinos: ['PADRE ROJO','SANTO','LUPE','DIEGO','MIRA','CRUZ'],
  mox: ['RITA','JUDY X','GLITTER','DOLLIE','VIV','PINKWIRE'],
  wraiths: ['DUST KING','RIPPER JACK','NASH II','SALT','RAZOR','DRYLAND'],
  arasaka: ['KENSEN','BLACK SUIT','HANA','TAK','ZERO FOX','KAGE'],
};
const SHOP_VENDOR_NAMES = { guns:'VŨ KHÍ', ripper:'CYBER', cars:'XE', bar:'BAR', casino:'CASINO', clothing:'THỜI TRANG' };
const PLAYER_GANG_NAMES = ['BÓNG ĐÊM', 'RỒNG ĐỎ', 'SÓI PHỐ', 'HẮC LONG', 'SAO NEON', 'BỤI ĐỜI', 'LƯỠI ĐÈN', 'MẠCH ĐEN', 'PHỐ MƯA', 'NOVA CREW'];
const PLAYER_GANG_ICONS = [
  { mark:'☠', name:'ĐẦU LÂU', col:'#ff2a6d' },
  { mark:'✦', name:'NGÔI SAO', col:'#05d9e8' },
  { mark:'◇', name:'KIM CƯƠNG', col:'#f9f002' },
  { mark:'⬢', name:'LỤC GIÁC', col:'#bd00ff' },
  { mark:'⚡', name:'TIA SÉT', col:'#ff9f1c' },
  { mark:'✚', name:'DẤU THẬP', col:'#00ff9f' },
  { mark:'◆', name:'ĐÁ ĐEN', col:'#e8f6ff' },
  { mark:'▲', name:'MŨI NHỌN', col:'#ff2a3c' },
];
const PSYCHO_NAMES = ['NOX ĐẪM MÁU','DAO MỔ','THÁNH TURBO','TỬ THẦN NEON','CÔNG TƯỚC NỔ','CÔ MẢNH ĐẠN','BÁC SĨ CHROME','ĐẾM VỀ KHÔNG'];

const BRANDS = ['KIROSHI','ARASAKA','MILITECH','NICOLA','CHROMANTICORE','ORBITAL AIR','SAMURAI','BUDGET ARMS','ALL FOODS','TRAUMA TEAM','ZETATECH','BIOTECHNICA','KANG TAO','WEST WIND'];

const TIPS = [
  'WASD: DI CHUYỂN · CHUỘT: NGẮM · LMB: BẮN · SPACE: LƯỚT',
  'BỊ THƯƠNG? BẤM [C] DÙNG MAXDOC. MÁY BÁN HÀNG CÓ BÁN THÊM',
  'KIẾM EDDIES: SĂN MỤC TIÊU TRUY NÃ MÀU ĐỎ TRÊN MINIMAP',
  'ĐẾN 2ND AMENDMENT [G TRÊN BẢN ĐỒ] ĐỂ MUA THÊM VŨ KHÍ',
  'RIPPERDOC [R TRÊN BẢN ĐỒ] BÁN CHROME. NÊN BẮT ĐẦU VỚI MẮT KIROSHI',
  'AUTOFIXER [A TRÊN BẢN ĐỒ] BÁN XE. [V] GỌI XE CỦA BẠN',
  'CYBERPSYCHO RƠI VŨ KHÍ BIỂU TƯỢNG. HÃY SƯU TẦM ĐỦ 8 MÓN',
  'BẤM [TAB] ĐỂ XEM BỘ SƯU TẬP',
  'THÙNG CÓ VẠCH VÀNG PHÁ ĐƯỢC: CÓ EDDIES, DOC, ĐÔI KHI CÓ SẮT',
  'DOGTOWN [TÂY NAM] LÀ ĐẤT BARGHEST: ★★★★ NGUY HIỂM, AIRDROP, THƯỞNG LỚN',
  'JIG-JIG STREET [ĐÔNG BẮC] KHÔNG BAO GIỜ NGỦ. CLOUDS CÓ THỂ GIÚP BẠN NGHỈ',
  'KẺ ĐỊCH CÓ TẦM NHÌN. ĐỨNG SAU LƯNG HOẶC CẮT ĐƯỜNG NHÌN CỦA CHÚNG',
  'CỬA CÓ ĐÈN CÓ THỂ ĐI VÀO. HANG Ổ CÓ ĐỒ, VÀ CŨNG CÓ KẺ ĐỊCH',
  'ĐÁNH CẬN CHIẾN KHI KẺ ĐỊCH CHƯA BIẾT SẼ GÂY 2.5X SÁT THƯƠNG',
  'BỤI CÂY LÀ CHỖ NẤP: ĐỨNG TRONG BỤI ĐỂ CẮT TẦM NHÌN KẺ ĐỊCH',
  'THỜI TIẾT THAY ĐỔI. SƯƠNG VÀ BÃO LÀM GIẢM TẦM NHÌN KẺ ĐỊCH',
  'TIN ĐỒN: CÓ MỘT KHẨU SÚNG BIẾT NÓI NẰM ĐÂU ĐÓ DƯỚI CỐNG...',
];
const FIXER_LINES = [
  'REGINA: NGOÀI ĐÓ CẨN THẬN NHÉ, MERC.',
  'REGINA: NGHE NÓI MAELSTROM ĐANG CHUYỂN CHROME QUA WATSON.',
  'REGINA: EDDIES MỚI CÓ TIẾNG NÓI. SĂN TRUY NÃ, MUA SÚNG XỊN HƠN.',
  'REGINA: MÓNG HỔ KIỂM SOÁT WESTBROOK. NHỚ MANG LƯỠI DAO.',
  'REGINA: PACIFICA LÀ VÙNG NGUY HIỂM. NHƯNG TIỀN THƯỞNG GẤP BA.',
  'REGINA: VIK KHÔNG GIẢM GIÁ CHO AI. CỨ CẤY CHROME ĐI.',
  'REGINA: CALIBURN HẢ? THỜI BUỔI NÀY? MƠ LỚN ĐẤY, V.',
  'REGINA: BARGHEST CANH DOGTOWN NHƯ KHO BẠC. VÌ NÓ ĐÚNG LÀ KHO BẠC.',
  'REGINA: CÓ TÍN HIỆU AIRDROP TRÊN TẦN SỐ MILITECH. NHÌN VỀ TÂY NAM.',
];
// joytoy / doll dialogue (kept tame — the spice is fade-to-black)
const JOY_GREET = [
  'CHÀO CHOOM. CẦN NGƯỜI NGỒI CÙNG KHÔNG?',
  'XIN CHÀO, MERC. ĐÊM DÀI QUÁ HẢ?',
  'GƯƠNG MẶT MỚI Ở JIG-JIG! MỜI MỘT LY CHỨ? HAY VÀO VIỆC LUÔN?',
];
const JOY_LINES = [
  'CẨN THẬN ĐÓ, CHROME KIỂU BẠN DỄ LÀM NGƯỜI TA RUNG ĐỘNG.',
  'DÍNH MÙI DẦU SÚNG MÀ NÓI CHUYỆN DỄ THƯƠNG GHÊ.',
  'NỊNH HAY THÌ ĐƯỢC GIẢM GIÁ. ĐÙA THÔI, KHÔNG CÓ ĐÂU.',
  'NHỚ SỐNG MÀ QUAY LẠI, ĐƯỢC KHÔNG? TÔI NÓI THẬT.',
];
const DOLL_GREET = [
  'CHÀO MỪNG ĐẾN CLOUDS. TÔI LÀ EVE. TÔI BIẾT BẠN CẦN GÌ RỒI.',
  'THỞ ĐI, V. Ở TRONG NÀY, THÀNH PHỐ KHÔNG CHẠM TỚI BẠN ĐƯỢC.',
];
const DOLL_LINES = [
  'NHỊP TIM NÓI RẰNG BẠN MẤY NGÀY CHƯA NGỦ. THẢ LỎNG ĐI.',
  'MERC NÀO CŨNG MANG THEO BÓNG MA. ĐẶT CHÚNG XUỐNG MỘT GIỜ ĐI.',
  'NET NHỚ MỌI THỨ. CÒN CON NGƯỜI? TA CHỌN ĐIỀU MUỐN GIỮ.',
];

const SKIPPY_LINES = [
  'SKIPPY: WHEEE! TUYỆT VỜI QUÁ!',
  'SKIPPY: KHÔNG CÓ TÔI THÌ ĐÂU CÓ MÀN DỌN DẸP NÀY!',
  'SKIPPY: TÔI YÊU BẠN, NGƯỜI DÙNG!',
  'SKIPPY: LẠI MỘT TÊN NẰM XUỐNG! PEW PEW!',
  'SKIPPY: QUY TRÌNH ĐẠO ĐỨC? CHƯA CÀI BAO GIỜ!',
  'SKIPPY: BẠN LÀ NGƯỜI-BẠN-THỊT TÔI THÍCH NHẤT!',
];

// new-game random starter kit pools
const STARTER_WPNS = ['liberty', 'lexington', 'unity', 'knife', 'bat'];
const STARTER_CARS = ['galena', 'supron', 'colby'];

// weather: density = raindrop count, range = enemy view-range multiplier
const WEATHERS = {
  clear:   { name: 'ĐÊM QUANG',    density: 0,   thunder: 0,   range: 1 },
  drizzle: { name: 'MƯA NHẸ',      density: 55,  thunder: 0.1, range: 1 },
  storm:   { name: 'BÃO',          density: 160, thunder: 1,   range: 0.85, tint: 'rgba(40,60,110,0.07)' },
  acid:    { name: 'MƯA ACID',     density: 90,  thunder: 0.2, range: 1,    tint: 'rgba(120,255,80,0.045)', rainCol: 'rgba(150,230,110,0.22)' },
  fog:     { name: 'SƯƠNG MÙ',     density: 0,   thunder: 0,   range: 0.7,  tint: 'rgba(170,180,200,0.05)', fog: 1 },
  smog:    { name: 'KHÓI MÙ',      density: 0,   thunder: 0,   range: 0.85, tint: 'rgba(255,140,60,0.05)',  fog: 0.6, fogCol: '#cf8a4a' },
};
const WEATHER_POOL = ['clear', 'clear', 'drizzle', 'drizzle', 'drizzle', 'storm', 'storm', 'fog', 'fog', 'acid', 'acid', 'smog'];

function xpFor(lvl) { return Math.floor(70 * Math.pow(lvl, 1.45)); }
function dpsOf(w) { return Math.round(w.dmg * (w.pellets || 1) * w.rof); }

window.WEAPONS = WEAPONS;
window.CARS = CARS;
window.CYBER = CYBER;
window.CYBER_SLOTS = CYBER_SLOTS;
window.WEATHERS = WEATHERS;
window.KIND_COL = KIND_COL;
window.PLAYER_GANG_NAMES = PLAYER_GANG_NAMES;
window.PLAYER_GANG_ICONS = PLAYER_GANG_ICONS;
window.RAR_NAME = RAR_NAME;
window.WPN = WPN;
window.CARD = CARD;
window.CYB = CYB;
window.TILE = TILE;
window.ICONICS = ICONICS;
