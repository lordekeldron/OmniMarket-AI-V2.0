import type { ProviderId } from '../../../omni/types/connectors';
import type { Adapter } from './common';
import { syncAdspirer } from './adspirer';
import { syncMetricool } from './metricool';
import { syncOpenSeo } from './openseo';
import { syncSupermetrics } from './supermetrics';

export const ADAPTERS: Record<ProviderId, Adapter> = {
  supermetrics: syncSupermetrics,
  metricool: syncMetricool,
  openseo: syncOpenSeo,
  adspirer: syncAdspirer,
};

export type { Adapter, AdapterContext, AdapterOutput } from './common';
