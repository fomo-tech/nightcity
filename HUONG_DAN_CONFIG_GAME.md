# Huong dan noi config game

Tai lieu nay dung de biet can sua file nao khi muon them/sua item, nhan vat,
trang phuc, bang dang, map, loot, spawn bot va cac noi dung khac trong game.

Game nay la vanilla JavaScript, khong co build step. Cac file script duoc load
theo thu tu trong `public/game.html`, nen khi sua file `.js` nho tang `?v=N`
cho cac script tag de trinh duyet khong dung cache cu.

## Cach them noi dung an toan nhat

Neu chi muon them sung, xe, cyberware, radio hoac hook su kien, hay sua:

- `mods/mods.js`
- `public/mods/mods.js` neu ban dang chay ban public static

File mod load sau game nen co the dung API `NCPX.registerMod(...)`. Cach nay an
toan hon sua core vi khong lam hong save cu neu giu `id` on dinh.

Vi du them sung:

```js
NCPX.registerMod({
  name: 'my-items',
  weapons: [
    { id: 'red_dragon', name: 'RED DRAGON', cls: 'rifle', kind: 'power', rar: 3,
      dmg: 14, rof: 9, mag: 30, rel: 1.3, spd: 480, spread: 5,
      price: 12000, lvl: 10, desc: 'CUSTOM RIFLE.' },
  ],
});
```

Vi du them xe:

```js
NCPX.registerMod({
  name: 'my-cars',
  cars: [
    { id: 'night_fox', name: 'NIGHT FOX', price: 45000,
      top: 300, acc: 250, grip: 0.92, hp: 300,
      shape: 'sport', col: '#101014', col2: '#00ff9f' },
  ],
});
```

## Bang noi config nhanh

| Muon sua gi | File chinh | Ghi chu |
|---|---|---|
| Sung, vu khi melee | `public/js/data.js` -> `WEAPONS` | Nen them qua `mods/mods.js` neu la item moi |
| Xe | `public/js/data.js` -> `CARS` | Sprite xe tu sinh theo `shape`, `col`, `col2` |
| Cyberware | `public/js/data.js` -> `CYBER` | Effect duoc doc trong `recalcStats()` cua `game.js` |
| Khu vuc, sao nguy hiem, faction | `public/js/data.js` -> `DISTRICTS`, `FACTIONS` | `danger` anh huong tier/spawn/reward |
| Ten bang dang, ten NPC | `public/js/data.js` -> `FACTION_LABELS`, `GANG_NPC_NAMES` | Text hien thi tren map/HUD |
| Trang phuc/player skin | `public/js/sprites.js` -> `MALE_CIV_PALS`, `FEMALE_CIV_PALS` | Wardrobe hien 10 outfit theo palette nay |
| Shop, cho, cay, loot, crate | `public/js/world.js` -> `genWorld()` | World deterministic, can than vi co the anh huong save |
| Spawn bot, gang AI, bounty | `public/js/game.js` -> `spawnPack()`, `updateSpawns()` | Bot dung faction/danger cua district |
| Airdrop | `public/js/game.js` -> `spawnAirdrop()`, `updateAirdrop()` | UI hien o `public/js/ui.js` |
| Text UI / menu | `public/js/ui.js` | Immediate-mode canvas UI |
| Da ngon ngu VI/EN | `public/js/i18n.js` | Text duoc map qua `localText()` / font hook |
| Pixel art icon/sprite | `public/js/sprites.js` | Khong dung PNG asset moi |
| Am thanh/radio | `public/js/sfx.js` | WebAudio synth, station config |
| Save/load | `public/js/game.js` -> `saveGame()`, `applySave()` | Field moi phai optional/default |

## Config item vu khi

Noi goc: `public/js/data.js` -> mang `WEAPONS`.

Field thuong dung:

