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
    ctx.strokeStyle = '#059669';
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
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg border border-dashed border-[#C6EEEE] bg-[#F8FBFC]">
        {!hasInk && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-[#94A3B8]">وقّعي هنا</p>
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
      <div className="flex items-center justify-between text-[11px]">
        <span className={hasInk ? 'font-bold text-[#047857]' : 'text-[#94A3B8]'}>
          {hasInk ? 'تم التوقيع' : 'لا توقيع بعد'}
        </span>
        <button type="button" onClick={clear} className="font-bold text-[#B91C1C]">مسح التوقيع</button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
