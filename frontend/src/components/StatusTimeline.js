import React from 'react';

function StatusTimeline({ events }) {
  if (!events.length) {
    return <p className="timeline__empty">Awaiting health updates…</p>;
  }

  return (
    <ul className="timeline" aria-live="polite">
      {events.map((event) => (
        <li key={event.id} className={`timeline__item timeline__item--${event.status}`}>
          <div className="timeline__marker" aria-hidden="true" />
          <div className="timeline__content">
            <div className="timeline__meta">
              <span className="timeline__status">{event.title}</span>
              <time className="timeline__time">{event.timeLabel}</time>
            </div>
            <p className="timeline__description">{event.details}</p>
            <p className="timeline__metrics">{event.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default StatusTimeline;