```js
{
  id: 'unique_id',       // bat buoc, khong doi sau khi release vi save luu id
  name: 'ITEM NAME',     // nen viet HOA
  cls: 'pistol',         // pistol|revolver|smg|rifle|shotgun|sniper|lmg|blade|blunt|launcher
  kind: 'power',         // power|tech|smart|melee
  rar: 2,                // 0 common, 1 uncommon, 2 rare, 3 epic, 4 legendary, 5 iconic
  dmg: 10,               // damage moi vien/don
  rof: 6,                // tan cong moi giay
  mag: 18,               // bang dan, khong dung cho melee
  rel: 1.1,              // thoi gian reload
  spd: 420,              // toc do dan
  spread: 5,             // do lech tam theo do
  price: 2000,
  lvl: 4,
  desc: 'MO TA ITEM.'
}
```

Field phu:

- `pellets`: so vien moi phat shotgun.
- `pierce`: dan xuyen nguoi/tuong tuy logic.
- `homing`: do bam muc tieu cua smart weapon.
- `kb`: knockback.
- `burn`: gay chay.
- `aoe`: no vung.
- `crit`: ti le crit them.
- `wallPierce`: xuyen tuong manh.
- `iconic: 1`: iconic weapon, khong ban shop thuong.

Melee dung `range` va `arc` thay vi `mag`, `spd`, `spread`:

```js
{ id:'neon_katana', name:'NEON KATANA', cls:'blade', kind:'melee', rar:4,
  dmg:52, rof:2.5, range:30, arc:130, price:22000, lvl:16,
  desc:'LEGENDARY BLADE.' }
```

## Config xe

Noi goc: `public/js/data.js` -> mang `CARS`.

```js
{ id:'my_bike', name:'MY BIKE', price:22000,
  top:310, acc:270, grip:0.9, hp:140,
  shape:'bike', col:'#15151c', col2:'#ff2a6d', bike:1 }
```

`shape` hop le:

- `sedan`
- `sport`
- `muscle`
- `van`
- `pickup`
- `hyper`
- `bike`

## Config cyberware

Noi goc: `public/js/data.js` -> mang `CYBER`.

```js
{ id:'my_booster', slot:'NERVOUS SYSTEM', name:'MY BOOSTER',
  desc:'MOVE FASTER.',
  tiers:[
    { price:5000, lvl:4, spd:1.08 },
    { price:14000, lvl:10, spd:1.16 }
  ] }
```

Slot hop le nam trong `CYBER_SLOTS`:

- `OPERATING SYSTEM`
- `FRONTAL CORTEX`
- `OCULAR SYSTEM`
- `CIRCULATORY`
- `NERVOUS SYSTEM`
- `INTEGUMENTARY`
- `SKELETON`
- `HANDS`
- `ARMS`
- `LEGS`

Neu cyberware cap vu khi tay, dung `grants` tro toi mot `id` trong `WEAPONS`:

```js
{ id:'arm_laser', slot:'ARMS', name:'ARM LASER', grants:'proj_launcher',
  desc:'GRANTS ARM WEAPON.', tiers:[{ price:26000, lvl:15 }] }
```

## Config bang dang va khu vuc

Noi goc: `public/js/data.js`.

`DISTRICTS` quy dinh ten khu, so sao nguy hiem, faction mac dinh va mau:

```js
const DISTRICTS = {
  pacifica: { name:'PACIFICA', danger:3, fac:'voodoo', col:'#00ff9f' },
};
```

`danger` anh huong:

- tier bot khi spawn.
- so luong bot ambient o `updateSpawns()`.
- reward bounty.
- khu `3 sao+` hien tai spawn nhieu bot bang dang hon.

`FACTIONS` quy dinh palette NPC va ti le dung sung:

```js
voodoo: {
  name:'VOODOO BOY',
  gun:0.6,
  pal:{ H:'#0c0c10', S:'#7a5642', E:'#00ff9f', J:'#11281e',
        T:'#00ff9f', P:'#161e1a', B:'#0c0c10' }
}
```

Palette humanoid:

- `H`: hair
- `S`: skin
- `E`: eyes
- `J`: jacket
- `T`: trim/accent
- `P`: pants
- `B`: boots

Ten hien thi cua bang nam trong `FACTION_LABELS`. Ten bot random nam trong
`GANG_NPC_NAMES`.

## Config nhan vat va trang phuc

Player mac dinh:

- `public/js/sprites.js` -> `PLAYER_PAL`
- `public/js/sprites.js` -> `PLAYER_PAL_F`

