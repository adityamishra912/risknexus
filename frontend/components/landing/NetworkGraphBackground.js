'use client';

import React, { useEffect, useRef } from 'react';

export default function NetworkGraphBackground({ density = 65, interactive = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Draw static subtle network once
      drawStaticNetwork(ctx, width, height);
      return;
    }

    const mouse = { x: -1000, y: -1000, radius: 180 };

    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Initialize nodes
    const nodeCount = Math.floor((width * height) / 18000) || density;
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        isCritical: Math.random() < 0.12, // 12% critical nodes
      });
    }

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        loop(performance.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (!isVisible) return;
      animationFrameId = requestAnimationFrame(loop);

      // Cap at ~60fps
      const delta = currentTime - lastTime;
      if (delta < 15) return;
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // Draw background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#05070a');
      bgGrad.addColorStop(1, '#0b0f17');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        node.pulse += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.8;

        // Mouse interaction parallax / attraction
        const dxMouse = mouse.x - node.x;
        const dyMouse = mouse.y - node.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const isNearMouse = distMouse < mouse.radius;

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = node.x - nodeB.x;
          const dy = node.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = isNearMouse ? 160 : 110;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isNearMouse ? 0.45 : 0.2);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(nodeB.x, nodeB.y);

            if (isNearMouse || node.isCritical || nodeB.isCritical) {
              ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`; // Electric teal cyan
              ctx.lineWidth = 1.2;
            } else {
              ctx.strokeStyle = `rgba(30, 41, 59, ${alpha * 2})`;
              ctx.lineWidth = 0.8;
            }
            ctx.stroke();
          }
        }

        // Draw Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, currentRadius), 0, Math.PI * 2);

        if (node.isCritical) {
          ctx.fillStyle = '#f59e0b'; // Amber critical node
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
        } else if (isNearMouse) {
          ctx.fillStyle = '#38bdf8'; // Electric cyan
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    loop(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  );
}

function drawStaticNetwork(ctx, width, height) {
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = x1 + (Math.random() - 0.5) * 200;
    const y2 = y1 + (Math.random() - 0.5) * 200;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
