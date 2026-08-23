import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import type { PortfolioServiceItem, RepositoryResult } from "./types";

class ServicesRepository extends BaseRepository {
  constructor() {
    super("ServicesRepository");
  }

  /**
   * Fetches the list of active portfolio microservices and operational health.
   */
  public async getServices(): Promise<RepositoryResult<PortfolioServiceItem[]>> {
    return this.executeQuery("getServices", async () => {
      const result = await firestoreDataSource.queryCollection<PortfolioServiceItem>("portfolio_services", {
        limit: 50,
      });

      if (result.docs.length > 0) {
        return result.docs;
      }

      // Default baseline services if collection is empty
      const defaultServices: PortfolioServiceItem[] = [
        {
          id: "svc_core_api",
          name: "Portfolio Core API Gateway",
          status: "operational",
          endpoint: "/api/contact",
          latencyMs: 42,
          lastChecked: new Date().toISOString(),
          version: "1.0.0",
        },
        {
          id: "svc_auth_pkce",
          name: "Direct Google OAuth 2.0 PKCE",
          status: "operational",
          endpoint: "/api/admin/auth/google",
          latencyMs: 18,
          lastChecked: new Date().toISOString(),
          version: "2.0.0",
        },
        {
          id: "svc_telemetry",
          name: "Vercel Real-Time Telemetry",
          status: "operational",
          endpoint: "/_vercel/insights",
          latencyMs: 24,
          lastChecked: new Date().toISOString(),
          version: "2.0.1",
        },
      ];

      return defaultServices;
    });
  }
}

export const servicesRepository = new ServicesRepository();
