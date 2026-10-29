# MyMiXO6

وب‌اپ فارسی و راست‌به‌چپ برای ساخت لابی بازی، پیدا کردن هم‌تیمی و هماهنگی در پنل اختصاصی هر لابی. ساخته‌شده با React، Vite و Supabase.

## امکانات این نسخه

- رابط تاریک جدید، انیمیشن‌های ظریف، فونت فارسی خواناتر و لوگوی بارگذاری‌شدهٔ MyMiXO6.
- هشت تصویر آواتار اختصاصی برای انتخاب در پروفایل.
- صفحهٔ اختصاصی برای هر لابی، فهرست اعضا، مشاهدهٔ پروفایل اعضای همان لابی و چت زنده.
- بستن لابی توسط سازنده؛ پس از بسته‌شدن، ارسال پیام تازه و پیوستن متوقف می‌شود.
- محدودیت دسترسی سمت دیتابیس با RLS برای پیام‌ها، فهرست اعضا و پنل لابی.
- جست‌وجو و فیلتر لابی، ساخت/پیوستن/خروج از لابی، لینک سرور و بخش‌های Config و Store.

## اجرا در محیط محلی

به Node.js 22 یا جدیدتر نیاز است.

```sh
npm install
npm run dev
```

برای توسعهٔ محلی فایل `.env` بساز و مقادیر عمومی پروژه را وارد کن:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

از کلید `service_role` یا هر کلید secret در مرورگر استفاده نکن. فایل `.env` در Git نادیده گرفته می‌شود.

## Supabase

مهاجرت `20261029080721_mymixo6_lobby_chat_and_members_panel.sql` جدول `lobby_messages` را می‌سازد، دسترسی فهرست اعضا را به اعضای همان لابی محدود می‌کند و تغییرات لابی/اعضا/پیام‌ها را برای Realtime منتشر می‌کند. این مهاجرت در پروژهٔ Supabase متصل‌شده با موفقیت اعمال شده است.

آدرس Auth برای GitHub Pages:

- Site URL: `https://origin-core.github.io/MyMiXO6/`
- Redirect URL: `https://origin-core.github.io/MyMiXO6/`

## انتشار در GitHub Pages

Workflow در `.github/workflows/build.yml` متغیرهای `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY` را هنگام build از GitHub Actions Variables می‌خواند. هر دو متغیر باید در Repository → Settings → Secrets and variables → Actions → Variables وجود داشته باشند.
