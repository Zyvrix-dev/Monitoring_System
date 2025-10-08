import React, { useMemo } from "react";

import { generateOptimizationInsights } from "../utils/insights";

const severityIcon = {
  critical: "⛔",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

function OptimizationInsightsPanel({ latestMetric, stats }) {
  const insights = useMemo(
    () => generateOptimizationInsights({ latestMetric, stats }),
    [latestMetric, stats]
  );

  const hasInsights = insights.length > 0;

  return (
    <article className="panel" aria-label="Developer optimisation insights">
      <div className="panel__header">
        <div>
          <h2>Optimisation coach</h2>
          <p>
            Actionable guidance derived from the most recent performance sample.
          </p>
        </div>
      </div>
      {hasInsights ? (
        <ul className="insight-list" role="list">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`insight-list__item insight-list__item--${insight.severity}`}
            >
              <div className="insight-list__icon" aria-hidden="true">
                {severityIcon[insight.severity] || severityIcon.info}
              </div>
              <div className="insight-list__content">
                <h3 className="insight-list__title">{insight.title}</h3>
                <p className="insight-list__description">
                  {insight.description}
                </p>
                {insight.actions.length > 0 && (
                  <ul className="insight-actions">
                    {insight.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel__empty" role="status">
          <p>
            No optimisation insights available yet. Capture more samples to
            build recommendations.
          </p>
        </div>
      )}
    </article>
  );
}

export default OptimizationInsightsPanel;
