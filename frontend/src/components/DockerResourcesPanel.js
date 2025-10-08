import React from "react";

import { formatBoolean, formatCount } from "../utils/formatters";

function DockerResourcesPanel({ dockerAvailable, containers, images }) {
  const hasContainers = Array.isArray(containers) && containers.length > 0;
  const hasImages = Array.isArray(images) && images.length > 0;

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <h2>Docker resources</h2>
          <p>Runtime inventory for local container workloads.</p>
        </div>
        <div className="panel__helper" aria-live="polite">
          CLI available: {formatBoolean(dockerAvailable)}
        </div>
      </div>
      {dockerAvailable ? (
        <>
          <section aria-label="Running containers">
            <h3>Containers ({formatCount(containers?.length ?? 0)})</h3>
            {hasContainers ? (
              <div className="panel__table-wrapper">
                <table className="detail-table" aria-label="Docker containers">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Image</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id || container.name}>
                        <th scope="row">
                          <div className="entity-name">
                            {container.name ||
                              container.id ||
                              "Unnamed container"}
                          </div>
                          <div className="entity-meta">{container.id}</div>
                        </th>
                        <td>{container.image || "Unknown image"}</td>
                        <td>{container.status || "Unknown"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel__empty" role="status">
                <p>No running containers detected.</p>
              </div>
            )}
          </section>
          <section aria-label="Available images">
            <h3>Images ({formatCount(images?.length ?? 0)})</h3>
            {hasImages ? (
              <div className="panel__table-wrapper">
                <table className="detail-table" aria-label="Docker images">
                  <thead>
                    <tr>
                      <th scope="col">Repository</th>
                      <th scope="col">Tag</th>
                      <th scope="col">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((image) => (
                      <tr key={`${image.repository}-${image.id}`}>
                        <th scope="row">
                          <div className="entity-name">
                            {image.repository || "Unnamed repo"}
                          </div>
                          <div className="entity-meta">{image.id}</div>
                        </th>
                        <td>{image.tag || "latest"}</td>
                        <td>{image.size || "Unknown"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel__empty" role="status">
                <p>No Docker images reported.</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="panel__empty" role="status">
          <p>Docker CLI is not available or not accessible for this user.</p>
        </div>
      )}
    </article>
  );
}

export default DockerResourcesPanel;
