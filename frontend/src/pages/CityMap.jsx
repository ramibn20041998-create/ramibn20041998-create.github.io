import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { LAND_LEVELS } from '../lib/constants';
import LandModal from '../components/Land/LandModal';
import Spinner from '../components/UI/Spinner';

const GRID_SIZE = 1000;
const CANVAS_SIZE = 600; // logical pixels (scaled by devicePixelRatio when drawing)
const MIN_CELLS_ACROSS = 10;
const MAX_CELLS_ACROSS = 100;

export default function CityMap() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [center, setCenter] = useState({ x: 500, y: 500 });
  const [cellsAcross, setCellsAcross] = useState(40);
  const [landsById, setLandsById] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLandId, setSelectedLandId] = useState(searchParams.get('land') || null);

  const dragState = useRef(null);

  const bounds = getBounds(center, cellsAcross);

  const fetchRegion = useCallback(async (b) => {
    setLoading(true);
    try {
      const res = await api.getLandsInRegion(b.xMin, b.xMax, b.yMin, b.yMax);
      const map = {};
      res.lands.forEach((l) => {
        map[l.landId] = l;
      });
      setLandsById(map);
    } catch (e) {
      // non-fatal - map just shows empty plots
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const b = getBounds(center, cellsAcross);
    fetchRegion(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(center.x / 5), Math.round(center.y / 5), cellsAcross]);

  // ---- Drawing ----
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landsById, center, cellsAcross]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cellSize = CANVAS_SIZE / cellsAcross;
    const b = getBounds(center, cellsAcross);

    ctx.fillStyle = '#0b1322';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let x = b.xMin; x <= b.xMax; x++) {
      for (let y = b.yMin; y <= b.yMax; y++) {
        const landId = `${x}-${y}`;
        const land = landsById[landId];
        const px = (x - b.xMin) * cellSize;
        const py = (y - b.yMin) * cellSize;

        ctx.fillStyle = land ? LAND_LEVELS[land.level]?.color || '#6b7280' : '#1a2438';
        ctx.fillRect(px, py, cellSize - 0.5, cellSize - 0.5);

        if (land?.forSale) {
          ctx.strokeStyle = '#f4af00';
          ctx.lineWidth = Math.max(1, cellSize * 0.08);
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    if (cellSize > 14) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= cellsAcross; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(CANVAS_SIZE, i * cellSize);
        ctx.stroke();
      }
    }
  }

  // ---- Interaction ----
  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, startCenter: { ...center }, moved: false };
  }

  function handlePointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;

    const cellSize = CANVAS_SIZE / cellsAcross;
    const gridDx = dx / cellSize;
    const gridDy = dy / cellSize;

    setCenter(
      clampCenter(
        {
          x: dragState.current.startCenter.x - gridDx,
          y: dragState.current.startCenter.y - gridDy,
        },
        cellsAcross
      )
    );
  }

  function handlePointerUp(e) {
    if (dragState.current && !dragState.current.moved) {
      handleTap(e);
    }
    dragState.current = null;
  }

  function handleTap(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cellSize = CANVAS_SIZE / cellsAcross;
    const b = getBounds(center, cellsAcross);
    const x = b.xMin + Math.floor(clickX / cellSize);
    const y = b.yMin + Math.floor(clickY / cellSize);
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    setSelectedLandId(`${x}-${y}`);
  }

  function zoomIn() {
    setCellsAcross((c) => Math.max(MIN_CELLS_ACROSS, Math.round(c * 0.7)));
  }
  function zoomOut() {
    setCellsAcross((c) => Math.min(MAX_CELLS_ACROSS, Math.round(c / 0.7)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">City Map</h1>
        <div className="flex gap-2">
          <button onClick={zoomOut} className="btn-secondary w-9 h-9 flex items-center justify-center text-lg">−</button>
          <button onClick={zoomIn} className="btn-secondary w-9 h-9 flex items-center justify-center text-lg">+</button>
        </div>
      </div>

      <div ref={containerRef} className="relative card p-2 select-none touch-none">
        {loading && (
          <div className="absolute top-3 right-3 z-10"><Spinner size={18} /></div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, maxWidth: '100%', touchAction: 'none' }}
          className="rounded-xl mx-auto block cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => (dragState.current = null)}
        />
        <p className="text-center text-xs text-white/30 mt-2">
          Viewing ({bounds.xMin},{bounds.yMin}) – ({bounds.xMax},{bounds.yMax}) · drag to pan
        </p>
      </div>

      <div className="card p-3">
        <p className="text-xs font-semibold text-white/60 mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(LAND_LEVELS).map(([lvl, info]) => (
            <div key={lvl} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: info.color }} />
              {info.name}
            </div>
          ))}
        </div>
      </div>

      {selectedLandId && (
        <LandModal
          landId={selectedLandId}
          onClose={() => setSelectedLandId(null)}
          onChanged={() => fetchRegion(bounds)}
        />
      )}
    </div>
  );
}

function getBounds(center, cellsAcross) {
  const half = Math.floor(cellsAcross / 2);
  let xMin = Math.round(center.x - half);
  let yMin = Math.round(center.y - half);
  xMin = Math.max(0, Math.min(GRID_SIZE - cellsAcross, xMin));
  yMin = Math.max(0, Math.min(GRID_SIZE - cellsAcross, yMin));
  return { xMin, xMax: xMin + cellsAcross - 1, yMin, yMax: yMin + cellsAcross - 1 };
}

function clampCenter(center, cellsAcross) {
  const half = cellsAcross / 2;
  return {
    x: Math.max(half, Math.min(GRID_SIZE - half, center.x)),
    y: Math.max(half, Math.min(GRID_SIZE - half, center.y)),
  };
}
