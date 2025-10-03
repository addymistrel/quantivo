import nodemailer from "nodemailer";
import {
  WELCOME_EMAIL_TEMPLATE,
  NEWS_SUMMARY_EMAIL_TEMPLATE,
  STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
  STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
  INACTIVE_USER_REMINDER_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";
import { formatTimestamp } from "@/lib/utils";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL!,
    pass: process.env.NODEMAILER_PASSWORD!,
  },
});

export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", name).replace(
    "{{intro}}",
    intro
  );

  const mailOptions = {
    from: `"Quantivo" <Quantivo@contact.in>`,
    to: email,
    subject: `Welcome to Quantivo - your stock market toolkit is ready!`,
    text: "Thanks for joining Quantivo",
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

export const sendNewsSummaryEmail = async ({
  email,
  date,
  newsContent,
}: {
  email: string;
  date: string;
  newsContent: string;
}): Promise<void> => {
  const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE.replace(
    "{{date}}",
    date
  ).replace("{{newsContent}}", newsContent);

  const mailOptions = {
    from: `"Quantivo News" <Quantivo@jsmastery.pro>`,
    to: email,
    subject: `📈 Market News Summary Today - ${date}`,
    text: `Today's market news summary from Quantivo`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

interface StockAlertEmailArgs {
  email: string;
  symbol: string;
  company: string;
  currentPrice: number;
  targetPrice: number;
  alertType: "upper" | "lower";
  timestamp: string;
}

export const sendStockPriceAlertEmail = async ({
  email,
  symbol,
  company,
  currentPrice,
  targetPrice,
  alertType,
  timestamp,
}: StockAlertEmailArgs): Promise<void> => {
  const template =
    alertType === "upper"
      ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE
      : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

  const html = template
    .replace(/{{symbol}}/g, symbol)
    .replace(/{{company}}/g, company || symbol)
    .replace(/{{currentPrice}}/g, formatPrice(currentPrice))
    .replace(/{{targetPrice}}/g, formatPrice(targetPrice))
    .replace(/{{timestamp}}/g, formatTimestamp(timestamp));

  const subject =
    alertType === "upper"
      ? `Price Alert: ${symbol} Hit Upper Target`
      : `Price Alert: ${symbol} Hit Lower Target`;

  await transporter.sendMail({
    from: '"Quantivo Alerts" <alerts@quantivo.app>',
    to: email,
    subject,
    text: `${symbol} price ${
      alertType === "upper" ? ">=" : "<="
    } ${targetPrice}. Current: ${currentPrice}`,
    html,
  });
};

export const sendInactiveUserReminderEmail = async ({
  email,
  name,
  dashboardUrl,
  unsubscribeUrl,
}: {
  email: string;
  name: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}) => {
  const html = INACTIVE_USER_REMINDER_EMAIL_TEMPLATE.replace(/{{name}}/g, name)
    .replace(/{{dashboardUrl}}/g, dashboardUrl)
    .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);

  await transporter.sendMail({
    from: '"Quantivo" <notify@quantivo.app>',
    to: email,
    subject: `We Miss You ${name}! Your Market Insights Await`,
    text: `We miss you at Quantivo. Come back to your dashboard: ${dashboardUrl}`,
    html,
  });
};

// --- Helpers ---
function formatPrice(v: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}
