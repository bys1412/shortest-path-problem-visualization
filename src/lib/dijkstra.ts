/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node, Edge, DijkstraStep } from '../types';

export function runDijkstra(
  nodes: Node[],
  edges: Edge[],
  startNodeId: string,
  endNodeId: string | null
): DijkstraStep[] {
  const steps: DijkstraStep[] = [];
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();
  const visited = new Set<string>();

  // 1. Initialization
  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  distances[startNodeId] = 0;

  steps.push({
    visited: new Set(visited),
    unvisited: new Set(unvisited),
    distances: { ...distances },
    previous: { ...previous },
    currentNode: null,
    currentNeighbor: null,
    foundPath: null,
    message: `初始化：将起点 ${nodes.find(n => n.id === startNodeId)?.label} 的距离设为 0，其他设为无穷大。`,
  });

  while (unvisited.size > 0) {
    // 2. Select the unvisited node with the smallest distance
    let currentNodeId: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((id) => {
      if (distances[id] < minDistance) {
        minDistance = distances[id];
        currentNodeId = id;
      }
    });

    // If we reached the end node or there's no path remaining
    if (currentNodeId === null || (endNodeId && currentNodeId === endNodeId)) {
      if (currentNodeId) {
        visited.add(currentNodeId);
        unvisited.delete(currentNodeId);
      }
      break;
    }

    const currentNode = nodes.find(n => n.id === currentNodeId)!;
    visited.add(currentNodeId);
    unvisited.delete(currentNodeId);

    steps.push({
      visited: new Set(visited),
      unvisited: new Set(unvisited),
      distances: { ...distances },
      previous: { ...previous },
      currentNode: currentNodeId,
      currentNeighbor: null,
      foundPath: null,
      message: `选择未访问节点中距离最小的节点：${currentNode.label}（距离：${distances[currentNodeId]}）`,
    });

    // 3. Update neighbors
    const neighbors = edges.filter(
      (e) => e.source === currentNodeId || e.target === currentNodeId
    );

    for (const edge of neighbors) {
      const neighborId = edge.source === currentNodeId ? edge.target : edge.source;
      if (visited.has(neighborId)) continue;

      const neighbor = nodes.find(n => n.id === neighborId)!;
      const newDist = distances[currentNodeId] + edge.weight;

      if (newDist < distances[neighborId]) {
        distances[neighborId] = newDist;
        previous[neighborId] = currentNodeId;

        steps.push({
          visited: new Set(visited),
          unvisited: new Set(unvisited),
          distances: { ...distances },
          previous: { ...previous },
          currentNode: currentNodeId,
          currentNeighbor: neighborId,
          foundPath: null,
          message: `通过 ${currentNode.label} 更新相邻节点 ${neighbor.label}：新距离为 ${newDist}`,
        });
      } else {
        steps.push({
          visited: new Set(visited),
          unvisited: new Set(unvisited),
          distances: { ...distances },
          previous: { ...previous },
          currentNode: currentNodeId,
          currentNeighbor: neighborId,
          foundPath: null,
          message: `节点 ${neighbor.label} 经由 ${currentNode.label} 的距离 (${newDist}) 并不比现有距离 (${distances[neighborId]}) 更短，跳过。`,
        });
      }
    }
  }

  // Final step: Path reconstruction if endNodeId is provided
  let foundPath: string[] | null = null;
  if (endNodeId && distances[endNodeId] !== Infinity) {
    foundPath = [];
    let current: string | null = endNodeId;
    while (current !== null) {
      foundPath.unshift(current);
      current = previous[current];
    }
  }

  steps.push({
    visited: new Set(visited),
    unvisited: new Set(unvisited),
    distances: { ...distances },
    previous: { ...previous },
    currentNode: null,
    currentNeighbor: null,
    foundPath: foundPath,
    message: foundPath 
      ? `求解完成！起点到终点的最短距离为 ${distances[endNodeId!]}`
      : "求解完成！",
  });

  return steps;
}
