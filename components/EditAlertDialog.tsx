"use client";

import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALERT_TYPE_OPTIONS,
  CONDITION_OPTIONS,
  FREQUENCY_OPTIONS,
} from "@/lib/constants";
import { updateAlert } from "@/lib/actions/alert.actions";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect } from "react";

interface EditAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: any; // EnrichedAlertItem
  onUpdated: (updated: any) => void;
}

export default function EditAlertDialog({
  open,
  onOpenChange,
  alert,
  onUpdated,
}: EditAlertDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<AddAlertFormData>({
    defaultValues: {
      alertName: alert.alertName || "",
      stockIdentifier: `${alert.company} (${alert.symbol})`,
      alertType: alert.alertType,
      condition:
        alert.alertType === "upper"
          ? CONDITION_OPTIONS[0].value
          : CONDITION_OPTIONS[1].value,
      thresholdValue: alert.threshold,
      frequency: alert.frequency,
    },
  });

  useEffect(() => {
    if (open) {
      setValue("alertName", alert.alertName || "");
      setValue("stockIdentifier", `${alert.company} (${alert.symbol})`);
      setValue("alertType", alert.alertType);
      setValue(
        "condition",
        alert.alertType === "upper"
          ? CONDITION_OPTIONS[0].value
          : CONDITION_OPTIONS[1].value
      );
      setValue("thresholdValue", alert.threshold);
      setValue("frequency", alert.frequency);
    }
  }, [open, alert, setValue]);

  const onSubmit = async (data: AddAlertFormData) => {
    try {
      const res = await updateAlert({
        alertId: String(alert.id),
        alertType: data.alertType as "upper" | "lower",
        threshold: data.thresholdValue,
        alertName: data.alertName,
        frequency: String(data.frequency),
      });
      if (!res.success || !res.data) {
        toast.error("Update failed", { description: res.error });
        return;
      }
      toast.success("Alert updated");
      onUpdated(res.data);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Update failed", { description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="alert-dialog">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <DialogHeader>
            <DialogTitle className="alert-title">Edit Alert</DialogTitle>
          </DialogHeader>
          <InputField
            name="alertName"
            label="Alert Name"
            placeholder="example alert"
            register={register}
            error={errors.alertName}
            validation={{ required: "Alert name is required" }}
            required
          />
          <InputField
            name="stockIdentifier"
            label="Stock Identifier"
            placeholder=""
            register={register}
            error={errors.stockIdentifier}
            disabled
          />
          <SelectField
            name="alertType"
            label="Alert Type"
            placeholder="Select your Alert Type"
            options={ALERT_TYPE_OPTIONS}
            control={control}
            error={errors.alertType}
          />
          <SelectField
            name="condition"
            label="Condition"
            placeholder="Select your condition"
            options={CONDITION_OPTIONS}
            control={control}
            error={errors.condition}
          />
          <InputField
            name="thresholdValue"
            label="Threshold Value (in $)"
            placeholder="eg. 140"
            register={register}
            error={errors.thresholdValue}
            validation={{
              required: "Threshold value is required",
              valueAsNumber: true,
              validate: (v: any) =>
                (typeof v === "number" && !isNaN(v)) || "Must be a number",
            }}
            required
          />
          <SelectField
            name="frequency"
            label="Frequency"
            placeholder="Select your frequency"
            options={FREQUENCY_OPTIONS}
            control={control}
            error={errors.frequency}
            required
          />
          <DialogFooter>
            <Button
              type="submit"
              className="yellow-btn w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
