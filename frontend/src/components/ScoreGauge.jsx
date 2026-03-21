import { useEffect, useState } from 'react';
import './ScoreGauge.css';

function ScoreGauge({ score = 0, size = 120, label = '', strokeWidth = 10 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const target = Math.min(100, Math.max(0, score));
    const step = target / 40;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setAnimatedScore(Math.round(current));
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  const getColor = (s) => {
    if (s >= 90) return 'var(--success)';
    if (s >= 70) return 'var(--accent)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getColor(animatedScore);

  return (
    <div className="score-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="gauge-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="gauge-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-score" style={{ color, fontSize: size * 0.25 }}>
          {animatedScore}
        </span>
        {label && <span className="gauge-label">{label}</span>}
      </div>
    </div>
  );
}

export default ScoreGauge;
