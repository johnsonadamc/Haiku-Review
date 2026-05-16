'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';

export type PageCurlHandle = {
  triggerCurl: (onMidpoint: () => void) => void;
};

function drawCurl(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
  const px = W * (1 - t);
  const py = H * (1 - t * 0.7);

  ctx.clearRect(0, 0, W, H);

  // Revealed parchment underneath the peeling page
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.lineTo(px, H);
  ctx.quadraticCurveTo(px, py, W, py * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#ede6d6';
  ctx.fill();

  // Shadow depth along the curl
  const grad = ctx.createRadialGradient(px, py, 0, px, py, W * 0.4);
  grad.addColorStop(0, 'rgba(30,26,20,0.18)');
  grad.addColorStop(1, 'rgba(30,26,20,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Highlight line along the fold edge
  ctx.beginPath();
  ctx.moveTo(px, H);
  ctx.quadraticCurveTo(px, py, W, py * 0.3);
  ctx.strokeStyle = 'rgba(245,240,232,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

const PageCurl = forwardRef<PageCurlHandle, object>(function PageCurl(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    triggerCurl(onMidpoint: () => void) {
      const canvas = canvasRef.current;
      if (!canvas) { onMidpoint(); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { onMidpoint(); return; }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Set canvas resolution to match the viewport
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;

      const DURATION = 500;
      let start: number | null = null;
      let midpointFired = false;

      const animate = (ts: number) => {
        if (start === null) start = ts;
        const t = Math.min((ts - start) / DURATION, 1);

        drawCurl(ctx, t, W, H);

        if (!midpointFired && t >= 0.6) {
          midpointFired = true;
          onMidpoint();
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, W, H);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    },
  }), []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    />
  );
});

export default PageCurl;
