/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MousePointer2, 
  Trash2, 
  ArrowRight, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw,
  Settings2,
  Info,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';
import { Node, Edge, ToolMode, AlgorithmState, DijkstraStep } from './types';
import { INITIAL_NODES, INITIAL_EDGES } from './initialData';
import { runDijkstra } from './lib/dijkstra';

export default function App() {
  // Graph State
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);

  // View State (Pan & Zoom)
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, k: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Tool & Interaction State
  const [toolMode, setToolMode] = useState<ToolMode>('SELECT');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // Algorithm State
  const [startNodeId, setStartNodeId] = useState<string | null>('1');
  const [endNodeId, setEndNodeId] = useState<string | null>('6');
  const [algorithmState, setAlgorithmState] = useState<AlgorithmState>('IDLE');
  const [steps, setSteps] = useState<DijkstraStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = useMemo(() => 
    currentStepIndex >= 0 ? steps[currentStepIndex] : null
  , [steps, currentStepIndex]);

  // --- Handlers ---

  const handleStartAlgorithm = () => {
    if (!startNodeId) return alert('请先选择起点');
    const computedSteps = runDijkstra(nodes, edges, startNodeId, endNodeId);
    setSteps(computedSteps);
    setCurrentStepIndex(0);
    setAlgorithmState('RUNNING');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleResetAlgorithm = () => {
    setAlgorithmState('IDLE');
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const handleStepForward = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setAlgorithmState('FINISHED');
    }
  }, [currentStepIndex, steps.length]);

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      if (algorithmState === 'FINISHED') setAlgorithmState('RUNNING');
    }
  };

  useEffect(() => {
    let timer: number;
    if (isPlaying && algorithmState === 'RUNNING') {
      timer = window.setInterval(() => {
        handleStepForward();
      }, 800);
    }
    return () => clearInterval(timer);
  }, [isPlaying, algorithmState, handleStepForward]);

  // --- Canvas Interaction ---

  const screenToWorld = (x: number, y: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    return {
      x: (x - rect.left - viewTransform.x) / viewTransform.k,
      y: (y - rect.top - viewTransform.y) / viewTransform.k,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (toolMode === 'MOVE' || e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      return;
    }

    if (toolMode === 'ADD_NODE') {
      const newNode: Node = {
        id: Date.now().toString(),
        x,
        y,
        label: String.fromCharCode(65 + nodes.length % 26) + (nodes.length >= 26 ? Math.floor(nodes.length / 26) : ''),
      };
      setNodes([...nodes, newNode]);
      return;
    }

    if (toolMode === 'SELECT' || toolMode === 'DELETE') {
      // Find node under cursor
      const clickedNode = nodes.find(n => 
        Math.hypot(n.x - x, n.y - y) < 25
      );

      if (clickedNode) {
        if (toolMode === 'DELETE') {
          setNodes(nodes.filter(n => n.id !== clickedNode.id));
          setEdges(edges.filter(e => e.source !== clickedNode.id && e.target !== clickedNode.id));
          if (startNodeId === clickedNode.id) setStartNodeId(null);
          if (endNodeId === clickedNode.id) setEndNodeId(null);
        } else {
          setSelectedNodeId(clickedNode.id);
          setSelectedEdgeId(null);
          setDraggingNodeId(clickedNode.id);
        }
        return;
      }

      // Find edge under cursor
      const clickedEdge = edges.find(e => {
        const s = nodes.find(n => n.id === e.source);
        const t = nodes.find(n => n.id === e.target);
        if (!s || !t) return false;
        // Simple line distance
        const L2 = (t.x - s.x)**2 + (t.y - s.y)**2;
        if (L2 === 0) return Math.hypot(s.x - x, s.y - y) < 10;
        const t_proj = ((x - s.x) * (t.x - s.x) + (y - s.y) * (t.y - s.y)) / L2;
        const t_clamped = Math.max(0, Math.min(1, t_proj));
        const dx = x - (s.x + t_clamped * (t.x - s.x));
        const dy = y - (s.y + t_clamped * (t.y - s.y));
        return dx*dx + dy*dy < 100; // 10px radius
      });

      if (clickedEdge) {
        if (toolMode === 'DELETE') {
          setEdges(edges.filter(e => e.id !== clickedEdge.id));
        } else {
          setSelectedEdgeId(clickedEdge.id);
          setSelectedNodeId(null);
        }
        return;
      }

      // Clear selection if nothing clicked
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }

    if (toolMode === 'ADD_EDGE') {
      const clickedNode = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 25);
      if (clickedNode) {
        if (!edgeSourceId) {
          setEdgeSourceId(clickedNode.id);
        } else if (edgeSourceId !== clickedNode.id) {
          // Check if edge already exists
          const existing = edges.find(e => 
            (e.source === edgeSourceId && e.target === clickedNode.id) ||
            (e.target === edgeSourceId && e.source === clickedNode.id)
          );
          if (!existing) {
            const newEdge: Edge = {
              id: `e${Date.now()}`,
              source: edgeSourceId,
              target: clickedNode.id,
              weight: 1,
            };
            setEdges([...edges, newEdge]);
          }
          setEdgeSourceId(null);
        }
      } else {
        setEdgeSourceId(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos({ x, y });

    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewTransform(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (draggingNodeId) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setNodes(nodes.map(n => n.id === draggingNodeId ? { ...n, x, y } : n));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newK = Math.max(0.1, Math.min(5, viewTransform.k * (1 + delta * zoomSpeed)));
    
    // Zoom towards mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = (mouseX - viewTransform.x) / viewTransform.k;
    const dy = (mouseY - viewTransform.y) / viewTransform.k;

    setViewTransform({
      k: newK,
      x: mouseX - dx * newK,
      y: mouseY - dy * newK,
    });
  };

  const updateNodeLabel = (id: string, label: string) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, label } : n));
  };

  const updateEdgeWeight = (id: string, weight: number) => {
    setEdges(edges.map(e => e.id === id ? { ...e, weight: Math.max(0, weight) } : e));
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f1f5f9] font-sans text-slate-900 select-none">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m-6 3l6-3"></path>
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">
            运筹学：最短路径求解器
          </h1>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500"></span>
            当前处理
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
            最短路径
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-slate-300 bg-slate-100"></span>
            未访问
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-72 flex-col border-r border-slate-200 bg-white shadow-lg z-10 transition-all duration-300">
          {/* Tool Section */}
          <div className="p-4 border-b border-slate-100">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">网络构建控制</h2>
            <div className="grid grid-cols-2 gap-2">
              <ToolbarButton 
                icon={<MousePointer2 size={18} />} 
                active={toolMode === 'SELECT'} 
                onClick={() => setToolMode('SELECT')} 
                label="选择"
                simple
              />
              <ToolbarButton 
                icon={<Plus size={18} />} 
                active={toolMode === 'ADD_NODE'} 
                onClick={() => setToolMode('ADD_NODE')} 
                label="加点"
                simple
              />
              <ToolbarButton 
                icon={<Plus size={18} className="rotate-45" />} 
                active={toolMode === 'ADD_EDGE'} 
                onClick={() => setToolMode('ADD_EDGE')} 
                label="加边"
                simple
              />
              <ToolbarButton 
                icon={<Move size={18} />} 
                active={toolMode === 'MOVE'} 
                onClick={() => setToolMode('MOVE')} 
                label="平移"
                simple
              />
               <ToolbarButton 
                icon={<Trash2 size={18} />} 
                active={toolMode === 'DELETE'} 
                onClick={() => setToolMode('DELETE')} 
                label="删除"
                variant="danger"
                simple
              />
            </div>
          </div>

          {/* Steps / Info Section */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {algorithmState === 'IDLE' ? (
              <div>
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">项目详情</h2>
                <div className="space-y-4">
                  {!selectedNodeId && !selectedEdgeId && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                      <Info size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs text-slate-500">点击画布上的元素进行编辑</p>
                    </div>
                  )}
                  
                  {selectedNodeId && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/50">
                        <label className="text-[10px] font-bold uppercase text-slate-400">节点名称</label>
                        <input 
                          type="text" 
                          value={nodes.find(n => n.id === selectedNodeId)?.label || ''}
                          onChange={(e) => updateNodeLabel(selectedNodeId, e.target.value)}
                          className="mt-0.5 w-full border-none bg-transparent text-lg font-bold text-slate-800 focus:ring-0"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setStartNodeId(selectedNodeId)}
                          className={`rounded-lg py-2 text-xs font-bold transition-all shadow-sm ${startNodeId === selectedNodeId ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          设为起点
                        </button>
                        <button 
                          onClick={() => setEndNodeId(selectedNodeId)}
                          className={`rounded-lg py-2 text-xs font-bold transition-all shadow-sm ${endNodeId === selectedNodeId ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          设为终点
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedEdgeId && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/50">
                        <label className="text-[10px] font-bold uppercase text-slate-400">边权重 (Weight)</label>
                        <input 
                          type="number" 
                          value={edges.find(e => e.id === selectedEdgeId)?.weight || 0}
                          onChange={(e) => updateEdgeWeight(selectedEdgeId, parseInt(e.target.value))}
                          className="mt-0.5 w-full border-none bg-transparent text-lg font-bold text-slate-800 focus:ring-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-8">
                  <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">操作说明</h2>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/50 space-y-3">
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      <span className="font-bold text-slate-800">1.</span> 滚轮缩放，Shift + 拖动移动画布
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      <span className="font-bold text-slate-800">2.</span> 添加节点与边构建你的无向图
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      <span className="font-bold text-slate-800">3.</span> 选中节点设为算法的起点与终点
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Dijkstra 算法步骤</h2>
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-start gap-3 p-3 transition-all rounded-lg border ${
                        idx === currentStepIndex 
                          ? 'bg-blue-50 border-blue-100' 
                          : idx < currentStepIndex 
                            ? 'bg-white border-transparent opacity-60' 
                            : 'bg-white border-transparent opacity-30 grayscale'
                      }`}
                      onClick={() => setCurrentStepIndex(idx)}
                    >
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        idx === currentStepIndex ? 'bg-blue-500 text-white' : 'bg-slate-300 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className={`text-xs leading-relaxed ${idx === currentStepIndex ? 'text-blue-800 font-medium' : 'text-slate-500'}`}>
                        {step.message}
                      </p>
                    </div>
                  ))}
                  <div ref={(el) => { if (el && currentStepIndex >= 0) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            {algorithmState === 'IDLE' ? (
              <button 
                onClick={handleStartAlgorithm}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" /> 开始自动求解
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                   <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-black active:scale-95 transition shadow-md"
                  >
                    {isPlaying ? '暂停运行' : '继续运行'}
                  </button>
                  <button 
                    onClick={handleResetAlgorithm}
                    className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded-lg font-bold hover:bg-slate-100 active:scale-95 transition"
                  >
                    重置
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Graph Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg className="h-full w-full pointer-events-none">
            <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.k})`}>
              {/* Edges */}
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;

                const isPath = currentStep?.foundPath?.includes(edge.source) && 
                               currentStep?.foundPath?.includes(edge.target) &&
                               Math.abs(currentStep.foundPath.indexOf(edge.source) - currentStep.foundPath.indexOf(edge.target)) === 1;
                
                const isSelected = selectedEdgeId === edge.id;
                const isCurrent = currentStep?.currentNode === edge.source && currentStep?.currentNeighbor === edge.target ||
                                  currentStep?.currentNode === edge.target && currentStep?.currentNeighbor === edge.source;

                return (
                  <g key={edge.id}>
                    <line
                      x1={source.x} y1={source.y}
                      x2={target.x} y2={target.y}
                      stroke={isPath ? "#22c55e" : isCurrent ? "#3b82f6" : isSelected ? "#3b82f6" : "#cbd5e1"}
                      strokeWidth={isPath ? 4 : isCurrent ? 3 : isSelected ? 3 : 2}
                      strokeDasharray={isCurrent ? "4 4" : "none"}
                      className="transition-all duration-300"
                    />
                    <g transform={`translate(${(source.x + target.x) / 2}, ${(source.y + target.y) / 2})`}>
                      <rect
                        x="-12" y="-12"
                        width="24" height="24" rx="4"
                        fill="white" stroke="#e2e8f0"
                        className="shadow-sm"
                      />
                      <text
                        textAnchor="middle" dominantBaseline="middle"
                        className={`text-[10px] font-bold font-mono transition-colors ${isPath ? 'fill-green-600' : 'fill-slate-500'}`}
                      >
                        {edge.weight}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const isVisited = currentStep?.visited.has(node.id);
                const isCurrent = currentStep?.currentNode === node.id;
                const isNeighbor = currentStep?.currentNeighbor === node.id;
                const isStart = startNodeId === node.id;
                const isEnd = endNodeId === node.id;
                const isPath = currentStep?.foundPath?.includes(node.id);

                let nodeClass = "bg-white text-slate-700 border border-slate-200";
                if (isCurrent) nodeClass = "bg-blue-50 text-blue-700 border-blue-500 border-2 scale-110";
                else if (isPath) nodeClass = "bg-green-100 text-green-700 border-green-500 border-2 shadow-green-100";
                else if (isVisited) nodeClass = "bg-green-50 text-green-600 border-green-200 opacity-80";
                else if (isSelected) nodeClass = "border-blue-500 border-2";

                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <foreignObject x="-24" y="-24" width="48" height="48" className="overflow-visible">
                      <div className={`flex h-full w-full items-center justify-center rounded-full text-sm font-bold shadow-md transition-all duration-300 ${nodeClass}`}>
                        {node.label}
                      </div>
                    </foreignObject>
                    
                    {/* Distance label during algorithm */}
                    {algorithmState !== 'IDLE' && (
                      <g transform="translate(0, -38)">
                        <rect x="-24" y="-10" width="48" height="16" rx="4" fill="rgba(30, 41, 59, 0.9)" />
                        <text textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-white font-mono font-bold">
                          {currentStep?.distances[node.id] === Infinity ? '∞' : currentStep?.distances[node.id]}
                        </text>
                      </g>
                    )}

                    {/* Start/End marker */}
                    {(isStart || isEnd) && algorithmState === 'IDLE' && (
                      <text y="40" textAnchor="middle" className="text-[10px] fill-blue-600 font-bold uppercase tracking-widest">
                        {isStart ? '开始' : '结束'}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Interactive Preview for Edge creation */}
              {toolMode === 'ADD_EDGE' && edgeSourceId && (
                <line
                  x1={nodes.find(n => n.id === edgeSourceId)?.x || 0}
                  y1={nodes.find(n => n.id === edgeSourceId)?.y || 0}
                  x2={mouseWorldPos.x}
                  y2={mouseWorldPos.y}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth="2"
                />
              )}
            </g>
          </svg>

          {/* Canvas Floating Controls */}
          <div className="absolute bottom-6 right-6 flex items-center gap-3">
             {algorithmState !== 'IDLE' && (
                <div className="rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur shadow-xl w-64">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">节点状态 (起点: {nodes.find(n=>n.id===startNodeId)?.label})</h3>
                   <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="text-left pb-1">节点</th>
                          <th className="text-left pb-1">距离 (d)</th>
                          <th className="text-left pb-1">前驱 (p)</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-600 font-mono">
                        {nodes.map(n => (
                          <tr key={n.id} className={`border-b border-slate-50/50 ${currentStep?.currentNode === n.id ? 'bg-blue-50/50' : ''}`}>
                            <td className="py-1">{n.label}</td>
                            <td className={`py-1 ${currentStep?.distances[n.id] !== Infinity ? 'text-blue-600 font-bold' : ''}`}>
                              {currentStep?.distances[n.id] === Infinity ? '∞' : currentStep?.distances[n.id]}
                            </td>
                            <td className="py-1">{currentStep?.previous[n.id] ? nodes.find(prev => prev.id === currentStep.previous[n.id])?.label : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </div>
             )}

          </div>

          {/* Quick Playback Bar for Mobile/Floating */}
          {algorithmState !== 'IDLE' && (
            <div className="absolute bottom-6 left-[300px] right-[300px] flex justify-center pointer-events-none">
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-2.5 backdrop-blur-md shadow-2xl flex items-center gap-4 pointer-events-auto">
                    <button 
                      onClick={handleStepBackward}
                      disabled={currentStepIndex <= 0}
                      className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 transition"
                    >
                      <SkipBack size={18} />
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="rounded-xl bg-blue-600 px-4 py-1.5 text-white transition hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2"
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                      <span className="text-xs font-bold">{isPlaying ? '暂停' : '继续'}</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <button 
                      onClick={handleStepForward}
                      disabled={currentStepIndex >= steps.length - 1}
                      className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 transition"
                    >
                      <SkipForward size={18} />
                    </button>
                </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ToolbarButton({ icon, active, onClick, label, variant = 'primary', simple = false }: { 
  icon: React.ReactNode, 
  active: boolean, 
  onClick: () => void,
  label: string,
  variant?: 'primary' | 'danger',
  simple?: boolean
}) {
  if (simple) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all active:scale-95 ${
          active 
            ? variant === 'danger' ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-blue-600 border-blue-600 text-white shadow-md' 
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
      >
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition shadow-sm active:scale-90 ${
        active 
          ? variant === 'danger' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white' 
          : 'bg-white text-slate-400 border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="absolute left-14 hidden rounded bg-slate-800 px-2 py-1 text-[10px] text-white group-hover:block whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );
}

