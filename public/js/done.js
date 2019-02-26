$(document).ready(function() {
  var page_vars = new URLSearchParams(window.location.search);
  var workerID = page_vars.get('workerID') || '?';
  var dataset = page_vars.get('dataset') || '?';

  $.ajax({
    type: "POST",
    url: "/end",
    data: JSON.stringify({ workerID, dataset }),
    contentType: "application/json",
    success: function (res) {
      if (res.success) {
        var key = res['key'];
        if (key) {
          $('#submit-code').text(key);
        } else {
          $('#submit-code').text('ERROR');
        }
      } else {
        $('#submit-code').text('ERROR');
      }
    },
    error: function (err) {
      $('#submit-code').text('ERROR');
    }
  });
});