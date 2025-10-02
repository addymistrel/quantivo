"use client";

import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ALERT_TYPE_OPTIONS,
  CONDITION_OPTIONS,
  FREQUENCY_OPTIONS,
} from "@/lib/constants";
import { createAlert } from "@/lib/actions/alert.actions";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";

const AddAlertDialog = ({
  companySymbol,
  companyName,
}: {
  companySymbol: string;
  companyName: string;
}) => {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<AddAlertFormData>({
    defaultValues: {
      alertName: "",
      stockIdentifier: `${companyName} (${companySymbol})`,
      alertType: ALERT_TYPE_OPTIONS[0].value,
      condition: CONDITION_OPTIONS[0].value,
      thresholdValue: null,
      frequency: FREQUENCY_OPTIONS[0].value,
    },
    mode: "onBlur",
  });

  // keep identifier synced if props change
  useEffect(() => {
    setValue("stockIdentifier", `${companyName} (${companySymbol})`);
  }, [companyName, companySymbol, setValue]);

  // When dialog closes, reset form so stale values are cleared next open
  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
      if (!value) {
        // Reset to defaults bound to latest props
        reset({
          alertName: "",
          stockIdentifier: `${companyName} (${companySymbol})`,
          alertType: ALERT_TYPE_OPTIONS[0].value,
          condition: CONDITION_OPTIONS[0].value,
          thresholdValue: null,
          frequency: FREQUENCY_OPTIONS[0].value,
        });
      }
    },
    [companyName, companySymbol, reset]
  );

  const onSubmit = async (data: AddAlertFormData) => {
    // Map form data to server action input
    const payload = {
      symbol: companySymbol,
      company: companyName,
      alertType: data.alertType as "upper" | "lower",
      threshold: data.thresholdValue as number,
      alertName: data.alertName?.trim() || undefined,
      frequency: (data.frequency as any as string) || undefined,
    };
    try {
      const res = await createAlert(payload);
      if (!res.success) {
        toast.error("Create Alert Failed", {
          description: res.error || "Unknown error",
        });
        return;
      }
      toast.success("Alert created", {
        description: `${payload.symbol} @ ${payload.threshold}`,
      });

      // Emit a window event so any listeners (AlertList) can refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("alert:created", {
            detail: { id: res.data, payload },
          })
        );
      }

      // Close dialog -> open change handler will reset form
      handleOpenChange(false);
    } catch (e) {
      console.error("Create Alert Failed:", e);
      toast.error("Create Alert Failed", {
        description:
          e instanceof Error ? e.message : "Internal server error occurred",
      });
    }
  };

  const onInvalid = (invalid: any) => {
    console.log("VALIDATION ERRORS:", invalid);
    toast.error("Create Alert Failed", {
      description:
        invalid instanceof Error
          ? invalid.message
          : "Create Alert details are invalid",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="add-alert !w-full">
          Add Alert
        </Button>
      </DialogTrigger>

      {/* DialogContent wraps the form so submit button is inside the form DOM */}
      <DialogContent className="sm:max-w-[425px] alert-dialog">
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-5"
          noValidate
        >
          <DialogHeader>
            <DialogTitle className="alert-title">Price Alert</DialogTitle>
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

          {/* Display only; disabled => not submitted. Hidden field ensures value is captured */}
          <InputField
            name="stockIdentifier"
            label="Stock Identifier"
            placeholder=""
            register={register}
            error={errors.stockIdentifier}
            validation={{ required: "Stock Identifier is required" }}
            disabled
          />
          <input
            type="hidden"
            value={`${companyName} (${companySymbol})`}
            {...register("stockIdentifier")}
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

          <DialogFooter className="w-full">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="yellow-btn w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlertDialog;
