/* src/types/bead.ts */

/**
 * РўРёРї Р±РёСЃРµСЂРёРЅРєРё: 
 * NODE вЂ” РєР»СЋС‡РµРІР°СЏ С‚РѕС‡РєР° (СѓР·РµР»), РіРґРµ РїРµСЂРµСЃРµРєР°СЋС‚СЃСЏ РЅРёС‚Рё.
 * SPAN вЂ” СЃРѕРµРґРёРЅРёС‚РµР»СЊРЅР°СЏ Р±РёСЃРµСЂРёРЅР° РІ РїСЂРѕР»РµС‚Рµ РјРµР¶РґСѓ СѓР·Р»Р°РјРё.
 */
export type BeadType = 'NODE' | 'SPAN';

/**
 * РРЅС‚РµСЂС„РµР№СЃ СЌР»РµРјРµРЅС‚Р°СЂРЅРѕР№ РµРґРёРЅРёС†С‹ вЂ” Р‘РёСЃРµСЂРёРЅС‹
 */
export interface Bead {
  id: string;
  x: number;
  y: number;
  type: BeadType;
  color?: string;
  clusterId?: string;
  logicalIndex: { row: number; col: number };
}

/**
 * РљРѕРЅС„РёРіСѓСЂР°С†РёСЏ СЃРµС‚РєРё РґР»СЏ РіРµРЅРµСЂР°С‚РѕСЂР°
 */
export interface GridConfig {
  width: number;
  height: number;
  spacing: number;
  topSpan: number;    // РљРѕР»РёС‡РµСЃС‚РІРѕ Р±СѓСЃРёРЅ РІ РІРµСЂС…РЅРёС… РіСЂР°РЅСЏС… ("РїР»РµС‡Рё")
  bottomSpan: number; // РљРѕР»РёС‡РµСЃС‚РІРѕ Р±СѓСЃРёРЅ РІ РЅРёР¶РЅРёС… РіСЂР°РЅСЏС… ("РЅРѕР¶РєРё")
}

/**
 * РЎС‚СЂСѓРєС‚СѓСЂР° РІСЃРµР№ СЃС…РµРјС‹ СЃРёР»СЏРЅРєРё
 */
export interface SilyankaSchema {
  metadata: {
    name: string;
    author: string;
    createdAt: number;
  };
  dimensions: {
    width: number;        // РљРѕР»РёС‡РµСЃС‚РІРѕ РєРѕР»РѕРЅРѕРє
    height: number;       // РљРѕР»РёС‡РµСЃС‚РІРѕ СЂСЏРґРѕРІ
  };
  beads: Bead[];          // РџР»РѕСЃРєРёР№ РјР°СЃСЃРёРІ РІСЃРµС… Р±РёСЃРµСЂРёРЅ РґР»СЏ Р±С‹СЃС‚СЂРѕРіРѕ СЂРµРЅРґРµСЂР°
}

