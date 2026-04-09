# TopLadder

A modern web application for organizing and managing sports reunions, built with Next.js 16, React 19, and TypeScript. TopLadder allows users to create reunions, form teams, and track matches in real-time.

## Features

- **User Authentication**: Secure login and registration using Clerk
- **Reunion Management**: Create and join reunions with unique codes
- **Team Formation**: Automatically form balanced groups for matches
- **Real-time Updates**: Live dashboard with match progress and player status
- **Friend System**: Add friends and send reunion invites
- **Match Tracking**: Start, finish, and record match results
- **Responsive Design**: Modern UI built with Tailwind CSS and Radix UI components

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Clerk
- **Database**: MongoDB with Mongoose

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Clerk account for authentication

### Installation

1. Clone the repository:
```bash
git clone git@github.com:RicardoBravo92/topladder.git
cd topladder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database
MONGODB_URI=your_mongodb_connection_string
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── actions/           # Server actions
│   ├── page.tsx           # Home page
│   └── reunion/[id]/      # Reunion pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── lib/                  # Utilities and configurations
│   ├── actions/          # Server-side actions
│   ├── models/           # Mongoose models
│   └── ...               # Utils, database config
└── public/               # Static assets
```

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components from [Radix UI](https://www.radix-ui.com)
- Authentication by [Clerk](https://clerk.com)
