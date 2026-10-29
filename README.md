# MyMiXO6

وب‌اپ فارسی و راست‌به‌چپ برای ساخت لابی بازی، پیدا کردن هم‌تیمی و هماهنگی در پنل اختصاصی هر لابی. ساخته‌شده با React، Vite و Supabase.

## امکانات

- هویت بصری اختصاصی MyMiXO6 با نشان SVG جدید؛ تصویر نمونهٔ ارسالی تنها مرجع فرم و چینش بوده و عیناً به‌عنوان لوگو استفاده نمی‌شود.
- انتخاب ظاهر `NEON` و `CLASSIC` از داخل سایت؛ انتخاب تم در همان مرورگر ذخیره می‌شود.
- واکنش نور به حرکت موس، ریزحرکت دوبعدی نشان، حالت فشردن/نگه‌داشتن و انیمیشن‌های ظریف در هر دو تم؛ انیمیشن‌ها برای `prefers-reduced-motion` کاهش می‌یابند.
- هشت تصویر آواتار اختصاصی برای پروفایل.
- پنل مجزای هر لابی، فهرست اعضا، پروفایل‌های عمومی و چت زنده با دسترسی محدودشده با RLS.
- وقتی ظرفیت لابی کامل می‌شود، وضعیت آن به `full` تغییر می‌کند و ساعت ۱۰ دقیقه‌ای از زمان ثبت‌شده در دیتابیس شروع می‌شود. در این مدت اعضا می‌توانند هماهنگی کنند؛ سپس job سمت دیتابیس لابی را خودکار `closed` می‌کند. سازنده هم می‌تواند زودتر آن را ببندد؛ سیاست دیتابیس اجازه نمی‌دهد کلاینت وضعیت لابی را به‌صورت دلخواه دوباره باز یا پر اعلام کند. پس از شروع تایمر، خروج عضو زمان پایان را لغو یا از نو شروع نمی‌کند؛ لابی تا پایان همان مهلت در حالت شمارش باقی می‌ماند و پس از ۱۰ دقیقه بسته می‌شود.
- جست‌وجو و فیلتر لابی، ساخت/پیوستن/خروج، لینک سرور، و بخش‌های Config و Store.
- عنوان و توضیحات SEO، canonical، Open Graph/Twitter، schema.org، تصویر اشتراک‌گذاری، sitemap و web manifest.

## توسعهٔ محلی

به Node.js 22 یا جدیدتر نیاز است.

```sh
npm install
npm run dev
```

برای توسعهٔ محلی فایل `.env` بساز:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

از کلید `service_role` یا هر کلید secret در مرورگر استفاده نکن.

## Supabase

مهاجرت‌های `20261029080721_mymixo6_lobby_chat_and_members_panel.sql`، `20261029083819_mymixo6_lobby_full_countdown_autoclose.sql` و `20261029083936_mymixo6_public_full_lobby_listing.sql`، `20261029084808_mymixo6_guard_lobby_status_updates.sql`، `20261029085005_mymixo6_prevent_late_reopen_after_grace.sql` و `20261029085257_mymixo6_preserve_full_lobby_countdown.sql` در پروژهٔ Supabase متصل‌شده اعمال شده‌اند. زمان و بستن لابی سمت سرور اجرا می‌شوند؛ تایمر مرورگر فقط نمایش آن است. Job فعال `mymixo6-auto-close-full-lobbies` هر ۳۰ ثانیه لابی‌های پرشده‌ای را که از ۱۰ دقیقه گذشته‌اند می‌بندد. در نتیجه ممکن است وضعیت DB حداکثر حدود ۳۰ ثانیه پس از صفر شدن نمایشگر به‌روزرسانی شود.

## انتشار در GitHub Pages

Workflow در `.github/workflows/build.yml` متغیرهای `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY` را هنگام build از GitHub Actions Variables می‌خواند. هر دو متغیر باید در Repository → Settings → Secrets and variables → Actions → Variables وجود داشته باشند.

سایت فعلی: <https://origin-core.github.io/MyMiXO6/>

نقشهٔ سایت: <https://origin-core.github.io/MyMiXO6/sitemap.xml>

در Google Search Console می‌توان نقشهٔ سایت را با همین URL ثبت کرد. از آنجا که سایت روی GitHub Pages و در مسیر مخزن میزبانی می‌شود، فایل `robots.txt` این پروژه در مسیر `/MyMiXO6/robots.txt` قرار می‌گیرد؛ `robots.txt` استانداردِ دامنه باید در ریشهٔ میزبان باشد و در صورت انتقال سایت به دامنهٔ اختصاصی، باید آن را همان‌جا نیز منتشر کرد.
