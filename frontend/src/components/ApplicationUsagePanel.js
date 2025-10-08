import React, { useMemo, useState } from 'react';

import { formatMegabytes, formatPercentLabel } from '../utils/formatters';

const ACTIVE_CPU_THRESHOLD = 1;

const FILTERS = [
  {
    id: 'all',
    label: 'All processes',
    predicate: () => true
  },
  {
    id: 'active',
    label: 'Active',
    predicate: (app) => app.cpu >= ACTIVE_CPU_THRESHOLD
  },
  {
    id: 'background',
    label: 'Background',
    predicate: (app) => app.cpu < ACTIVE_CPU_THRESHOLD
  }
];

const getFilterCount = (counts, filterId) => {
  switch (filterId) {
    case 'active':
      return counts.active;
    case 'background':
      return counts.background;
    default:
      return counts.all;
  }
};

const buildFilterMessage = (filterId) => {
  if (filterId === 'active') {
    return 'No active processes detected in the latest sample. Waiting for CPU activity spikes.';
  }
  if (filterId === 'background') {
    return `No background processes below ${ACTIVE_CPU_THRESHOLD}% CPU were observed this cycle.`;
  }
  return 'No processes matched the current filter.';
};

function ApplicationUsagePanel({ applications }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const { filteredApplications, counts, selectedFilter } = useMemo(() => {
    const fallbackFilter = FILTERS[0];
    const filter = FILTERS.find((item) => item.id === activeFilter) || fallbackFilter;

    if (!Array.isArray(applications) || applications.length === 0) {
      return {
        filteredApplications: [],
        counts: { all: 0, active: 0, background: 0 },
        selectedFilter: filter
      };
    }

    const totals = { all: applications.length, active: 0, background: 0 };
    const normalised = applications.map((app) => {
      const cpu = Number(app?.cpu ?? 0);
      const memoryMb = Number(app?.memoryMb ?? 0);
      if (cpu >= ACTIVE_CPU_THRESHOLD) {
        totals.active += 1;
      } else {
        totals.background += 1;
      }

      return {
        ...app,
        cpu,
        memoryMb,
        commandLine: typeof app?.commandLine === 'string' ? app.commandLine : ''
      };
    });

    return {
      filteredApplications: normalised.filter((app) => filter.predicate(app)),
      counts: totals,
      selectedFilter: filter
    };
  }, [applications, activeFilter]);

  const hasData = counts.all > 0;
  const hasFilteredRows = filteredApplications.length > 0;

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Application utilisation</h2>
          <p>Top processes ranked by CPU saturation with resident memory usage.</p>
        </div>
      </div>
      <div className="application-usage__controls">
        <div className="application-usage__filters" role="group" aria-label="Filter processes by activity">
          {FILTERS.map((filter) => {
            const isActive = filter.id === selectedFilter.id;
            return (
              <button
                key={filter.id}
                type="button"
                className={`application-usage__filter${isActive ? ' application-usage__filter--active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={isActive}
                disabled={!hasData && filter.id !== 'all'}
              >
                {filter.label}
                <span className="application-usage__filter-count">{getFilterCount(counts, filter.id)}</span>
              </button>
            );
          })}
        </div>
        {hasData ? (
          <div className="application-usage__meta" role="status">
            <span>
              Showing {filteredApplications.length} of {counts.all} processes
              {selectedFilter.id !== 'all' ? ` · ${selectedFilter.label}` : ''}
            </span>
            <span>
              Active: {counts.active} · Background: {counts.background}
            </span>
          </div>
        ) : null}
      </div>
      {hasData ? (
        hasFilteredRows ? (
          <div className="panel__table-wrapper">
            <table className="detail-table" aria-label="Top application resource usage">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">CPU</th>
                  <th scope="col">Memory</th>
                  <th scope="col">PID</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const displayName = app.name || `Process ${app.pid}`;
                  const commandLine = app.commandLine && app.commandLine !== displayName ? app.commandLine : '';
                  return (
                    <tr key={`${app.pid}-${displayName}`}>
                      <th scope="row">
                        <div className="entity-name">{displayName}</div>
                        <div className="entity-meta">
                          PID {app.pid}
                          {commandLine ? (
                            <span className="entity-meta__command" title={app.commandLine}>
                              {commandLine}
                            </span>
                          ) : null}
                        </div>
                      </th>
                      <td>{formatPercentLabel(app.cpu)}</td>
                      <td>{formatMegabytes(app.memoryMb)}</td>
                      <td>{app.pid}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel__empty" role="status">
            <p>{buildFilterMessage(selectedFilter.id)}</p>
          </div>
        )
      ) : (
        <div className="panel__empty" role="status">
          <p>No processes sampled yet. Waiting for activity.</p>
        </div>
      )}
    </article>
  );
}

export default ApplicationUsagePanel;

