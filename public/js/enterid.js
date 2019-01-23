/**
 * Callback for the submit button after entering workerID
 * Just redirects to the experiment
 */
function startTask() {
  var workerID = $('#workerID').val();
  var pathquery = window.location.href.split('?');
  var path = pathquery[0];
  var query = pathquery[1];
  query += ((query ? '&' : '') + 'workerID=' + workerID);
  window.location.href = path + '?' + query;
  return false;
}
