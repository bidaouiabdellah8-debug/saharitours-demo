/**
 * Saharitours — form-to-Google-Sheets backend + review reminder emails.
 *
 * SETUP:
 * 1. Create a new Google Sheet (any name, e.g. "Saharitours Bookings").
 * 2. In the Sheet: Extensions -> Apps Script.
 * 3. Delete anything in the editor and paste this entire file.
 * 4. Change NOTIFY_EMAIL below to the address that should get an email per lead.
 * 5. Click Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 6. Click Deploy, authorize the permissions Google asks for, then copy the
 *    "Web app URL" (ends in /exec).
 * 7. Paste that URL into js/main.js, replacing YOUR_DEPLOYMENT_ID in
 *    GOOGLE_SHEETS_ENDPOINT.
 * 8. Re-deploy (Deploy -> Manage deployments -> edit -> new version) any time
 *    you change this script — editing the file alone does not update /exec.
 *
 * REVIEW REMINDER EMAILS — one-time setup:
 * 9. In the Apps Script editor, select the "setupDailyTrigger" function from
 *    the function dropdown (top toolbar) and click Run once. Authorize when
 *    asked. This installs a daily 9am trigger that checks the "Bookings"
 *    sheet and emails clients whose tour ended REMINDER_DELAY_DAYS ago,
 *    asking them to leave a review.
 * 10. HOW TO USE IT: once you confirm a booking's exact dates (by phone,
 *     WhatsApp, etc. — the contact/transfer forms only capture an
 *     approximate date), add one row to the "Bookings" sheet tab yourself:
 *     First Name | Last Name | Email | Tour Name | Tour End Date | Reminder Sent
 *     Leave "Reminder Sent" empty. The script fills it in once the email
 *     goes out, so each booking is only reminded once.
 */

const NOTIFY_EMAIL = 'bidaouiabdellah8@gmail.com';
const REVIEW_FORM_URL = 'https://saharitours-demo.netlify.app/leave-a-review.html';
const REMINDER_DELAY_DAYS = 3; // send the review request this many days after the tour ends

const CONTACT_HEADERS  = ['Timestamp', 'First Name', 'Last Name', 'Email', 'Phone', 'Tour of Interest', 'Travelers', 'Travel Date', 'Message'];
const TRANSFER_HEADERS = ['Timestamp', 'Transfer', 'First Name', 'Last Name', 'Email', 'Phone', 'Transfer Date', 'Passengers', 'Flight / Notes'];
const REVIEW_HEADERS   = ['Timestamp', 'First Name', 'Last Name', 'Email', 'Tour', 'Travel Date', 'Rating', 'Review', 'Consent to Publish'];
const BOOKING_HEADERS  = ['First Name', 'Last Name', 'Email', 'Tour Name', 'Tour End Date', 'Reminder Sent'];

