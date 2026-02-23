import React, { useState, useEffect, useRef } from 'react';

interface ElevatorCutsceneProps {
  onComplete: () => void;
}

const RADIO_LINES = [
  { delay: 2500, text: '📻 *ksssh* ...mottagare, hör ni mig?', speaker: 'HQ' },
  { delay: 5500, text: '📻 Ni går ner till Objekt Z-14. Underjordisk depå.', speaker: 'HQ' },
  { delay: 9000, text: '📻 Hitta exfiltreringskoden och kom ut levande.', speaker: 'HQ' },
  { delay: 12000, text: '📻 Vi vet inte vad som väntar där nere... Lycka till.', speaker: 'HQ' },
  { delay: 15000, text: '📻 *ksssh* ...signal förlorad.', speaker: 'HQ' },
];

export const ElevatorCutscene: React.FC<ElevatorCutsceneProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'dark' | 'elevator' | 'opening' | 'done'>('dark');
  const [floorNumber, setFloorNumber] = useState(0);
  const [radioLines, setRadioLines] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [lightFlicker, setLightFlicker] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(0); // 0-100%
  const [canSkip, setCanSkip] = useState(false);
  const startTimeRef = useRef(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Skip after 2 seconds
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Phase sequencing
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Dark to elevator
    timers.push(setTimeout(() => setPhase('elevator'), 1500));

    // Floor counter
    const floors = [-1, -2, -3, -4, -5, -6, -7];
    floors.forEach((f, i) => {
      timers.push(setTimeout(() => {
        setFloorNumber(f);
        setShake(true);
        setTimeout(() => setShake(false), 200);
      }, 3000 + i * 1800));
    });

    // Light flickers
    for (let i = 0; i < 8; i++) {
      timers.push(setTimeout(() => {
        setLightFlicker(true);
        setTimeout(() => setLightFlicker(false), 100 + Math.random() * 150);
      }, 4000 + i * 2200 + Math.random() * 800));
    }

    // Radio lines
    RADIO_LINES.forEach(line => {
      timers.push(setTimeout(() => {
        setRadioLines(prev => [...prev, line.text]);
      }, line.delay));
    });

    // Doors open
    timers.push(setTimeout(() => {
      setPhase('opening');
      let progress = 0;
      const doorInterval = setInterval(() => {
        progress += 2;
        setDoorsOpen(progress);
        if (progress >= 100) {
          clearInterval(doorInterval);
          setTimeout(() => {
            setPhase('done');
            onComplete();
          }, 800);
        }
      }, 30);
    }, 17000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Render elevator interior on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      if (phase === 'dark') {
        ctx.fillStyle = '#0a0a08';
        ctx.fillRect(0, 0, w, h);
        return;
      }

      // Elevator background — industrial metal
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#2a2a25');
      bgGrad.addColorStop(0.5, '#222220');
      bgGrad.addColorStop(1, '#1a1a18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Wall panels
      const panelW = w * 0.4;
      const panelH = h * 0.7;
      const panelY = h * 0.12;
      
      // Left wall panel
      ctx.fillStyle = '#333330';
      ctx.fillRect(20, panelY, panelW - 40, panelH);
      ctx.strokeStyle = '#444440';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, panelY, panelW - 40, panelH);
      
      // Rivets
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 2; rx++) {
          const rivX = 30 + rx * (panelW - 60);
          const rivY = panelY + 15 + ry * (panelH / 4);
          ctx.fillStyle = '#555550';
          ctx.beginPath();
          ctx.arc(rivX, rivY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#666660';
          ctx.beginPath();
          ctx.arc(rivX - 0.5, rivY - 0.5, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Right wall panel
      const rpX = w - panelW + 20;
      ctx.fillStyle = '#333330';
      ctx.fillRect(rpX, panelY, panelW - 40, panelH);
      ctx.strokeStyle = '#444440';
      ctx.lineWidth = 2;
      ctx.strokeRect(rpX, panelY, panelW - 40, panelH);

      // Right rivets
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 2; rx++) {
          const rivX = rpX + 10 + rx * (panelW - 60);
          const rivY = panelY + 15 + ry * (panelH / 4);
          ctx.fillStyle = '#555550';
          ctx.beginPath();
          ctx.arc(rivX, rivY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Elevator doors (center)
      const doorW = w * 0.28;
      const doorH = h * 0.75;
      const doorY = h * 0.1;
      const doorCenterX = w / 2;
      const gap = (doorsOpen / 100) * doorW;

      // Behind doors — dark corridor
      if (doorsOpen > 0) {
        const corrGrad = ctx.createLinearGradient(doorCenterX - doorW, 0, doorCenterX + doorW, 0);
        corrGrad.addColorStop(0, '#0a0a08');
        corrGrad.addColorStop(0.5, '#151512');
        corrGrad.addColorStop(1, '#0a0a08');
        ctx.fillStyle = corrGrad;
        ctx.fillRect(doorCenterX - doorW, doorY, doorW * 2, doorH);
        
        // Corridor depth lines
        if (doorsOpen > 30) {
          ctx.strokeStyle = 'rgba(80, 80, 60, 0.15)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 5; i++) {
            const lx = doorCenterX - doorW * 0.8 + i * doorW * 0.4;
            ctx.beginPath();
            ctx.moveTo(lx, doorY);
            ctx.lineTo(lx, doorY + doorH);
            ctx.stroke();
          }
        }
      }

      // Left door
      ctx.fillStyle = '#4a4a45';
      ctx.fillRect(doorCenterX - doorW + gap * 0.02, doorY, doorW - gap, doorH);
      ctx.strokeStyle = '#3a3a35';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorCenterX - doorW + gap * 0.02, doorY, doorW - gap, doorH);
      // Door handle
      if (doorsOpen < 50) {
        ctx.fillStyle = '#666660';
        ctx.beginPath();
        ctx.roundRect(doorCenterX - 8, doorY + doorH * 0.45, 5, 30, 2);
        ctx.fill();
      }

      // Right door
      ctx.fillStyle = '#4a4a45';
      ctx.fillRect(doorCenterX + gap, doorY, doorW - gap, doorH);
      ctx.strokeStyle = '#3a3a35';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorCenterX + gap, doorY, doorW - gap, doorH);
      // Door handle
      if (doorsOpen < 50) {
        ctx.fillStyle = '#666660';
        ctx.beginPath();
        ctx.roundRect(doorCenterX + 3, doorY + doorH * 0.45, 5, 30, 2);
        ctx.fill();
      }

      // Door seam shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(doorCenterX - 1, doorY, 2, doorH);

      // Floor indicator panel (above doors)
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(doorCenterX - 40, doorY - 45, 80, 35);
      ctx.strokeStyle = '#555550';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(doorCenterX - 40, doorY - 45, 80, 35);

      // Floor number
      const displayFloor = floorNumber === 0 ? '—' : `B${Math.abs(floorNumber)}`;
      ctx.fillStyle = floorNumber < -4 ? '#ff4433' : '#ff8844';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayFloor, doorCenterX, doorY - 27);

      // Down arrow
      const arrowBlink = Math.sin(Date.now() * 0.005) > 0;
      if (arrowBlink && phase === 'elevator') {
        ctx.fillStyle = '#ff6644';
        ctx.font = '14px sans-serif';
        ctx.fillText('▼', doorCenterX + 30, doorY - 27);
      }

      // Ceiling light
      const lightOn = !lightFlicker;
      if (lightOn) {
        const lightGrad = ctx.createRadialGradient(w / 2, 0, 10, w / 2, 0, w * 0.6);
        lightGrad.addColorStop(0, 'rgba(255, 240, 200, 0.08)');
        lightGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, w, h);
      }
      // Light fixture
      ctx.fillStyle = lightOn ? '#aaa890' : '#444440';
      ctx.fillRect(w / 2 - 25, 0, 50, 8);
      ctx.fillStyle = lightOn ? 'rgba(255, 240, 200, 0.6)' : 'rgba(100, 100, 80, 0.3)';
      ctx.fillRect(w / 2 - 18, 8, 36, 4);

      // Floor — metal grate
      ctx.fillStyle = '#2a2a25';
      ctx.fillRect(0, h * 0.85, w, h * 0.15);
      ctx.strokeStyle = '#3a3a35';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, h * 0.85);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = h * 0.85; gy < h; gy += 12) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Warning sign on left wall
      ctx.fillStyle = '#aa8822';
      ctx.fillRect(50, panelY + panelH * 0.3, panelW * 0.4, panelW * 0.25);
      ctx.strokeStyle = '#886611';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, panelY + panelH * 0.3, panelW * 0.4, panelW * 0.25);
      ctx.fillStyle = '#111';
      ctx.font = `bold ${Math.min(14, panelW * 0.08)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠ FARA', 50 + panelW * 0.2, panelY + panelH * 0.3 + panelW * 0.1);
      ctx.font = `${Math.min(9, panelW * 0.05)}px sans-serif`;
      ctx.fillText('OBEHÖRIGA ÄGER', 50 + panelW * 0.2, panelY + panelH * 0.3 + panelW * 0.17);
      ctx.fillText('EJ TILLTRÄDE', 50 + panelW * 0.2, panelY + panelH * 0.3 + panelW * 0.22);

      // Scanlines overlay
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1);
      }
    };

    draw();
    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, [phase, floorNumber, lightFlicker, doorsOpen]);

  if (phase === 'done') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black cursor-pointer select-none"
      onClick={() => canSkip && onComplete()}
      style={{
        transform: shake ? `translate(${(Math.random() - 0.5) * 6}px, ${(Math.random() - 0.5) * 4}px)` : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={500}
        className="w-full max-w-md h-auto"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Radio messages */}
      <div className="absolute bottom-16 left-4 right-4 max-w-lg mx-auto flex flex-col gap-1.5">
        {radioLines.map((line, i) => (
          <div
            key={i}
            className="text-xs sm:text-sm font-mono animate-fade-in"
            style={{
              color: i === radioLines.length - 1 ? '#ccddaa' : '#778866',
              textShadow: i === radioLines.length - 1 ? '0 0 8px rgba(150, 200, 100, 0.4)' : 'none',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Skip hint */}
      {canSkip && (
        <div className="absolute bottom-4 right-4 text-[10px] text-muted-foreground/40 font-mono animate-fade-in">
          Klicka för att hoppa över
        </div>
      )}

      {/* Title card */}
      {phase === 'dark' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="text-2xl sm:text-4xl font-bold tracking-[0.3em] text-muted-foreground/60 mb-2" style={{ fontFamily: 'monospace' }}>
              OBJEKT Z-14
            </div>
            <div className="text-xs sm:text-sm tracking-[0.15em] text-muted-foreground/30" style={{ fontFamily: 'monospace' }}>
              UNDERJORDISK DEPÅ
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
