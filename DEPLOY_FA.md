# انتشار نسخهٔ بازطراحی‌شدهٔ MyMiXO6

1. ZIP نهایی را استخراج کن. محتویات پوشه (از جمله `src`، `public`، `index.html`، `package.json`، `.github` و `supabase`) را در ریشهٔ مخزن `Origin-Core/MyMiXO6` جایگزین کن؛ پوشه را به‌صورت تو در تو در مخزن قرار نده.
2. لوگوی جدید از نشان M مینیمال + نوشتهٔ واضح MyMiXO6 ساخته شده؛ favicon همان نشان M قبلی است و آواتارهای نمادی قبلی برگشته‌اند. فایل SVG خوشنویسی‌شدهٔ آپلودی فقط برای مرجع در `design-assets` نگه داشته شده است.

فایل `.env.example` فقط الگو است؛ مقدار واقعی کلید را داخل فایل عمومی نگذار. GitHub Actions باید دو Variables زیر را داشته باشد: `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Commit کن و هر دو job ساخت و Deploy در [GitHub Actions](https://github.com/Origin-Core/MyMiXO6/actions) را بررسی کن.
4. بعد از سبزشدن jobها، سایت را با `Ctrl+Shift+R` تازه‌سازی کن.
5. در Google Search Console نشانی `https://origin-core.github.io/MyMiXO6/` را ثبت کن و `https://origin-core.github.io/MyMiXO6/sitemap.xml` را به بخش Sitemaps اضافه کن.

**مهم:** migrationها در Supabase فعلی اعمال شده‌اند. آن‌ها را دوباره از SQL Editor اجرا نکن. اگر از یک دیتابیس جدید استفاده می‌کنی، ابتدا از schema/پالیسی‌ها نسخهٔ پشتیبان بگیر و مهاجرت‌ها را به‌ترتیب بررسی کن. هیچ `service_role` یا secret key در فایل‌های public قرار نده.


### لوگو و آواتارها
لوگوی ارسالی در `public/mymixo6-logo.png` استفاده می‌شود؛ favicon و آیکون اپ نیز از همان نشان ساخته شده‌اند. هشت آواتار کاراکتری از مجموعهٔ قبلی در `public/avatars/` قرار دارند. فایل‌های migration دیتابیس را برای پروژهٔ Supabase فعلی دوباره اجرا نکن.

## آخرین بازبینی برند
- فایل نشان اصلی: `public/mymixo6-logo.png` (از فایل ارسالی کاربر؛ فقط فضای شفاف بیرونی برش خورده است).
- فاوآیکن و آیکون نصب‌شونده: `public/mymixo6-favicon.png`؛ از همان نشان ساخته شده است.
- نوشتهٔ متحرک `MyMiXO6` جدا از نشان رسم شده تا لوگوی اصلی واضح بماند. حرکت موس و نگه‌داشتن کلیک روی نوشته و نشان اثر می‌گذارد؛ در تنظیمات کاهش حرکت سیستم، انیمیشن‌ها خاموش می‌شوند.
- آواتارها: ۸ پرترهٔ کاراکتری قبلی در `public/avatars/*.webp` برگشته‌اند.
- پس از استخراج ZIP، پوشه‌ها را با همین ساختار به ریشهٔ مخزن کپی کن. `node_modules` داخل بسته نیست؛ GitHub Actions وابستگی‌ها را نصب و سایت را build می‌کند.
