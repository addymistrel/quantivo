import { inngest } from "@/lib/inngest/client";
import {
  sendSignUpEmail,
  sendDailyNewsSummary,
  processMinuteAlerts,
  processHourlyAlerts,
  processDailyAlerts,
  sendInactiveUserReminders,
} from "@/lib/inngest/functions";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendSignUpEmail,
    sendDailyNewsSummary,
    processMinuteAlerts,
    processHourlyAlerts,
    processDailyAlerts,
    sendInactiveUserReminders,
  ],
});
