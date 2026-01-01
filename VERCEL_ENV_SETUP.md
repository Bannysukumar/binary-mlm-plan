# Vercel Environment Variables Setup

## 🔧 Required Firebase Environment Variables

Your app needs these environment variables configured in Vercel for Firebase to work:

### Required Variables:

1. **NEXT_PUBLIC_FIREBASE_API_KEY**
   - Value: `AIzaSyBng3T4aJpLfrZC0eITWWiz7Uz-tJeeR9o`

2. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
   - Value: `binary-plan-2e2ae.firebaseapp.com`

3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
   - Value: `binary-plan-2e2ae`

4. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
   - Value: `binary-plan-2e2ae.firebasestorage.app`

5. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
   - Value: `839113575490`

6. **NEXT_PUBLIC_FIREBASE_APP_ID**
   - Value: `1:839113575490:web:08dd8ecc517ffa6a26b1db`

### Optional Variable:

7. **NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID**
   - Value: `G-THN0XL9LRC` (for Analytics)

## 📝 How to Add Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Sign in to your account

### Step 2: Select Your Project
1. Find and click on your project: **binary-mlm-plan**

### Step 3: Navigate to Environment Variables
1. Click on **Settings** tab
2. Click on **Environment Variables** in the left sidebar

### Step 4: Add Each Variable
1. Click **Add New** button
2. Enter the **Key** (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. Enter the **Value** (use the values listed above)
4. Select **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **Save**
6. Repeat for all 6-7 variables

### Step 5: Redeploy
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeploy

## ✅ Verification

After adding the variables and redeploying, check:
1. Visit your deployed app: https://binary-mlm-plan-frontend.vercel.app/
2. Open browser console (F12)
3. You should see: `Firebase initialized successfully`
4. No more errors about missing environment variables

## 🔒 Security Note

These are **public** environment variables (prefixed with `NEXT_PUBLIC_`), which means they're safe to expose in the client-side code. They're part of your Firebase web app configuration and are meant to be public.

## 🆘 Troubleshooting

If you still see errors after adding variables:
1. Make sure variable names are **exactly** as shown (case-sensitive)
2. Ensure all variables are added to **Production** environment
3. **Redeploy** after adding variables (they don't apply to existing deployments)
4. Check Vercel build logs for any errors

