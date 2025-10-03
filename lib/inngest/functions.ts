import { inngest } from "@/lib/inngest/client";
import {
  NEWS_SUMMARY_EMAIL_PROMPT,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
  sendNewsSummaryEmail,
  sendWelcomeEmail,
  sendStockPriceAlertEmail,
  sendInactiveUserReminderEmail,
} from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";
import { connectToDatabase } from "@/database/mongoose";
import { Alert } from "@/database/models/alert.model";
// (getAllUsersForNewsEmail already imported above) reuse for user basic data

// Frequency mapping helper
const FREQUENCY_CRONS: Record<string, string> = {
  "1": "* * * * *", // every minute
  "2": "0 * * * *", // every hour
  "3": "0 12 * * *", // daily at 12:00 UTC (reused for simplicity)
};

// Utility: fetch current quote for a symbol
async function fetchQuote(symbol: string): Promise<number | null> {
  try {
    const token =
      process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) return null;
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        symbol
      )}&token=${token}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.c === "number" ? data.c : null;
  } catch (e) {
    console.error("fetchQuote error", symbol, e);
    return null;
  }
}

// Generic processor for a given frequency value ("1"|"2"|"3")
async function processAlertsByFrequency(frequencyValue: string, step: any) {
  await connectToDatabase();

  // Support legacy label storage (e.g., "Once per day")
  const legacyMap: Record<string, string[]> = {
    "1": ["1", "Once per minute"],
    "2": ["2", "Once per hour"],
    "3": ["3", "Once per day"],
  };

  const alerts = await Alert.find({
    isActive: true,
    frequency: { $in: legacyMap[frequencyValue] || [frequencyValue] },
  }).lean();

  if (!alerts.length) {
    return { processed: 0, sent: 0 };
  }

  // Group by symbol to minimize quote API calls
  const symbols = Array.from(new Set(alerts.map((a: any) => a.symbol)));
  const quoteMap: Record<string, number | null> = {};

  await Promise.all(
    symbols.map(async (s) => {
      quoteMap[s] = await fetchQuote(s);
    })
  );

  // Get user data (email, name) in bulk
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  const userIds = Array.from(new Set(alerts.map((a: any) => a.userId)));

  const usersRaw = db
    ? await db
        .collection("user")
        .find(
          {
            _id: { $in: userIds.map((id) => new mongoose.mongo.ObjectId(id)) },
          },
          { projection: { _id: 1, email: 1, name: 1 } }
        )
        .toArray()
    : [];

  const userMap: Record<string, { email: string; name: string }> = {};
  for (const u of usersRaw) {
    if (u.email) {
      userMap[u._id.toString()] = { email: u.email, name: u.name || "Trader" };
    }
  }

  let sent = 0;
  for (const alert of alerts as any[]) {
    const quote = quoteMap[alert.symbol];
    if (quote == null) continue;

    const user = userMap[alert.userId?.toString()];
    if (!user) continue;

    const shouldTrigger =
      alert.alertType === "upper"
        ? quote >= alert.threshold
        : quote <= alert.threshold;

    if (!shouldTrigger) continue;

    try {
      await sendStockPriceAlertEmail({
        email: user.email,
        symbol: alert.symbol,
        company: alert.company,
        currentPrice: quote,
        targetPrice: alert.threshold,
        alertType: alert.alertType,
        timestamp: new Date().toISOString(),
      });
      sent++;
    } catch (e) {
      console.error("Failed sending price alert", alert._id, e);
    }
  }

  return { processed: alerts.length, sent };
}

// Helper function to mask email addresses for logging
const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***@***";
  const maskedLocal =
    localPart.length <= 2
      ? "***"
      : localPart[0] +
        "*".repeat(localPart.length - 2) +
        localPart[localPart.length - 1];
  return `${maskedLocal}@${domain}`;
};

export const sendSignUpEmail = inngest.createFunction(
  { id: "sign-up-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `;

    const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
      "{{userProfile}}",
      userProfile
    );

    const response = await step.ai.infer("generate-welcome-intro", {
      model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
    });

    await step.run("send-welcome-email", async () => {
      const part = response.candidates?.[0]?.content?.parts?.[0];
      const introText =
        (part && "text" in part ? part.text : null) ||
        "Thanks for joining Quantivo. You now have the tools to track markets and make smarter moves.";

      const {
        data: { email, name },
      } = event;

      return await sendWelcomeEmail({ email, name, intro: introText });
    });

    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  }
);

