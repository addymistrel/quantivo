"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listAlertsWithQuotes,
  deleteAlert,
  toggleAlertActive,
  type EnrichedAlertItem,
} from "@/lib/actions/alert.actions";
import {
  formatPrice,
  formatChangePercent,
  getChangeColorClass,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import EditAlertDialog from "@/components/EditAlertDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AlertListProps {
  initial?: EnrichedAlertItem[];
}

// Map frequency numeric codes to label (fallback if server returns raw)
const frequencyMap: Record<string, string> = {
  "1": "Once per minute",
  "2": "Once per hour",
  "3": "Once per day",
};

export default function AlertList({ initial }: AlertListProps) {
  const [alerts, setAlerts] = useState<EnrichedAlertItem[] | null>(
    initial || null
  );
  const [loading, setLoading] = useState(!initial);
  const [editing, setEditing] = useState<EnrichedAlertItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  console.log(alerts);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAlertsWithQuotes({ page: 1, pageSize: 50 });
      if (res.success && res.data) {
        setAlerts(res.data.items as any);
      } else {
        toast.error("Failed to load alerts", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Failed to load alerts", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) fetchAlerts();
  }, [initial, fetchAlerts]);

  // Listen for newly created alerts dispatched from AddAlertDialog
  useEffect(() => {
    const handler = (e: Event) => {
      fetchAlerts();
    };
    window.addEventListener("alert:created", handler as any);
    return () => window.removeEventListener("alert:created", handler as any);
  }, [fetchAlerts]);

  const handleDelete = async (id: string) => {
    const existing = alerts || [];
    setAlerts(
      existing.filter((a) => String((a as any).id || (a as any)._id) !== id)
    );
    const res = await deleteAlert(id);
    if (!res.success) {
      toast.error("Delete failed", { description: res.error });
      // revert
      setAlerts(existing);
    } else {
      toast.success("Alert deleted");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    // optimistic update
    setAlerts((prev) => {
      if (!prev) return prev;
      return prev.map((a) => {
        const matchId = String((a as any).id || (a as any)._id);
        if (matchId === id) {
          return { ...(a as any), isActive: !current } as EnrichedAlertItem;
        }
        return a;
      });
    });
    try {
      const res = await toggleAlertActive(id, !current);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to toggle");
      }
      toast.success(`Alert ${!current ? "enabled" : "disabled"}`);
    } catch (e: any) {
      toast.error(e.message || "Toggle failed");
      // revert
      setAlerts((prev) => {
        if (!prev) return prev;
        return prev.map((a) => {
          const matchId = String((a as any).id || (a as any)._id);
          if (matchId === id) {
            return { ...(a as any), isActive: current } as EnrichedAlertItem;
          }
          return a;
        });
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdated = (updated: any) => {
    setAlerts((prev) =>
      (prev || []).map((a) =>
        String((a as any).id || (a as any)._id) ===
        String(updated._id || updated.id)
          ? { ...a, ...updated, id: String(updated._id || updated.id) }
          : a
      )
    );
  };

  if (loading) {
    return (
      <div className="alert-list">
        <div className="alert-empty">Loading alerts...</div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert-list">
        <div className="alert-empty text-sm">
          No alerts yet. Create one from the watchlist table.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="alert-list scrollbar-hide-default">
        {alerts.map((alert) => {
          const price = alert.currentPrice
            ? formatPrice(alert.currentPrice)
            : "--";
          const changeClass = getChangeColorClass(alert.changePercent);
          const changeFormatted = formatChangePercent(alert.changePercent);
          const condition = alert.alertType === "upper" ? ">" : "<";
          const alertText = `Price ${condition} ${formatPrice(
            alert.threshold
          )}`;
          const frequencyLabel =
            (alert as any).frequency &&
            frequencyMap[(alert as any).frequency as string]
              ? frequencyMap[(alert as any).frequency as string]
              : (alert as any).frequency || "Once per day";
          return (
            <div
              key={String((alert as any).id || (alert as any)._id)}
              className="alert-item"
            >
              <div className="alert-details">
                <div className="flex items-center gap-3">
                  {/* Placeholder for logo if we have one later */}
                  <div className="h-10 w-10 rounded bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-100">
                    <img src={alert.logo} alt={`${alert.company} Logo`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="alert-company font-medium text-gray-100">
                      {alert.company}
                    </span>
                    <span className="text-sm text-gray-500">{price}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-gray-400 font-medium text-sm">
                    {alert.symbol}
                  </span>
                  <span className={`text-xs font-semibold ${changeClass}`}>
                    {changeFormatted}
                  </span>
                </div>
              </div>
              <div className="mb-1 text-md text-gray-400">Alert:</div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-gray-100 text-md">
                  {alertText}
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-gray-600/60 text-yellow-500 font-medium whitespace-nowrap">
                  {frequencyLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={alert.isActive ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  disabled={
                    togglingId ===
                    String((alert as any).id || (alert as any)._id)
                  }
                  onClick={() =>
                    handleToggle(
                      String((alert as any).id || (alert as any)._id),
                      alert.isActive
                    )
                  }
                  title={alert.isActive ? "Disable alert" : "Enable alert"}
                >
                  <Power
                    className={`h-4 w-4 ${
                      alert.isActive ? "text-red-800" : "text-green-500"
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="alert-update-btn h-8 w-8"
                  onClick={() => setEditing(alert)}
                  title="Edit Alert"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="alert-delete-btn h-8 w-8"
                  onClick={() =>
                    setConfirmDeleteId(
                      String((alert as any).id || (alert as any)._id)
                    )
                  }
                  title="Delete Alert"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <EditAlertDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          alert={editing}
          onUpdated={handleUpdated}
        />
      )}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm bg-gray-800 text-gray-400">
          <DialogHeader>
            <DialogTitle>Delete Alert</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete this alert? This action cannot be
            undone.
          </p>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const id = confirmDeleteId;
                setConfirmDeleteId(null);
                if (id) handleDelete(id);
              }}
              type="button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
