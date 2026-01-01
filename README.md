# Binary MLM Platform

A production-ready Binary MLM (Multi-Level Marketing) Platform with Whitelabel Support, built with Next.js 14, Firebase, and TypeScript.

## Features

- **Multi-Tenant Architecture**: Support for multiple companies with isolated data
- **Role-Based Access Control**: Super Admin, Company Admin, and User roles
- **Firebase Integration**: Authentication, Firestore, Storage, and Analytics
- **Income Calculation**: Direct, Binary Matching, Sponsor Matching, and Repurchase Income
- **Withdrawal Management**: Request, approve, and process withdrawals
- **Analytics Dashboard**: Comprehensive analytics for all user levels
- **Settings Management**: Platform-wide, company-wide, and user-level settings
- **Audit Trail**: Complete audit logging for compliance
- **Emergency Controls**: Platform-wide emergency controls for crisis management

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **State Management**: Zustand
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Recharts

## Project Structure

```
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/      # Next.js app router pages
│   │   ├── components/  # React components
│   │   ├── lib/      # Utility functions and services
│   │   ├── shared/   # Shared types and constants
│   │   └── store/    # Zustand state management
│   └── public/       # Static assets
├── functions/         # Firebase Cloud Functions
│   └── src/
│       ├── triggers/  # Firestore triggers
│       ├── income/    # Income calculation logic
│       ├── cron/      # Scheduled functions
│       └── utils/     # Utility functions
└── firestore.rules   # Firestore security rules
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI
- Firebase project with Firestore, Authentication, and Cloud Functions enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Bannysukumar/binary-mlm-plan.git
cd binary-mlm-plan
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install Cloud Functions dependencies:
```bash
cd ../functions
npm install
```

4. Set up environment variables:

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

5. Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

6. Deploy Cloud Functions:
```bash
cd functions
firebase deploy --only functions
```

7. Run the development server:
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
cd frontend
npm run build
npm start
```

## Environment Variables

All Firebase configuration is done through environment variables. Make sure to set all required variables before building or deploying.

## Security

- Firestore security rules are configured for role-based access control
- Authentication is handled through Firebase Auth
- Custom claims are used for role and company ID management

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team.

