export type Deployment = {
  id?: string;
  name?: string;
  flow_id?: string;
  status?: string;
  paused?: boolean;
  tags?: string[];
  description?: string;
  created?: string;
  updated?: string;
  work_pool_name?: string;
  work_queue_name?: string;
  parameter_openapi_schema?: Record<string, unknown> | null;
  parameters?: Record<string, unknown>;
};
