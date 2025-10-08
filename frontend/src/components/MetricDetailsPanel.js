import React, { useEffect, useState } from 'react';

function MetricDetailsPanel({ metric, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [metric?.id]);

  if (!metric) {
    return null;
  }

  const { title, headline, summary = [], description, items = [] } = metric;
  const activeItem = items.length ? items[Math.min(activeIndex, items.length - 1)] : null;

  const handleNext = () => {
    if (items.length < 2) {
      return;
    }
    setActiveIndex((index) => (index + 1) % items.length);
  };

  const handlePrev = () => {
    if (items.length < 2) {
      return;
    }
    setActiveIndex((index) => (index - 1 + items.length) % items.length);
  };

  return (
    <aside className="metric-details" aria-live="polite">
      <header className="metric-details__header">
        <div>
          <p className="metric-details__eyebrow">Metric spotlight</p>
          <h2>{title}</h2>
          {headline && <p className="metric-details__headline">{headline}</p>}
        </div>
        <button type="button" className="metric-details__close" onClick={onClose} aria-label="Close metric details">
          ×
        </button>
      </header>

      {description && <p className="metric-details__description">{description}</p>}

      {summary.length > 0 && (
        <dl className="metric-details__summary">
          {summary.map((item) => (
            <div key={item.label} className="metric-details__summary-item">
              <dt>{item.label}</dt>
              <dd>
                <span>{item.value}</span>
                {item.description && <small>{item.description}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {items.length > 0 && (
        <section className="metric-details__items" aria-label="Metric entries">
          <header className="metric-details__items-header">
            <h3>Entries</h3>
            <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
          </header>
          <div className="metric-details__carousel">
            <button
              type="button"
              className="metric-details__nav"
              onClick={handlePrev}
              disabled={items.length < 2}
              aria-label="Previous entry"
            >
              ‹
            </button>
            <div className="metric-details__item">
              {activeItem ? (
                <>
                  <h4>{activeItem.title}</h4>
                  {activeItem.subtitle && <p className="metric-details__item-subtitle">{activeItem.subtitle}</p>}
                  {activeItem.description && <p className="metric-details__item-description">{activeItem.description}</p>}
                </>
              ) : (
                <p className="metric-details__item-empty">Waiting for live samples…</p>
              )}
            </div>
            <button
              type="button"
              className="metric-details__nav"
              onClick={handleNext}
              disabled={items.length < 2}
              aria-label="Next entry"
            >
              ›
            </button>
          </div>
          {items.length > 1 && (
            <div className="metric-details__dots" role="tablist" aria-label="Select metric entry">
              {items.map((item, index) => (
                <button
                  key={item.id || item.title || index}
                  type="button"
                  className={`metric-details__dot ${index === activeIndex ? 'metric-details__dot--active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View entry ${index + 1}: ${item.title || item.id || 'item'}`}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </aside>
  );
}

export default MetricDetailsPanel;
