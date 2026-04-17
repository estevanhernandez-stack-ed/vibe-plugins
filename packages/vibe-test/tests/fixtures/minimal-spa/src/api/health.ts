/**
 * Tiny fetch wrapper — demonstrates an integration surface the scanner picks
 * up without pulling in a real backend.
 */
export interface HealthResponse {
  ok: boolean;
  version: string;
}

export async function fetchHealth(baseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`health check failed: ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
