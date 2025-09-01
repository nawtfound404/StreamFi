// Analytics & Insights (stubs)
export type MetricPoint = { t: number; viewers: number; donations: number };

export const analytics = {
  async getLiveMetrics(): Promise<MetricPoint[]> {
    return Array.from({ length: 20 }).map((_, i) => ({ t: i, viewers: 100 + i * 3, donations: i % 3 }));
  },
};
