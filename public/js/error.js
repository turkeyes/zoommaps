/**
 * Shows a QR code and link of the current page
 * This should only render if the server has detected we are on desktop
 *   and sent the error page
 */
$(document).ready(function () {
  if ($('#qrcode').length > 0) {
    $('#qrcode').qrcode(window.location.href);
  }
  $('#mobile-link').text(window.location.href);
});
