'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Pin, PinOff } from 'lucide-react';

interface DraggablePanelProps {
  id: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: React.ReactNode;
  className?: string;
  defaultPinned?: boolean;
  onCollision?: (overlappingIds: string[]) => void;
}

interface PanelState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function DraggablePanel({
  id,
  defaultPosition = { x: 16, y: 16 },
  defaultSize = { width: 320, height: 240 },
  children,
  className = '',
  defaultPinned = false,
  onCollision,
}: DraggablePanelProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isClient, setIsClient] = useState(false);
  const [isPinned, setIsPinned] = useState(defaultPinned);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved state from localStorage
  useEffect(() => {
    setIsClient(true);
    const savedPos = localStorage.getItem(`draggable_pos_${id}`);
    const savedSize = localStorage.getItem(`draggable_size_${id}`);
    
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch (e) {
        console.warn(`Failed to parse saved position for ${id}`);
      }
    }
    if (savedSize) {
      try {
        setSize(JSON.parse(savedSize));
      } catch (e) {
        console.warn(`Failed to parse saved size for ${id}`);
      }
    }
    const savedPin = localStorage.getItem(`draggable_pin_${id}`);
    if (savedPin) {
      setIsPinned(savedPin === 'true');
    }
  }, [id]);

  // Get all floating panels for collision detection
  const allPanels = useMemo(() => {
    const panels: PanelState[] = [];
    const panelElements = document.querySelectorAll('[data-draggable-panel]');
    panelElements.forEach((el) => {
      const id = el.getAttribute('data-draggable-panel');
      if (id) {
        const rect = el.getBoundingClientRect();
        panels.push({
          id,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    });
    // Filter out the current panel
    return panels.filter(p => p.id !== id);
  }, [isDragging, position, size, id]);

  // Check for collisions and notify parent
  useEffect(() => {
    if (!isPinned) {
      const overlapping = allPanels.filter((panel) => {
        return checkCollision(position, size, panel);
      });
      // Only notify if there's actual overlap
      if (overlapping.length > 0) {
        onCollision?.(overlapping.map((p) => p.id));
      }
    }
  }, [position, size, allPanels, isPinned, id, onCollision]);

  // Collision detection - checks if two rectangles overlap
  function checkCollision(
    pos1: { x: number; y: number },
    size1: { width: number; height: number },
    panel2: PanelState
  ): boolean {
    // Add a small padding to make collision detection more lenient (10px buffer)
    const padding = 10;
    return !(
      pos1.x + size1.width + padding <= panel2.x ||
      pos1.x - padding >= panel2.x + panel2.width ||
      pos1.y + size1.height + padding <= panel2.y ||
      pos1.y - padding >= panel2.y + panel2.height
    );
  }

  // Check if we're currently colliding with any other panel
  const isColliding = useMemo(() => {
    if (isPinned) return false;
    return allPanels.some(panel => checkCollision(position, size, panel));
  }, [position, size, allPanels, isPinned]);

  const handleStart = () => {
    setIsDragging(true);
  };

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    if (isPinned) return;
    
    // Keep panel within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = data.x;
    let newY = data.y;
    
    // Clamp to viewport (with 16px padding)
    if (newX < 16) newX = 16;
    if (newY < 16) newY = 16;
    if (newX + size.width > viewportWidth - 16) newX = viewportWidth - size.width - 16;
    if (newY + size.height > viewportHeight - 16) newY = viewportHeight - size.height - 16;
    
    const newPos = { x: newX, y: newY };
    
    // Check if the new position would still cause collision
    // Get current panel bounds for the check
    const currentPanel = {
      x: newPos.x,
      y: newPos.y,
      width: size.width,
      height: size.height
    };
    
    const wouldCollide = allPanels.some(panel => checkCollision(newPos, size, panel));
    
    // If we would still collide, try to find a better position
    if (wouldCollide) {
      // Try moving the panel vertically to find space
      let foundPosition = false;
      let tryY = newPos.y;
      
      while (tryY > 16 && !foundPosition) {
        tryY -= 40; // Move up in 40px increments
        const tryPos = { x: newPos.x, y: tryY };
        if (!allPanels.some(panel => checkCollision(tryPos, size, panel))) {
          newPos.y = tryY;
          foundPosition = true;
          break;
        }
      }
      
      // If still colliding, try moving horizontally
      if (!foundPosition) {
        let tryX = newPos.x;
        while (tryX < viewportWidth - size.width - 16 && !foundPosition) {
          tryX += 40; // Move right in 40px increments
          const tryPos = { x: tryX, y: newPos.y };
          if (!allPanels.some(panel => checkCollision(tryPos, size, panel))) {
            newPos.x = tryX;
            foundPosition = true;
            break;
          }
        }
      }
      
      // If still colliding, keep the original position
      if (!foundPosition) {
        // Snap back to last known good position
        const savedPos = localStorage.getItem(`draggable_pos_${id}`);
        if (savedPos) {
          try {
            newPos.x = JSON.parse(savedPos).x;
            newPos.y = JSON.parse(savedPos).y;
          } catch {
            // Keep the clamped position
          }
        }
      }
    }
    
    setPosition(newPos);
    localStorage.setItem(`draggable_pos_${id}`, JSON.stringify(newPos));
    setIsDragging(false);
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem(`draggable_pin_${id}`, String(newPinned));
  };

  if (!isClient) {
    return (
      <div className={`relative ${className}`} style={defaultSize}>
        {children}
      </div>
    );
  }

  // Pinned state: In natural page flow
  if (isPinned) {
    return (
      <div 
        className={`relative ${className} group`} 
        style={defaultSize}
        data-draggable-panel={id}
      >
        <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <button 
            onClick={togglePin} 
            className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors shadow-lg border border-white/20 backdrop-blur-sm"
            title="Unpin panel to float"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Floating state: Draggable via portal
  const floatingContent = (
    <Draggable
      position={position}
      onStart={handleStart}
      onStop={handleStop}
      handle=".drag-handle"
      cancel=".no-drag, button, a, input, select, textarea"
      grid={[8, 8]}
      scale={1}
    >
      <div 
        className={`absolute z-[100] shadow-2xl pointer-events-auto transition-shadow duration-200 ${className}`}
        style={{ 
          position: 'absolute',
          width: size.width,
          height: size.height,
        }}
        data-draggable-panel={id}
      >
        {/* Collision warning indicator */}
        {isColliding && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg z-30 animate-pulse" title="Panel overlap detected - dragging to resolve" />
        )}
        
        {/* Drag Handle */}
        <div className={`drag-handle w-full h-8 bg-[#1a1c1c]/90 hover:bg-[#2a2c2c]/95 cursor-move flex items-center justify-between px-3 rounded-t-md transition-colors relative border-b border-white/10 backdrop-blur-sm shadow-sm z-20 ${isColliding ? 'border-rose-500/30' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
            </div>
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider ml-2">Panel</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={togglePin} 
              className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title={isPinned ? "Pin panel back" : "Unpin panel to float"}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="bg-[#0b0f1a] overflow-auto"
          style={{ height: `calc(100% - 32px)` }}
        >
          {children}
        </div>
        
        {/* Visual indicator when dragging */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-t-md pointer-events-none z-50" />
        )}
      </div>
    </Draggable>
  );

  // Portal rendering
  let portalRoot = document.getElementById('floating-layer');
  if (!portalRoot) {
    portalRoot = document.body;
  }
  return createPortal(floatingContent, portalRoot);
}
