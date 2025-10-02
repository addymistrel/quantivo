"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Alert, type AlertItem } from "@/database/models/alert.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { Types } from "mongoose";
import { getCompanyDataFromSymol } from "@/lib/actions/finnhub.actions";

// Shared return types
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateAlertInput {
  symbol: string;
  company: string;
  alertType: "upper" | "lower";
  threshold: number;
  alertName?: string;
  frequency?: string; // e.g. "Once per day" / "Always" etc.
}

export interface UpdateAlertInput {
  alertId: string;
  symbol?: string;
  company?: string;
  alertType?: "upper" | "lower";
  threshold?: number | null;
  alertName?: string | null; // null can clear the name
  frequency?: string | null;
  isActive?: boolean;
}

export interface ListAlertsParams {
  symbol?: string; // filter by symbol
  onlyActive?: boolean;
  search?: string; // matches symbol/company/alertName
  page?: number; // 1-based
  pageSize?: number;
  sort?: string; // e.g. "createdAt:desc" | "threshold:asc"
}

export interface AlertListResult {
  items: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
}

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id || null;
}

export async function createAlert(
  input: CreateAlertInput
): Promise<ActionResult<string>> {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");

    const { symbol, company, alertType, threshold, alertName, frequency } =
      input;
    if (!symbol || !company || !alertType || typeof threshold !== "number") {
      throw new Error("Missing required fields");
    }

    await connectToDatabase();

    const alert = await Alert.create({
      userId,
      symbol: symbol.toUpperCase(),
      company,
      alertType,
      threshold,
      alertName: alertName?.trim() || undefined,
      frequency: frequency ?? undefined,
      createdAt: new Date(),
    });

    const newAlertId = (alert._id as Types.ObjectId).toString();

    return { success: true, data: newAlertId };
  } catch (e: any) {
    console.error("createAlert error", e);
    return { success: false, error: e.message };
  }
}

export async function listAlerts(
  params: ListAlertsParams = {}
): Promise<ActionResult<AlertListResult>> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return {
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: params.pageSize || 10 },
      };
    }

    const {
      symbol,
      onlyActive,
      search = "",
      page = 1,
      pageSize = 10,
      sort = "createdAt:desc",
    } = params;

    await connectToDatabase();

    const query: any = { userId };
    if (symbol) query.symbol = symbol.toUpperCase();
    if (onlyActive) query.isActive = true;
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { alertName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Alert.countDocuments(query);

    const [sortField, sortDir] = sort.split(":");
    const sortObj: any = { [sortField]: sortDir === "asc" ? 1 : -1 };

    const items = await Alert.find(query)
      .sort(sortObj)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return {
      success: true,
      data: { items: items as any as AlertItem[], total, page, pageSize },
    };
  } catch (e: any) {
    console.error("listAlerts error", e);
    return { success: false, error: e.message };
  }
}

// Extended enriched alert list with latest price & change percent from Finnhub quote endpoint.
export interface EnrichedAlertItem extends AlertItem {
  currentPrice?: number;
  changePercent?: number;
  logo?: string;
}

export interface EnrichedAlertListResult
  extends Omit<AlertListResult, "items"> {
  items: EnrichedAlertItem[];
}

