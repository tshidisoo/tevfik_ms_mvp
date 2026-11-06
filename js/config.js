/* Tevfik Management System settings.
   None of these values are secret: an OAuth client ID is public by design, and the
   sheet and form IDs below only open for Google accounts that already have access. */
window.TEVFIK_CONFIG = {
  // Google Cloud > APIs & Services > Credentials > OAuth client ID (type: Web application).
  // Leave empty to paste it on the Sync from Drive page instead (stored in that browser only).
  googleClientId: '',

  // The "Student list" Google Sheet (one tab per month, e.g. "2026-11").
  studentListSheet: '1Ur2WTxJTrpl7CE7LotBJbVyDKB4llxZEl9NX-Y-obNs',

  // The two registration Google Forms.
  forms: {
    ug: '1jX6QG6F_OD0ZgUPdvuMleXT99W6c0eaFRjckCUacwrI',
    tr: '1hmnkJUC-tph1oPLZCeGL4WaoM_LyXSgILdDFNw-UMec'
  },

  // Optional: the response sheet of each form (Form > Responses > Show in Sheets).
  // Paste the sheet links here, or once on the Registrations page.
  responseSheets: { ug: '', tr: '' }
};
