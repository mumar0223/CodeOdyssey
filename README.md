# 🚀 CodeOdyssey

CodeOdyssey is an AI-powered coding assistant that helps users generate, explore, and interact with code using modern AI capabilities.
The project integrates **Google Gemini AI** with **Convex** to create a real-time AI coding experience.

---

# 📌 Features

* 🤖 AI-powered code generation
* 💬 Interactive coding assistant
* ⚡ Real-time backend powered by Convex
* 🧠 Google Gemini API integration
* 🧑‍💻 Modern developer-friendly UI
* 🔄 Live development environment

---

# 🛠️ Tech Stack

* **Frontend:** Next.js / React
* **Backend:** Convex
* **AI Model:** Google Gemini API
* **Package Manager:** npm
* **Runtime:** Node.js

---

# 📦 Prerequisites

Make sure you have the following installed:

* **Node.js (v18 or later)**
* **npm or yarn**
* **Git**
* **Convex CLI**

Install Convex CLI if you don’t have it:

```bash
npm install -g convex
```

---

# ⚙️ Installation

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/mumar0223/CodeOdyssey.git
```

Move into the project folder:

```bash
cd CodeOdyssey
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

or

```bash
yarn install
```

---

# 🔑 Environment Variables Setup

Create a **`.env.local`** file in the root of the project.

```bash
touch .env.local
```

Add the following environment variables:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_google_gemini_api_key

# Convex deployment URL
CONVEX_DEPLOYMENT=your_convex_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_convex_public_url
```

---

# 🤖 Google Gemini API Setup

1. Go to **Google AI Studio**
   https://aistudio.google.com/

2. Create an API key.

3. Copy the API key and paste it into:

```env
GEMINI_API_KEY=your_api_key_here
```

---

# ⚡ Convex Setup

Initialize Convex in the project.

```bash
npx convex dev
```

This command will:

* Start the **Convex development server**
* Deploy backend functions
* Generate Convex types
* Connect your local app to the backend

You will see something like:

```
✔ Convex functions deployed!
✔ Development server running
```

---

# ▶️ Running the Development Server

Start the frontend:

```bash
npm run dev
```

or

```bash
yarn dev
```

Now open your browser and go to:

```
http://localhost:3000
```

---

# 📁 Project Structure

```
CodeOdyssey
│
├── convex/            # Convex backend functions
├── components/        # React components
├── pages/ or app/     # Next.js routes
├── lib/               # Utility functions
├── public/            # Static assets
├── .env.local         # Environment variables
└── README.md
```

---

# 🧪 Development Workflow

1. Run Convex backend

```
npx convex dev
```

2. Run frontend

```
npm run dev
```

3. Start building features 🚀

---

# 📤 Deployment

To deploy Convex:

```bash
npx convex deploy
```

For frontend deployment you can use:

* Vercel
* Netlify
* Docker

---

# 🤝 Contributing

Contributions are welcome!

Steps:

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/my-feature
```

3. Commit changes

```bash
git commit -m "Added new feature"
```

4. Push to your branch

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

---

# ⭐ Support

If you like this project:

* ⭐ Star the repository
* 🐛 Report issues
* 💡 Suggest improvements

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

Created by **Muhammad Umar**

GitHub:
https://github.com/mumar0223
