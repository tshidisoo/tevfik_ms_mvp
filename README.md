# Tevfik Management System

The admin and management system for Tevfik Online School, in English, Turkish and Uyghur.
It is a plain HTML, CSS and JavaScript site with no build step and no server, so it runs on GitHub Pages.

**No student or teacher data is stored in this repository.** The site opens empty. The admin signs in
with Google and the site reads the school's Google Drive (registers, lesson-plan docs, MLR folders) and
Google Sheets (student list, registration responses) with read-only access. Everything it reads is kept
in that admin's browser (localStorage) only. Nothing is ever written back to Drive.

## What is in it

| Screen | What it does |
| --- | --- |
| Dashboard | Lessons delivered, gross pay, fines and net pay for the month, and what needs attention |
| Registrations | Links to the Uyghur and Turkish registration forms (copy, WhatsApp share), new form responses waiting for approval, approve or reject |
| Students | The student list loaded from the Student list sheet, with search, filters, edit, mark as left |
| Payroll | Pay per teacher from the registers, with fines from the rules (late plans, late summaries, missing homework, MLR, meetings, day changes) |
| Submission reports | The weekly plan and summary submission report per class, approve and lock |
| Lesson plans | Plans written in the system, review and feedback |
| Registers & homework | Attendance and homework marks with statistics per class and student |
| Classes & students | Packages, lesson counts and class types |
| Teacher performance | Delivery, timeliness, homework and plan completeness per teacher |
| Admin inputs | Exchange rate, meetings, schedule permissions and rule amounts |

## Setup, about 15 minutes

### 1. Put the site on GitHub Pages

1. Create a repository on GitHub, for example `tevfik-management`. Upload every file and folder from this folder,
   including the empty `.nojekyll` file.
2. In the repository open **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**,
   branch **main**, folder **/ (root)**, and save.
3. After a minute the site is live at `https://YOUR-GITHUB-NAME.github.io/tevfik-management/`.
   Note this address for step 2.

GitHub Pages sites are public: anyone with the address can open the page. That is safe here because the page
contains no school data. Data only appears after someone signs in with a Google account that already has
access to the school's Drive.

### 2. Create the Google sign-in (OAuth client ID)

Do this once, with any Google account (the school account is best).

1. Open <https://console.cloud.google.com/> and create a project, for example *Tevfik Management*.
2. **APIs & Services → Library**: turn on **Google Drive API** and **Google Sheets API**.
3. **APIs & Services → OAuth consent screen** (also called *Google Auth Platform*):
   - User type **External**, app name *Tevfik Management System*, your email as support and developer contact.
   - Scopes: add `.../auth/drive.readonly` and `.../auth/spreadsheets.readonly`.
   - **Test users**: add the administrator's Gmail address and your own. Leave the app in **Testing**.
     In Testing mode only these test users can sign in, and Google shows a "Google hasn't verified this app"
     notice: click **Continue**. (Publishing the app for everyone would need Google's verification, which this
     school tool does not need.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorised JavaScript origins**: add `https://YOUR-GITHUB-NAME.github.io` (no path, no trailing slash).
     For testing on your own computer you can also add `http://localhost:8000`.
   - Create, then copy the **Client ID** (it ends in `.apps.googleusercontent.com`).
5. Open `js/config.js` in the repository, paste it into `googleClientId: '...'`, and commit.
   (Or leave it empty and paste it on the site's *Sync from Drive* page; it is then remembered in that browser only.)

The client ID is not a secret. There is no client secret in this site and none is needed.

### 3. First use by the administrator

1. Open the site, click **Sync from Drive**.
2. Paste the link of the Drive folder that holds the teacher folders (or one teacher's or one class's folder),
   tick the months, click **Start sync**, and sign in with Google when asked.
3. Open **Students → Load the student list from Google Sheets**, click **Find tabs**, choose the month tab, then
   **Load this tab**.
4. Open **Registrations**, paste each form's response sheet link once (in the form: *Responses → Show in Sheets*),
   choose the start date, and click **Load new responses**.

The Google sign-in lasts about an hour; after that the next sync simply asks again.

## Drive layout the sync expects

```
(folder pasted by the admin)
└── Teacher folder            e.g. "Teacher A"
    └── Class folder          e.g. "F4 - (Class A) France"
        └── Month folder      e.g. "October 2026" or "Ekim 2026"
            ├── Student'sMonthlyRegister (OCT 2026)   ← Google Sheet, read
            ├── F4-05 (30/10/2026)                    ← lesson-plan doc: created / last-edited times read
            └── ... Oct MLR                           ← folder: last-edited time read
```

- Register sheets: any spreadsheet whose name contains "Register". Cell C1 = class name, C2 = teacher name,
  then blocks starting with "Week 01" with the dates on the next row and Class / H.work pairs (TRUE, FALSE,
  a percentage). Registers that do not follow this are listed under *files need a look*.
- Plan docs: any Google Doc in the month folder whose name has a date in brackets, `(dd/mm/yyyy)`.
- Month folders are recognised in English, Turkish and Uyghur month names.

## Files

```
index.html          page markup
css/styles.css      styles, light and dark themes, right-to-left support for Uyghur
js/config.js        settings: Google client ID, sheet and form IDs
js/model.js         data model and rules engine (payroll, fines, reports, statistics)
js/app.js           screens: dashboard, payroll, reports, lesson plans, registers, performance
js/google.js        Google sign-in and read-only Drive / Sheets calls
js/students.js      students list and registrations
js/sync.js          Sync from Drive: folder crawl and register parser
js/boot.js          start-up and the welcome screen
js/i18n.js          English, Turkish and Uyghur text
```

## Limits to know

- Data is kept per browser. If the admin uses a second computer, she syncs there too. A shared database would be
  the next step for several admins working at once.
- The sync reads lesson-plan doc dates, not the plan text. Plans written inside the system are kept in the browser.
- Moved lessons and cancellation reasons are not read from register notes; a lesson where every student is
  marked absent counts as a no-show.
- The Uyghur and Turkish wording should be checked by a native speaker before wider use.
