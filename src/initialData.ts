/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node, Edge } from './types';

export const INITIAL_NODES: Node[] = [
  { id: '1', x: 200, y: 300, label: 'A' },
  { id: '2', x: 400, y: 150, label: 'B' },
  { id: '3', x: 400, y: 450, label: 'C' },
  { id: '4', x: 600, y: 200, label: 'D' },
  { id: '5', x: 600, y: 400, label: 'E' },
  { id: '6', x: 800, y: 300, label: 'F' },
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: '1', target: '2', weight: 4 },
  { id: 'e2', source: '1', target: '3', weight: 2 },
  { id: 'e3', source: '2', target: '3', weight: 1 },
  { id: 'e4', source: '2', target: '4', weight: 5 },
  { id: 'e5', source: '3', target: '4', weight: 8 },
  { id: 'e6', source: '3', target: '5', weight: 10 },
  { id: 'e7', source: '4', target: '5', weight: 2 },
  { id: 'e8', source: '4', target: '6', weight: 6 },
  { id: 'e9', source: '5', target: '6', weight: 3 },
];