export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
  async ({ step }) => {
    // Step #1: Get all users for news delivery
    const users = await step.run("get-all-users", getAllUsersForNewsEmail);

    if (!users || users.length === 0)
      return { success: false, message: "No users found for news email" };

    // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNewsEmail;
        articles: MarketNewsArticle[];
      }> = [];
      for (const user of users as UserForNewsEmail[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles = await getNews(symbols);
          // Enforce max 6 articles per user
          articles = (articles || []).slice(0, 6);
          // If still empty, fallback to general
          if (!articles || articles.length === 0) {
            articles = await getNews();
            articles = (articles || []).slice(0, 6);
          }
          perUser.push({ user, articles });
        } catch (e) {
          console.error(
            "daily-news: error preparing user news",
            maskEmail(user.email),
            e
          );
          perUser.push({ user, articles: [] });
        }
      }
      return perUser;
    });

    // Step #3: (placeholder) Summarize news via AI
    const userNewsSummaries: {
      user: UserForNewsEmail;
      newsContent: string | null;
    }[] = [];

    for (const { user, articles } of results) {
      try {
        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
          "{{newsData}}",
          JSON.stringify(articles, null, 2)
        );

        // Use a non-PII step ID by stripping/limiting the email
        const safeId = `summarize-news-${(user.email || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 16)}`;
        const response = await step.ai.infer(safeId, {
          model: step.ai.models.gemini({ model: "gemini-2.5-flash" }),
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
        });

        // Ensure we get HTML-formatted content or fall back to minimal HTML
        const part = response.candidates?.[0]?.content?.parts?.[0];
        const raw = part && "text" in part ? part.text : null;
        const newsContent =
          raw && /<\w+/.test(raw)
            ? raw
            : `<p class="mobile-text dark-text-secondary" style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:#CCDADC;">No market news today.</p>`;

        userNewsSummaries.push({ user, newsContent });
      } catch (e) {
        console.error("Failed to summarize news for : ", user.email);
        userNewsSummaries.push({ user, newsContent: null });
      }
    }

    // Step #4: (placeholder) Send the emails
    await step.run("send-news-emails", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, newsContent }) => {
          if (!newsContent) return false;

          return await sendNewsSummaryEmail({
            email: user.email,
            date: getFormattedTodayDate(),
            newsContent,
          });
        })
      );
    });

    return {
      success: true,
      message: "Daily news summary emails sent successfully",
    };
  }
);

// Create 3 scheduled functions for each frequency
export const processMinuteAlerts = inngest.createFunction(
  { id: "process-minute-alerts" },
  { cron: FREQUENCY_CRONS["1"] },
  async ({ step }) => {
    const result = await step.run("process-minute", () =>
      processAlertsByFrequency("1", step)
    );
    return { success: true, ...result };
  }
);

export const processHourlyAlerts = inngest.createFunction(
  { id: "process-hourly-alerts" },
  { cron: FREQUENCY_CRONS["2"] },
  async ({ step }) => {
    const result = await step.run("process-hourly", () =>
      processAlertsByFrequency("2", step)
    );
    return { success: true, ...result };
  }
);

export const processDailyAlerts = inngest.createFunction(
  { id: "process-daily-alerts" },
  { cron: FREQUENCY_CRONS["3"] },
  async ({ step }) => {
    const result = await step.run("process-daily", () =>
      processAlertsByFrequency("3", step)
    );
    return { success: true, ...result };
  }
);

// Inactive user monthly reminder (runs first day of month at 13:00 UTC)
export const sendInactiveUserReminders = inngest.createFunction(
  { id: "inactive-user-reminders" },
  { cron: "0 13 1 * *" },
  async ({ step }) => {
    // Users with lastLoginAt older than 30 days
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const users = db
      ? await db
          .collection("user")
          .find(
            {
              lastLoginAt: { $exists: true, $lt: new Date(cutoff) },
              email: { $exists: true, $ne: null },
            },
            { projection: { id: 1, email: 1, name: 1 } }
          )
          .toArray()
      : [];

    if (!users.length) return { success: true, sent: 0 };

    let sent = 0;
    await Promise.all(
      users.map(async (u: any) => {
        try {
          await sendInactiveUserReminderEmail({
            email: u.email,
            name: u.name || "Trader",
            dashboardUrl:
              process.env.APP_BASE_URL ||
              "https://stock-market-dev.vercel.app/",
            unsubscribeUrl: `${
              process.env.APP_BASE_URL || "https://stock-market-dev.vercel.app"
            }/unsubscribe`,
          });
          sent++;
        } catch (e) {
          console.error("inactive reminder failed", u.id, e);
        }
      })
    );

    return { success: true, sent, totalCandidates: users.length };
  }
);
