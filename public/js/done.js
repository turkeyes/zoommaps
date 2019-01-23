$(document).ready(function() {
  var page_vars = getUrlVars();
  var workerID = page_vars['workerID'] || 'none';
  var dataset = page_vars['dataset'] || 'none';

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