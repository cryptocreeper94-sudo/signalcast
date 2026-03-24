import React, { useState, useEffect, useCallback } from 'react';

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  accent?: string;
}

const SLIDES: Slide[] = [
  {
    image: '/images/slide1.png',
    title: 'Mission Control',
    subtitle: 'Your real-time social media command center — monitor, compose, and deploy across 9 platforms',
    accent: 'var(--accent)',
  },
  {
    image: '/images/slide2.png',
    title: 'Broadcast Everything',
    subtitle: 'One signal reaches every platform simultaneously — write once, publish everywhere instantly',
    accent: 'var(--accent-dim)',
  },
  {
    image: '/images/slide3.png',
    title: 'AI-Powered Automation',
    subtitle: 'Smart scheduling analyzes optimal posting times across the Trust Layer ecosystem',
    accent: '#8a5cf6',
  },
  {
    image: '/images/slide4.png',
    title: 'Real-Time Analytics',
    subtitle: 'Track deploy success rates, platform performance, and content engagement at a glance',
    accent: 'var(--accent)',
  },
  {
    image: '/images/slide5.png',
    title: 'Worldwide Reach',
    subtitle: 'Connect your brand to audiences across every continent through the Trust Layer platform network',
    accent: '#00b4d8',
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number, dir?: 'next' | 'prev') => {
    if (isTransitioning || index === current) return;
    setDirection(dir || (index > current ? 'next' : 'prev'));
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, [current, isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length, 'next');
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length, 'prev');
  }, [current, goTo]);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div className="hero-slideshow">
      {/* Slide */}
      <div className={`hero-slide ${isTransitioning ? 'transitioning' : 'active'}`}>
        <img src={slide.image} alt={slide.title} draggable={false} />
        <div className="hero-slide-overlay">
          <div className="hero-slide-content">
            <div className="hero-slide-badge">📡 SignalCast</div>
            <h2 className="hero-slide-title" style={{ '--slide-accent': slide.accent || 'var(--accent)' } as React.CSSProperties}>
              {slide.title}
            </h2>
            <p className="hero-slide-subtitle">{slide.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button className="hero-slide-arrow hero-slide-arrow-left" onClick={prev} aria-label="Previous slide">
        ‹
      </button>
      <button className="hero-slide-arrow hero-slide-arrow-right" onClick={next} aria-label="Next slide">
        ›
      </button>

      {/* Dots */}
      <div className="hero-slide-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`hero-slide-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="hero-slide-progress">
        <div
          className="hero-slide-progress-bar"
          key={current}
          style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }}
        />
      </div>
    </div>
  );
}
