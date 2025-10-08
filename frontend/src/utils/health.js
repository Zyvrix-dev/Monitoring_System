import { STATUS_DESCRIPTIONS, healthLabel } from '../constants/status';
import {
  formatConnections,
  formatLoad,
  formatPercent,
  formatThroughputPair
} from './formatters';

export const determineHealth = (metric) => {
  if (!metric) {
    return 'unknown';
  }

  const cpu = Number(metric.cpu) || 0;
  const memory = Number(metric.memory) || 0;
  const disk = Number(metric.disk) || 0;
  const connections = Number(metric.connections) || 0;
  const load1 = Number(metric.load1) || 0;
  const cores = Math.max(Number(metric.cpuCores) || 0, 1);
  const normalizedLoad = load1 / cores;

  if (
    cpu >= 90 ||
    memory >= 92 ||
    disk >= 93 ||
    normalizedLoad >= 2 ||
    connections >= 2000
  ) {
    return 'critical';
  }

  if (
    cpu >= 75 ||
    memory >= 82 ||
    disk >= 85 ||
    normalizedLoad >= 1.2 ||
    connections >= 1200
  ) {
    return 'warning';
  }

  return 'healthy';
};

export const createStatusEvent = (status, metric) => {
  const time = new Date(metric.timestamp || Date.now());
  const formattedTime = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const pieces = [];
  const cpuText = formatPercent(metric.cpu);
  if (cpuText !== '--') {
    pieces.push(`CPU ${cpuText}%`);
  }
  const memoryText = formatPercent(metric.memory);
  if (memoryText !== '--') {
    pieces.push(`Memory ${memoryText}%`);
  }
  const diskText = formatPercent(metric.disk);
  if (diskText !== '--') {
    pieces.push(`Disk ${diskText}%`);
  }
  const loadText = formatLoad(metric.load1);
  if (loadText !== '--') {
    pieces.push(`Load ${loadText} (1m)`);
  }
  const netText = formatThroughputPair(metric.netRx, metric.netTx);
  if (netText !== '--') {
    pieces.push(`Net ${netText}`);
  }
  const connectionText = formatConnections(metric.connections);
  if (connectionText !== '--') {
    pieces.push(`Connections ${connectionText}`);
  }

  const description = pieces.length ? pieces.join(', ') : 'No metrics reported';

  return {
    id: `${status}-${metric.timestamp || time.getTime()}`,
    status,
    title: healthLabel[status],
    description,
    details: STATUS_DESCRIPTIONS[status],
    timeLabel: formattedTime
  };
};

