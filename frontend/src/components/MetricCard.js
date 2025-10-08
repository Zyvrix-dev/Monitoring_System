import React from 'react';

const trendIcon = {
  up: '▲',
  down: '▼',
  steady: '◆'
};

const trendLabel = {
  up: 'Increasing',
  down: 'Decreasing',
  steady: 'Stable'
};

function MetricCard({ title, value, unit, helper, trend, status, onSelect }) {
  const hasUnit = unit && unit.trim().length > 0;
  const visualStatus = status ? `metric-card--${status}` : 'metric-card--neutral';
  const formattedValue = value === null || value === undefined ? '--' : value;
  const showUnit = hasUnit && formattedValue !== '--';
  const interactive = typeof onSelect === 'function';

  const handleKeyDown = (event) => {
    if (!interactive) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={`metric-card ${visualStatus} ${interactive ? 'metric-card--interactive' : ''}`}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <header className="metric-card__header">
        <p className="metric-card__title">{title}</p>
      </header>
      <div className="metric-card__value-row">
        <span className="metric-card__value">{formattedValue}</span>
        {showUnit && <span className="metric-card__unit">{unit}</span>}
      </div>
      {helper && <p className="metric-card__helper">{helper}</p>}
      {trend && (
        <p className={`metric-card__trend metric-card__trend--${trend.direction}`}>
          <span
            className="metric-card__trend-icon"
            role="img"
            aria-label={trendLabel[trend.direction] || 'Trend'}
          >
            {trendIcon[trend.direction] || trendIcon.steady}
          </span>
          {trend.label}
        </p>
      )}
      {interactive && <span className="metric-card__action">View details</span>}
    </article>
  );
}

export default MetricCard;
