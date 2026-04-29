/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export type AlgorithmState = 'IDLE' | 'RUNNING' | 'FINISHED';

export interface DijkstraStep {
  visited: Set<string>;
  unvisited: Set<string>;
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  currentNode: string | null;
  currentNeighbor: string | null;
  foundPath: string[] | null;
  message: string;
}

export type ToolMode = 'SELECT' | 'ADD_NODE' | 'ADD_EDGE' | 'DELETE' | 'MOVE';
