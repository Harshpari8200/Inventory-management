# 🔐 Auth Starter

> A modern, production-ready authentication starter kit built with Next.js 16, Better Auth, and Convex.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)

## ✨ Features

- **🚀 Next.js 16 (App Router)** - The latest and greatest from Vercel.
- **🔒 Better Auth** - Secure, type-safe authentication.
- **💾 Convex** - Real-time backend as a service.
- **🎨 Shadcn UI** - Beautiful, accessible components.
- **🎭 Framer Motion** - Smooth animations and transitions.
- **📱 Responsive Design** - Mobile-first approach with a bottom drawer for auth.
- **🖼️ Vercel Blob** - Easy image uploads for user profiles.
- **✨ Polished UI** - Glassmorphism, blur effects, and smooth interactions.

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Components:** [Shadcn UI](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/) & [Hugeicons](https://hugeicons.com/)
- **Backend:** [Convex](https://www.convex.dev/)
- **Auth:** [Better Auth](https://better-auth.com/)
- **Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Animations:** [Motion](https://motion.dev/) (Framer Motion)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/auth-starter.git
    cd auth-starter
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    bun install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root directory and add the following:

    ```env
    # Convex
    CONVEX_DEPLOYMENT=your_convex_deployment
    NEXT_PUBLIC_CONVEX_URL=your_convex_url
    NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url

    # Better Auth
    BETTER_AUTH_SECRET=your_better_auth_secret
    BETTER_AUTH_URL=http://localhost:3000

    # Vercel Blob
    NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    # or
    bun run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

5.  **Run Convex:**

    In a separate terminal, run:

    ```bash
    npx convex dev
    ```

## 📂 Project Structure

```
.
├── app/                  # Next.js App Router
├── components/           # React components
│   ├── ui/               # Shadcn UI components
│   └── web/              # Web-specific components (AuthDrawer, etc.)
├── lib/                  # Utilities and libraries
│   ├── auth-client.ts    # Better Auth client
│   └── utils.ts          # Helper functions
├── convex/               # Convex backend functions
└── public/               # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [BuddyCodez](https://github.com/BuddyCodez)
