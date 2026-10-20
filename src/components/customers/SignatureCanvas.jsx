import React, { useEffect, useRef, useState } from 'react';

const SignatureCanvas = ({ onChange, height = 280, initialValue }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [hasInk, setHasInk] = useState(!!initialValue);

  const setup = () => {
    const canvas = canvasRef.current;
    const box = containerRef.current;
    if (!canvas || !box) return;
    const w = Math.max(1, box.offsetWidth);
    const h = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8b5cf6';
    if (initialValue) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = initialValue;
    }
  };

  useEffect(() => {
    setup();
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, initialValue]);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
    onChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div className="space-y-2" dir="rtl">
      <div ref={containerRef} className="relative w-full rounded-2xl border-2 border-dashed border-violet-200 bg-white overflow-hidden">
        {!hasInk && (
          <p className="absolute inset-0 flex items-center justify-center text-stone-400 pointer-events-none text-sm">✍️ وقّعي هنا</p>
        )}
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={hasInk ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
          {hasInk ? 'تم التوقيع' : 'لا توقيع بعد'}
        </span>
        <button type="button" onClick={clear} className="text-rose-500 font-bold">مسح التوقيع</button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
