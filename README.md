# SSC Rank Agent (RankMitra)

**SSC Rank Agent** is an intelligent web application for analyzing SSC (Staff Selection Commission) exam performance and predicting ranks. Built to help SSC exam aspirants understand their performance and estimate their rank based on their answer keys and score cards.

## 📋 Overview

This application parses SSC exam answer keys and score cards, calculates marks based on exam-specific marking schemes, analyzes section-wise performance, and predicts overall ranks. It supports multiple SSC exam tiers (Tier 1 and Tier 2) and handles various exam formats.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (99.7%)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Testing**: [Vitest](https://vitest.dev/) + [jsdom](https://github.com/jsdom/jsdom)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Form Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Query Management**: [TanStack Query](https://tanstack.com/query)

## 📁 Project Structure

```
ssc-rank-agent/
├── app/                      # Next.js App Router pages and layouts
│   ├── api/                  # API routes
│   │   ├── submit/           # Submission endpoints
│   │   ├── result/           # Result retrieval
│   │   ├── leaderboard/      # Leaderboard data
│   │   ├── exams/            # Exam management
│   │   ├── admin/            # Admin panel APIs
│   │   └── cron/             # Scheduled jobs
│   ├── exams/                # Exam listing pages
│   ├── result/               # Result display pages
│   ├── leaderboard/          # Leaderboard pages
│   └── admin/                # Admin panel pages
├── lib/                      # Core business logic
│   ├── parser/               # Answer key parsing logic
│   │   ├── config.ts         # Exam configurations
│   │   ├── types.ts          # Parser type definitions
│   │   ├── registry.ts       # Vendor registry
│   │   └── tcs.ts            # TCS-specific parser
│   ├── services/             # Business services
│   │   ├── parser.ts         # Parsing service
│   │   └── calculator.ts     # Score calculation service
│   ├── db/                   # Database setup and schema
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   ├── client.ts         # Database client
│   │   └── seed.ts           # Database seeding
│   ├── hooks/                # Custom React hooks
│   └── jobs/                 # Background job definitions
├── components/               # React components
│   ├── admin/                # Admin panel components
│   └── ui/                   # Reusable UI components
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── public/                   # Static assets
└── scripts/                  # Utility scripts

```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+ and npm/pnpm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/the-ankit-s/ssc-rank-agent-v-latest.git
   cd ssc-rank-agent-v-latest
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file from the example:

   ```bash
   cp .env.example .env.local
   ```

   Update the values in `.env.local` with your actual configuration:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET_KEY`: A secure random string (at least 32 characters)
   - `NEXT_PUBLIC_APP_URL`: Your application URL (e.g., http://localhost:3000)

4. **Set up the database**

   Generate the database schema:

   ```bash
   npm run db:generate
   ```

   Push the schema to your database:

   ```bash
   npm run db:push
   ```

   (Optional) Seed the database with sample data:

   ```bash
   npm run db:seed
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET_KEY` | Secret key for JWT authentication (min 32 chars) | Yes | - |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | No | http://localhost:3000 |

See `.env.example` for a complete template.

## 🧪 Running Tests

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm test -- --watch
```

## 📡 API Routes

### Public Endpoints

- **POST** `/api/submit` - Submit exam responses for analysis
- **GET** `/api/result/[id]` - Retrieve a specific result
- **GET** `/api/leaderboard` - Get leaderboard data
- **GET** `/api/exams` - List available exams
- **POST** `/api/cron` - Trigger scheduled jobs (protected)

### Admin Endpoints

All admin endpoints are under `/api/admin/*` and require authentication:

- **Auth**: `/api/admin/auth` - Admin authentication
- **Submissions**: `/api/admin/submissions` - Manage submissions
- **Exams**: `/api/admin/exams` - Manage exams
- **Cutoffs**: `/api/admin/cutoffs` - Manage cutoff marks
- **Reports**: `/api/admin/reports/generate` - Generate reports
- **Jobs**: `/api/admin/jobs` - Manage background jobs
- **Stats**: `/api/admin/stats` - View statistics
- **Logs**: `/api/admin/logs` - View application logs
- **Settings**: `/api/admin/settings` - Manage settings

## 🎯 How to Add New Exam Types

1. **Update Exam Configuration** (`lib/parser/config.ts`)

   Add a new exam variant with its marking scheme and section mapping:

   ```typescript
   export const EXAM_CONFIGS: Record<SSCExamVariant, ExamConfig> = {
     // ... existing configs
     tier3: {
       variant: "tier3",
       marks: { positive: 2, negative: 0.5 },
       sectionMap: {
         "Section Name": "MappedName",
         // Add section mappings
       },
     },
   };
   ```

2. **Update Type Definitions** (`lib/parser/types.ts`)

   Add the new variant to the type:

   ```typescript
   export type SSCExamVariant = "tier1" | "tier2" | "tier3";
   ```

3. **Test the Configuration**

   Add unit tests for the new exam type in `tests/unit/parser/config.test.ts`

## 📝 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run biome linter
npm run format       # Format code with biome
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:seed      # Seed the database
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Ankit Singh** - [the-ankit-s](https://github.com/the-ankit-s)

## 🙏 Acknowledgments

- SSC (Staff Selection Commission) for providing exam data formats
- All contributors and testers who helped improve this project
- The open-source community for the amazing tools and libraries

---

**Note**: This application is for educational and analysis purposes only. It does not represent official SSC rankings or predictions. Always refer to official SSC notifications for accurate information.

