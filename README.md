<div align="center">

# 📈 Quantivo

### Real-Time Stock Tracking & Personalized Alerts Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-quantivo--mu.vercel.app-blue?style=for-the-badge)](https://quantivo-mu.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

<p align="center">
  <strong>Track real-time stock prices, get personalized alerts, and explore detailed company insights — all in one powerful platform.</strong>
</p>

[Live Demo](https://quantivo-mu.vercel.app/) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started)

</div>

---

## ✨ Features

<table>
<tr>
<td>

### 📊 Real-Time Market Data

- Live stock prices with TradingView integration
- Interactive stock heatmaps
- Market overview & trends
- Detailed company profiles

</td>
<td>

### 🔔 Smart Alerts

- Custom price threshold alerts
- Upper & lower bound notifications
- Flexible alert frequency options
- Email notifications via Nodemailer

</td>
</tr>
<tr>
<td>

### ⭐ Watchlist Management

- Personalized stock watchlists
- Favorite stocks tracking
- Quick add/remove functionality
- Real-time price updates

</td>
<td>

### 📰 News & Insights

- Latest financial news
- AI-powered news summaries
- Personalized content based on watchlist
- Top market stories

</td>
</tr>
</table>

---

## 🛠 Tech Stack

<div align="center">

### Frontend

<p>
  <img src="https://skillicons.dev/icons?i=nextjs,react,typescript,tailwind" alt="Frontend Tech" />
</p>

|                                                       Technology                                                       | Description                                 |
| :--------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
|       ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)        | React framework with App Router & Turbopack |
|          ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)           | UI library with latest features             |
|   ![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)    | Type-safe JavaScript                        |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Utility-first CSS framework                 |

### Backend & Database

<p>
  <img src="https://skillicons.dev/icons?i=mongodb,nodejs" alt="Backend Tech" />
</p>

|                                                  Technology                                                   | Description                              |
| :-----------------------------------------------------------------------------------------------------------: | :--------------------------------------- |
|    ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)     | NoSQL database for flexible data storage |
|   ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white)   | Elegant MongoDB object modeling          |
| ![Better Auth](https://img.shields.io/badge/Better_Auth-FF6B6B?style=flat-square&logo=shield&logoColor=white) | Modern authentication solution           |

### APIs & Services

|                                                     Technology                                                     | Description                       |
| :----------------------------------------------------------------------------------------------------------------: | :-------------------------------- |
| ![TradingView](https://img.shields.io/badge/TradingView-131722?style=flat-square&logo=tradingview&logoColor=white) | Real-time charts & market widgets |
|   ![Finnhub](https://img.shields.io/badge/Finnhub_API-00C805?style=flat-square&logo=chartdotjs&logoColor=white)    | Stock data & company information  |
|      ![Inngest](https://img.shields.io/badge/Inngest-5865F2?style=flat-square&logo=clockify&logoColor=white)       | Background jobs & scheduled tasks |
|  ![Nodemailer](https://img.shields.io/badge/Nodemailer-339933?style=flat-square&logo=nodemailer&logoColor=white)   | Email notifications               |

### UI Components

<p>
  <img src="https://skillicons.dev/icons?i=vercel" alt="Deployment" />
</p>

|                                                          Technology                                                          | Description                     |
| :--------------------------------------------------------------------------------------------------------------------------: | :------------------------------ |
|           ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white)           | Accessible component primitives |
|          ![Lucide](https://img.shields.io/badge/Lucide_Icons-F56040?style=flat-square&logo=feather&logoColor=white)          | Beautiful icon library          |
| ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=flat-square&logo=reacthookform&logoColor=white) | Performant form handling        |
|              ![Sonner](https://img.shields.io/badge/Sonner-000000?style=flat-square&logo=toast&logoColor=white)              | Toast notifications             |

</div>

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Finnhub API key
- SMTP credentials for email

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/addymistrel/quantivo.git
   cd quantivo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env`:

   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string

   # Authentication
   BETTER_AUTH_SECRET=your_auth_secret
   BETTER_AUTH_URL=http://localhost:3000

   # Finnhub API
   FINNHUB_API_KEY=your_finnhub_api_key

   # Email (Nodemailer)
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password

   # Inngest
   INNGEST_EVENT_KEY=your_inngest_key
   INNGEST_SIGNING_KEY=your_signing_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
quantivo/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (root)/            # Main app pages
│   │   ├── stocks/        # Stock details
│   │   └── watchlist/     # Watchlist management
│   ├── api/               # API routes
│   └── complete-profile/  # User onboarding
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── forms/            # Form components
├── database/             # MongoDB models
├── lib/                  # Utilities & actions
│   ├── actions/          # Server actions
│   ├── better-auth/      # Auth configuration
│   ├── inngest/          # Background jobs
│   └── nodemailer/       # Email templates
└── public/               # Static assets
```

---

## 🌟 Key Features Explained

### 📈 TradingView Integration

Embedded TradingView widgets provide professional-grade charts, heatmaps, and market data visualization.

### ⚡ Real-Time Alerts with Inngest

Background jobs powered by Inngest monitor stock prices and trigger email alerts based on user-defined thresholds.

### 🔐 Secure Authentication

Better Auth provides a modern, secure authentication system with session management.

### 📧 Smart Email Notifications

Personalized email alerts for price changes, daily news summaries, and welcome messages using AI-enhanced content.

---

## 📜 Scripts

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Start development server with Turbopack |
| `npm run build`   | Build for production                    |
| `npm run start`   | Start production server                 |
| `npm run lint`    | Run ESLint                              |
| `npm run test:db` | Test database connection                |

---

## 🚀 Deployment

Deployed on **Vercel** for optimal Next.js performance.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/addymistrel/quantivo)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🌐 Live Demo

[![Quantivo](https://img.shields.io/badge/Visit-Quantivo-blue?style=for-the-badge&logo=vercel)](https://quantivo-mu.vercel.app/)

<p>
  <strong>Made with ❤️ by <a href="https://github.com/addymistrel">addymistrel</a></strong>
</p>

⭐ Star this repo if you found it helpful!

</div>
