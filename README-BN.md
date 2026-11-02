# Friends Bazar – Cloud version (বাংলা নির্দেশনা)

## এই প্যাকেজে কী আছে
- `src/App.jsx`: নতুন ওয়েবসাইট অ্যাপ; পুরোনো শপ/কার্ট/অ্যাডমিন ধারণা রাখা হয়েছে।
- `src/lib/supabase.js`: Supabase client ও session persistence।
- `supabase/schema.sql`: Database, RLS, secure checkout RPC, Storage bucket ও Realtime।
- `.env.example`: Supabase config-এর নমুনা।

## গুরুত্বপূর্ণ নিরাপত্তা
- পুরোনো `1234` PIN আর ব্যবহার করা হয় না।
- Admin login হবে Supabase Auth email/password দিয়ে।
- `service_role` / Secret key কখনো `.env.local`-এ VITE_ নামে রাখবেন না, GitHub-এ দেবেন না।
- Browser-এ কেবল Project URL ও anon/publishable key ব্যবহার করবেন।
- Checkout server-side SQL function-এ বর্তমান price/cost/stock যাচাই করে, একসাথে stock কমায়।

## সেটআপ

### 1) Supabase project তৈরি
1. https://supabase.com এ account খুলে New project তৈরি করুন।
2. Project URL ও anon/public key কপি করুন (Project Settings → API)।
3. SQL Editor খুলে `supabase/schema.sql` ফাইলের সম্পূর্ণ কোড paste করে Run করুন।

### 2) প্রথম Admin account
1. Supabase Dashboard → Authentication → Users → Add user / Create new user।
2. নিজের email ও শক্তিশালী password দিয়ে user তৈরি করুন; email confirm করার বিকল্প থাকলে confirm করুন।
3. SQL Editor-এ নিচের query-তে নিজের email বসিয়ে চালান:

```sql
update public.profiles
set role = 'owner'
where email = 'YOUR_ADMIN_EMAIL';
```

4. এরপর ওয়েবসাইটের Admin tab-এ ওই email/password দিয়ে login করুন।
5. Password কাউকে দেবেন না। Admin-কে access দিতে হলে Auth-এ user তৈরি করে profiles.role `admin` করতে হবে।

### 3) Local config
1. `.env.example`-এর কপি করে `.env.local` নাম দিন।
2. `VITE_SUPABASE_URL` ও `VITE_SUPABASE_ANON_KEY`-এ নিজের Supabase URL ও anon/publishable key বসান।
3. `npm install` তারপর `npm run build` চালিয়ে পরীক্ষা করুন।

### 4) GitHub ও Vercel
1. পুরোনো repository-র backup রাখুন বা নতুন branch তৈরি করুন।
2. ZIP-এর ভেতরের ফাইলগুলো repository root-এ একই path অনুযায়ী upload/replace করুন।
3. `.env.local` GitHub-এ upload করবেন না।
4. Vercel → Project → Settings → Environment Variables-এ একই দুইটি variable যোগ করুন:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Vercel-এ Redeploy করুন।

## ডেটা সম্পর্কে
- আগের অ্যাপের অস্থায়ী React state-এ থাকা পুরোনো orders/changes সার্ভারে ছিল না; তাই সেগুলো স্বয়ংক্রিয়ভাবে উদ্ধার বা migrate করা সম্ভব নয়।
- SQL চালালে তিনটি demo product শুধু products table খালি থাকলে seed হবে।
- Partner list-এ email যোগ করলেই admin login তৈরি হয় না। Auth user তৈরি ও `profiles.role` admin করতে হবে।
- Supabase Free Plan-এর quota ও inactivity pause policy থাকতে পারে। এটি unlimited/always-on guarantee নয়।
- Public product catalogue ও site settings realtime-এ refresh হবে। Checkout-এর order data private, শুধু admin দেখতে পারবে।

## চালুর আগে পরীক্ষা
- Public shop-এ product দেখা যায় কি না।
- Admin login ঠিকমতো কাজ করে কি না।
- Admin থেকে product/price/stock পরিবর্তন করলে অন্য browser-এ দেখা যায় কি না।
- Test order দিয়ে stock একবারই কমে কি না।
- Admin logout করলে dashboard access বন্ধ হয় কি না।