export async function listAlertsWithQuotes(
  params: ListAlertsParams = {}
): Promise<ActionResult<EnrichedAlertListResult>> {
  try {
    const base = await listAlerts(params);
    if (!base.success || !base.data) return base as any;

    const token =
      process.env.FINNHUB_API_KEY ||
      process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
      "";
    if (!token) {
      // Return without enrichment if no token configured
      return {
        success: true,
        data: { ...(base.data as AlertListResult), items: base.data.items },
      } as ActionResult<EnrichedAlertListResult>;
    }

    // Fetch quotes in parallel (dedupe symbols to reduce calls)
    const uniqueSymbols = [
      ...new Set(base.data.items.map((a) => a.symbol.toUpperCase())),
    ];

    const quoteMap: Record<
      string,
      { price?: number; changePercent?: number; logo?: string }
    > = {};
    await Promise.all(
      uniqueSymbols.map(async (sym) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
            sym
          )}&token=${token}`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error("Quote fetch failed");

          const companyData = await getCompanyDataFromSymol(sym);
          if (!companyData) throw new Error("Company data fetch failed");

          const data = (await res.json()) as any;
          quoteMap[sym] = {
            price: typeof data.c === "number" ? data.c : undefined,
            changePercent: typeof data.dp === "number" ? data.dp : undefined,
            logo: companyData.logo,
          };
        } catch (e) {
          console.error("listAlertsWithQuotes quote error", sym, e);
        }
      })
    );

    const enriched: EnrichedAlertItem[] = base.data.items.map((a) => {
      const symbol = a.symbol.toUpperCase();
      const obj: any = a as any;
      const createdAtVal =
        obj.createdAt instanceof Date
          ? obj.createdAt.toISOString()
          : obj.createdAt;
      return {
        id: String(obj._id || obj.id), // expose a clean string id for client usage
        userId: String(obj.userId),
        symbol,
        company: obj.company,
        alertType: obj.alertType,
        threshold: obj.threshold,
        alertName: obj.alertName,
        frequency: obj.frequency,
        createdAt: createdAtVal,
        isActive: obj.isActive,
        currentPrice: quoteMap[symbol]?.price,
        changePercent: quoteMap[symbol]?.changePercent,
        logo: quoteMap[symbol]?.logo,
      } as EnrichedAlertItem & { id: string };
    });

    return {
      success: true,
      data: { ...(base.data as AlertListResult), items: enriched },
    } as ActionResult<EnrichedAlertListResult>;
  } catch (e: any) {
    console.error("listAlertsWithQuotes error", e);
    return { success: false, error: e.message };
  }
}

export async function getAlertById(
  id: string
): Promise<ActionResult<AlertItem>> {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");

    await connectToDatabase();
    const alert = await Alert.findOne({ _id: id, userId });
    if (!alert) return { success: false, error: "Alert not found" };

    return { success: true, data: alert };
  } catch (e: any) {
    console.error("getAlertById error", e);
    return { success: false, error: e.message };
  }
}

export async function updateAlert(
  input: UpdateAlertInput
): Promise<ActionResult<AlertItem>> {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");
    const { alertId, ...rest } = input;
    if (!alertId) throw new Error("alertId required");

    await connectToDatabase();

    const update: any = {};
    if (rest.symbol) update.symbol = rest.symbol.toUpperCase();
    if (rest.company) update.company = rest.company;
    if (rest.alertType) update.alertType = rest.alertType;
    if (typeof rest.threshold === "number") update.threshold = rest.threshold;
    if (rest.frequency) update.frequency = rest.frequency;
    if (typeof rest.isActive === "boolean") update.isActive = rest.isActive;
    if (rest.alertName !== undefined)
      update.alertName = rest.alertName ? rest.alertName.trim() : undefined;

    const alert = await Alert.findOneAndUpdate(
      { _id: alertId, userId },
      { $set: update },
      { new: true }
    );

    if (!alert) return { success: false, error: "Alert not found" };

    // ✅ Convert to plain object
    const plainAlert = alert.toObject();
    plainAlert._id = (alert._id as Types.ObjectId).toString();
    plainAlert.userId = String(alert.userId);

    return { success: true, data: plainAlert as AlertItem };
  } catch (e: any) {
    console.error("updateAlert error", e);
    return { success: false, error: e.message };
  }
}

export async function deleteAlert(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");

    await connectToDatabase();
    const res = await Alert.deleteOne({ _id: id, userId });
    if (res.deletedCount === 0) {
      return { success: false, error: "Alert not found" };
    }
    return { success: true };
  } catch (e: any) {
    console.error("deleteAlert error", e);
    return { success: false, error: e.message };
  }
}

export async function toggleAlertActive(
  id: string,
  value: boolean
): Promise<ActionResult<AlertItem>> {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("User not authenticated");
    await connectToDatabase();

    const alert = await Alert.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive: value } },
      { new: true }
    );

    if (!alert) return { success: false, error: "Alert not found" };

    // ✅ Convert to plain object
    const plainAlert = alert.toObject();
    plainAlert._id = (alert._id as Types.ObjectId).toString();
    plainAlert.userId = String(alert.userId);

    return { success: true, data: plainAlert as AlertItem };
  } catch (e: any) {
    console.error("toggleAlertActive error", e);
    return { success: false, error: e.message };
  }
}
