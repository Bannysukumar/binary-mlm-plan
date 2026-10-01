# Binary MLM Platform

A production-ready Binary MLM (Multi-Level Marketing) Platform with Whitelabel Support, built with Next.js 14, Firebase, and TypeScript.

[![License](https://img.shields.io/github/license/Bannysukumar/binary-mlm-plan)](https://github.com/Bannysukumar/binary-mlm-plan/blob/main/LICENSE) [![Stars](https://img.shields.io/github/stars/Bannysukumar/binary-mlm-plan)](https://github.com/Bannysukumar/binary-mlm-plan/stargazers) [![Last commit](https://img.shields.io/github/last-commit/Bannysukumar/binary-mlm-plan)](https://github.com/Bannysukumar/binary-mlm-plan/commits/main)

## Overview

A production-ready Binary MLM (Multi-Level Marketing) Platform with Whitelabel Support, built with Next.js 14, Firebase, and TypeScript.


What is actually in the repository: `app/`, `components/`, `frontend/`, `functions/`, `hooks/`, `lib/`. GitHub reports the primary language as TypeScript.

Published site recorded on the repository: https://binary-mlm-plan-frontend.vercel.app

## Features


- Multi-Tenant Architecture: Support for multiple companies with isolated data
- Role-Based Access Control: Super Admin, Company Admin, and User roles
- Firebase Integration: Authentication, Firestore, Storage, and Analytics
- Income Calculation: Direct, Binary Matching, Sponsor Matching, and Repurchase Income
- Withdrawal Management: Request, approve, and process withdrawals
- Analytics Dashboard: Comprehensive analytics for all user levels
- Settings Management: Platform-wide, company-wide, and user-level settings
- Audit Trail: Complete audit logging for compliance
- Emergency Controls: Platform-wide emergency controls for crisis management

## Tech Stack

| Technology | Where it shows up |
|---|---|
| Next.js | React framework |
| React | User interface |
| Firebase | Backend services used by this repository |
| Tailwind CSS | Styling |
| Recharts | Charts |

## Project Architecture

Next.js interface → Firebase configuration in this repository.

## Project Structure

```text
binary-mlm-plan/
├── app/
├── components/
├── frontend/
├── functions/
├── hooks/
├── lib/
├── public/
├── scripts/
├── shared/
├── styles/
├── AUTOMATED_TEST_RESULTS.md
├── AUTOMATED_TEST_SUITE.md
├── COMPANY_ADMIN_TEST_RESULTS.md
├── INDEX_DEPLOYMENT_STATUS.md
├── SUPER_ADMIN_COMPREHENSIVE_TEST_RESULTS.md
├── SUPER_ADMIN_TEST_RESULTS.md
├── TEST_REPORT.md
├── TEST_USERS_CREATED.md
├── VERCEL_ENV_SETUP.md
├── components.json
├── comprehensive-test.js
├── firebase.json
```

## Getting Started

```bash
git clone https://github.com/Bannysukumar/binary-mlm-plan.git
cd binary-mlm-plan
npm install
npm run dev
```

Scripts defined in package.json:

- `npm run build` — `cd frontend && npm run build`
- `npm run deploy:indexes` — `firebase deploy --only firestore:indexes`
- `npm run dev` — `cd frontend && npm run dev`
- `npm run start` — `cd frontend && npm run start`

## Deployment

- firebase.json is in the repository root.
- The repository homepage is https://binary-mlm-plan-frontend.vercel.app.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

[Banny Sukumar](https://github.com/Bannysukumar)

- GitHub: [@Bannysukumar](https://github.com/Bannysukumar)
- Portfolio: [adepu-sukumar.vercel.app](https://adepu-sukumar.vercel.app/)
- LinkedIn: [Adepu Sukumar](https://www.linkedin.com/in/adepu-sukumar-59b423351)
