# Expense & Receipt Tracker

A sleek, mobile-first web application built for tracking expenses, managing receipts, and generating reimbursement reports. Designed with a premium, app-like UI focusing on speed and intuitive user flows.

## ✨ Features

- **Dynamic Dashboard**: Visualize unbilled, uncategorized, and waiting-for-payment totals at a glance with beautiful, custom-styled metric cards.
- **Tinder-Style 'Uncategorized' Inbox**: Quickly process incoming receipts using a fluid, swipeable card interface (powered by Framer Motion). Swipe to skip or tap the glowing category buttons to instantly file expenses.
- **Responsive Receipts List**: A native-feeling, stacked card layout on mobile devices that expands to a full table view on desktop. Complete with integrated dropdowns for instant category adjustments.
- **Billing & Reporting**: Batch process reimbursable expenses. Move items from 'Unbilled' to 'Billed' to 'Paid' with single-click batch actions.
- **Transaction Details & Notes**: Attach images to transactions and auto-save custom notes dynamically.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Icons**: Heroicons / Custom SVG

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase Project (with a `transactions` table configured)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies
```bash
npm install
# or yarn install / pnpm install
```

### 3. Environment Variables
Copy the example environment file and fill in your Supabase credentials:
```bash
cp .env.local.example .env.local
```
Inside `.env.local`, add your project keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 🗄️ Database Schema

For the app to function correctly, ensure your Supabase `transactions` table includes the following columns:
- `id` (uuid)
- `date` (date)
- `merchant` (text)
- `amount` (numeric)
- `category` (text)
- `receipt_image_url` (text, optional)
- `notes` (text, optional)
- `reimbursement_billed` (boolean, default false)
- `reimbursement_paid` (boolean, default false)

## 📄 License

This project is licensed under the MIT License.