Trang phuc trong shop thoi trang lay tu:

- `MALE_CIV_PALS`
- `FEMALE_CIV_PALS`

Wardrobe hien 10 outfit dau tien. Neu them palette thu 11 tro len, can sua UI va
logic wardrobe trong:

- `public/js/ui.js` -> `drawWardrobe()`
- `public/js/game.js` -> `talkOptions()`, `talkSelect()`, `buyWardrobeOutfit()`

Vi du them/sua palette:

```js
{ H:'#ffffff', S:'#e8b88a', E:'#05d9e8',
  J:'#101014', T:'#f9f002', P:'#242630', B:'#12141c' }
```

## Config map, shop, loot, cay xanh

Noi goc: `public/js/world.js` -> `genWorld()`.

Cac mang quan trong:

- `crateSpots`: vi tri thung pha lay loot.
- `giftSpots`: qua random tren map.
- `vends`: may ban hang.
- `shops`: shop sung, ripper, xe, casino, clothing, bar.
- `trees`: cay xanh pixel.
- `bushes`: bui cay co the dung de an nap.
- `npcs`: NPC dung yen nhu vendor, joy, doll, stylist.
- `dens`: hang/den cua bang dang trong nha.

Ham helper hay dung:

```js
gift(tx, ty, 'ed');     // qua tien
gift(tx, ty, 'doc');    // maxdoc
tree(tx, ty, true);     // cay lon
tree(tx, ty, false);    // cay nho
plant(tx, ty, 'grass'); // bui cay
```

Luu y: world generation deterministic voi seed `20770612`. Sua cach sinh map co
the lam vi tri trong save cu bi lech, nen can test ky.

## Config spawn bot

Noi goc: `public/js/game.js`.

Ham quan trong:

- `makeEnemy(...)`: tao mot enemy.
- `spawnPack(x, y, n, opts, rMin, rMax)`: tao mot nhom bot quanh vi tri.
- `spawnMapGangPack(minDanger)`: tao bot bang dang random toan map.
- `updateSpawns(dt)`: lich spawn ambient, map-wide bot, bounty.
- `updateGangBots(dt)`: bot dong minh cua bang nguoi choi.
- `updateGangWars(dt)`: giao tranh hai bang.

Vi du spawn pack theo faction:

```js
spawnPack(x, y, 4, { fac:'maelstrom', alerted:true }, 8, 80);
```

Option hay dung:

- `fac`: faction, neu khong co se lay theo district.
- `alerted`: bot da canh giac.
- `bounty`: bot thuoc bounty.
- `psycho`: cyberpsycho.
- `war`: bot thuoc gang war.
- `ally`: bot dong minh nguoi choi.
- `mapSpawn`: bot spawn random toan map.

## Config airdrop

Noi goc:

- `public/js/game.js` -> `spawnAirdrop()`, `updateAirdrop()`, `claimAirdrop()`
- `public/js/ui.js` -> `hud()` hien thoi gian va khoang cach drop

Thong so can tim:

- `G.airdropT`: thoi gian cho drop tiep theo.
- `G.airdrop.alt`: do cao khi dang roi.
- `G.airdrop.t`: thoi gian con lai sau khi da tiep dat.

## Config ngon ngu

Noi goc: `public/js/i18n.js`.

Game uu tien:

1. `?lang=vi` hoac `?lang=en` tren URL.
2. `localStorage` key `ncpx_lang`.
3. Mac dinh `vi`.

Text trong canvas duoc dich qua hook trong `public/js/font.js`. Khi them text moi,
nen them cap VI/EN vao `public/js/i18n.js` neu text do hien cho nguoi choi.

## Quy tac khi sua core game

- Text nguoi choi thay nen viet HOA.
- Giu `id` item/xe/cyber on dinh de save cu khong mat item.
- Field moi trong save phai co default trong `applySave()`.
- Khong them asset PNG/audio binary moi; art nam trong `sprites.js`/`world.js`,
  audio nam trong `sfx.js`.
- Sau khi sua bat ky file JS nao, tang `?v=N` trong `public/game.html`.
- Chay test:

```bash
node --check public/js/*.js
node test/smoke.js
node test/smoke.js
node test/smoke.js
```

