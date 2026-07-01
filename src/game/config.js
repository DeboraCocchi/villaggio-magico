/**
 * @file config.js
 */

import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene.js';
import { AvatarScene }  from './scenes/AvatarScene.js';
import { VillageScene } from './scenes/VillageScene.js';

export const phaserConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#87CEEB',

  parent: 'game-container',

  scale: {
    mode:       Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      '100%',
    height:     '100%',
  },

  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0 },
      debug: false,   // ← era true: disabilita le hitbox rosse visibili
    }
  },

  // PreloadScene → VillageScene (AvatarScene saltata per ora)
  scene: [PreloadScene, VillageScene, AvatarScene],

  pixelArt:    true,
  roundPixels: true,
};