function doPost(e) {
  const params = (e && e.parameter) || {};

  // Honeypot: real visitors never fill this hidden field in — bots do.
  if (params['bot-field']) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  }

  const formName = params['form-name'];
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (formName === 'transfer-booking') {
    appendRow(ss, 'Transfers', TRANSFER_HEADERS, [
      new Date(),
      params.transferChoice || '',
      params.firstName || '',
      params.lastName || '',
      params.email || '',
      params.phone || '',
      params.transferDate || '',
      params.passengers || '',
      params.message || '',
    ]);
    notify('New transfer booking — ' + (params.transferChoice || 'Unspecified'),
      `Transfer: ${params.transferChoice || '-'}\n` +
      `Name: ${params.firstName || ''} ${params.lastName || ''}\n` +
      `Email: ${params.email || '-'}\n` +
      `Phone: ${params.phone || '-'}\n` +
      `Date: ${params.transferDate || '-'}\n` +
      `Passengers: ${params.passengers || '-'}\n` +
      `Notes: ${params.message || '-'}`);

  } else if (formName === 'review') {
    appendRow(ss, 'Reviews', REVIEW_HEADERS, [
      new Date(),
      params.firstName || '',
      params.lastName || '',
      params.email || '',
      params.tour || '',
      params.travelDate || '',
      params.rating || '',
      params.message || '',
      params.consent ? 'Yes' : 'No',
    ]);
    notify('New review — ' + (params.rating || '?') + '★ for ' + (params.tour || 'Unspecified'),
      `Rating: ${params.rating || '-'}/5\n` +
      `Tour: ${params.tour || '-'}\n` +
      `Name: ${params.firstName || ''} ${params.lastName || ''}\n` +
      `Email: ${params.email || '-'}\n` +
      `Consent to publish: ${params.consent ? 'Yes' : 'No'}\n\n` +
      `Review:\n${params.message || '-'}\n\n` +
      `Reminder: this review is NOT live on the site yet — copy it into the testimonials section on index.html once you've read it.`);

  } else {
    appendRow(ss, 'Contact', CONTACT_HEADERS, [
      new Date(),
      params.firstName || '',
      params.lastName || '',
      params.email || '',
      params.phone || '',
      params.tourInterest || '',
      params.travelers || '',
      params.travelDate || '',
      params.message || '',
    ]);
    notify('New enquiry — ' + (params.firstName || '') + ' ' + (params.lastName || ''),
      `Tour of interest: ${params.tourInterest || '-'}\n` +
      `Name: ${params.firstName || ''} ${params.lastName || ''}\n` +
      `Email: ${params.email || '-'}\n` +
      `Phone: ${params.phone || '-'}\n` +
      `Travelers: ${params.travelers || '-'}\n` +
      `Travel date: ${params.travelDate || '-'}\n` +
      `Message: ${params.message || '-'}`);
  }

  return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function appendRow(ss, sheetName, headers, row) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  sheet.appendRow(row);
}

function notify(subject, body) {
  if (!NOTIFY_EMAIL) return;
  MailApp.sendEmail(NOTIFY_EMAIL, '[Saharitours] ' + subject, body);
}

/**
 * Run this ONCE from the Apps Script editor (select it in the function
 * dropdown, then click Run) to install the daily review-reminder trigger.
 * Re-running it is safe — it clears any old trigger for this function first.
 */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendReviewReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReviewReminders').timeBased().everyDays(1).atHour(9).create();
}

/**
 * Runs daily (once setupDailyTrigger has been run once). Looks at the
 * "Bookings" sheet — each row you add by hand once a booking's dates are
 * confirmed — and emails the client a review request once their tour ended
 * REMINDER_DELAY_DAYS days ago, then marks that row so it's never sent twice.
 */
function sendReviewReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Bookings');
  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(BOOKING_HEADERS);
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setFontWeight('bold');
    return; // nothing to check yet
  }

  const data = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    const [firstName, lastName, email, tourName, tourEndDate, reminderSent] = data[i];
    if (!email || !tourEndDate || reminderSent) continue;

    const endDate = new Date(tourEndDate);
    if (isNaN(endDate.getTime())) continue;
    endDate.setHours(0, 0, 0, 0);

    const daysSince = Math.round((today - endDate) / (1000 * 60 * 60 * 24));
    if (daysSince < REMINDER_DELAY_DAYS) continue; // not time yet

    MailApp.sendEmail({
      to: email,
      subject: `How was your trip, ${firstName || 'there'}?`,
      body:
        `Hi ${firstName || ''},\n\n` +
        `We hope you had an unforgettable time on your ${tourName || 'Morocco'} tour with Saharitours!\n\n` +
        `Would you mind taking a minute to share your experience? It really helps other travelers, and we'd love to hear how it went:\n` +
        `${REVIEW_FORM_URL}\n\n` +
        `Thank you,\nThe Saharitours Team`,
    });

    sheet.getRange(i + 1, 6).setValue(new Date()); // mark "Reminder Sent"
  }
}
