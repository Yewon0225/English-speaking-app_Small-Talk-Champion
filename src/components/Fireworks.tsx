import React, { useEffect, useState } from 'react';

export const Fireworks: React.FC = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#FBBF24'];
    const generated = Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 70,
      color: colors[i % colors.length],
      size: Math.floor(Math.random() * 7) + 5,
      delay: Math.random() * 0.8,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-bounce"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: '1.4s',
            opacity: 0.8,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
      {/* Decorative star bursts */}
      <span className="absolute top-4 left-6 text-amber-400 text-xl animate-spin duration-1000 opacity-80">✦</span>
      <span className="absolute top-6 right-8 text-yellow-400 text-2xl animate-pulse opacity-90">★</span>
      <span className="absolute top-16 left-12 text-rose-400 text-lg animate-ping opacity-60">✨</span>
      <span className="absolute top-12 right-16 text-sky-400 text-xl animate-bounce opacity-80">✧</span>
    </div>
  );
};
