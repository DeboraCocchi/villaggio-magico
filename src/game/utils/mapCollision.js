import Phaser from 'phaser';

/**
 * @file mapCollision.js
 * Collisione per entità cinematiche (NPC, Pet) che si muovono scrivendo
 * direttamente su this.x/this.y invece di usare un corpo dinamico Matter.
 *
 * Il movimento resta interamente sotto il nostro controllo (velocità in px/s,
 * scalate col delta) e i muri vengono rispettati testando la posizione di
 * destinazione contro i corpi STATICI già presenti nel world Matter — cioè
 * quelli creati dall'Object Layer "collision" del TMJ.
 *
 * Il test è separato per asse: se X è bloccato ma Y no, l'entità scivola
 * lungo il muro invece di incastrarsi.
 *
 * @module utils/mapCollision
 */

const { Query, Composite } = Phaser.Physics.Matter.Matter;

/**
 * Cache dei corpi statici per scena. Viene invalidata quando cambia il numero
 * totale di corpi nel world (nuova scena, oggetti aggiunti/rimossi).
 * @type {WeakMap<Phaser.Scene, {total:number, bodies:MatterJS.BodyType[]}>}
 */
const BLOCKERS_CACHE = new WeakMap();

/**
 * Corpi statici e non-sensor della scena: i muri/mobili del layer "collision".
 * @param {Phaser.Scene} scene
 * @returns {MatterJS.BodyType[]}
 */
function getBlockers(scene) {
  const world = scene?.matter?.world;
  if (!world?.localWorld) return [];

  const all = Composite.allBodies(world.localWorld);
  const cached = BLOCKERS_CACHE.get(scene);
  if (cached && cached.total === all.length) return cached.bodies;

  const bodies = all.filter((b) => b.isStatic && !b.isSensor);
  BLOCKERS_CACHE.set(scene, { total: all.length, bodies });
  return bodies;
}

/**
 * true se una box centrata in (x, y) tocca un muro.
 * @param {Phaser.Scene} scene
 * @param {number} x Centro X della box (coordinate mappa).
 * @param {number} y Centro Y della box (coordinate mappa).
 * @param {number} halfW Semi-larghezza della box.
 * @param {number} halfH Semi-altezza della box.
 * @returns {boolean}
 */
export function isBlocked(scene, x, y, halfW, halfH) {
  const blockers = getBlockers(scene);
  if (blockers.length === 0) return false;

  const region = {
    min: { x: x - halfW, y: y - halfH },
    max: { x: x + halfW, y: y + halfH },
  };
  return Query.region(blockers, region).length > 0;
}

/**
 * Sposta l'entità di (dx, dy) rispettando i muri, un asse alla volta.
 *
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Container} entity Entità con .x/.y scrivibili.
 * @param {number} dx Spostamento X richiesto (px, già scalato col delta).
 * @param {number} dy Spostamento Y richiesto (px, già scalato col delta).
 * @param {number} halfW Semi-larghezza della box di collisione.
 * @param {number} halfH Semi-altezza della box di collisione.
 * @param {number} [footOffsetY=0] Offset verticale della box rispetto a .y
 *   (i piedi stanno sotto il centro dello sprite).
 * @returns {boolean} true se almeno un asse è stato bloccato.
 */
export function moveWithCollision(scene, entity, dx, dy, halfW, halfH, footOffsetY = 0) {
  if (!scene) return false;

  let blocked = false;
  const cy = () => entity.y + footOffsetY;

  if (dx !== 0) {
    if (isBlocked(scene, entity.x + dx, cy(), halfW, halfH)) blocked = true;
    else entity.x += dx;
  }

  if (dy !== 0) {
    if (isBlocked(scene, entity.x, cy() + dy, halfW, halfH)) blocked = true;
    else entity.y += dy;
  }

  return blocked;
}