// Coordinates are in the plane of the board, with positive Z toward its lid.
export const layers = [
  { name: 'board', half: 163, height: -55, thickness: 9, metal: [0.09, 0.30, 0.27] },
  { name: 'socket', half: 140, height: -17, thickness: 11, metal: [0.47, 0.49, 0.45] },
  { name: 'carrier', half: 118, height: 22, thickness: 14, metal: [0.16, 0.24, 0.25] },
  { name: 'lid', half: 98, height: 65, thickness: 9, metal: [0.19, 0.61, 0.49] }
];

export const camera = { roll: -0.44, tilt: 0.91, width: 518, height: 382 };
export const outline = [[-.90,-1],[.90,-1],[1,-.90],[1,.90],[.90,1],[-.90,1],[-1,.90],[-1,-.90]];
