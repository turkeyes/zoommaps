$(document).ready(function() {
  var page_vars = new URLSearchParams(window.location.search);
  var workerID = page_vars.get('workerID');
  var dataset = page_vars.get('dataset');
  $.ajax({
    url: '/dataset/' + dataset + '?workerID=' + workerID,
    type: 'GET',
    dataType: 'json',
    success: function (data) {
      loadSurvey(workerID, dataset, data.extraQuestions);
    }
  });
});

function loadSurvey(workerID, dataset, extraQuestions) {
  var $extraQuestions = $('#extra-questions');
  extraQuestions.forEach(function(question, i) {
    var $textarea = $('<textarea></textarea>')
      .addClass('extra-answer')
      .attr('name', 'eq' + i)
      .attr('rows', 2);
    var $prompt = $('<div></div>')
      .html(question);
    var $field = $('<div></div>')
      .addClass('field');
    $field.append($prompt);
    $field.append($textarea);
    $extraQuestions.append($field);
  });
  if (extraQuestions.length === 0) {
    $extraQuestions.hide();
  }
  var formData = {
    fields: {
      gender: {
        identifier: 'gender',
        rules: [{
          type: 'checked',
          prompt: 'Please select a gender'
        }]
      },
      ageGroup: {
        identifier: 'ageGroup',
        rules: [{
          type: 'checked',
          prompt: 'Please select an age group'
        }]
      },
      ethnicity: {
        identifier: 'ethnicity',
        rules: [{
          type: 'checked',
          prompt: 'Please select an ethnicity'
        }]
      },
      education: {
        identifier: 'education',
        rules: [{
          type: 'checked',
          prompt: 'Please select an education level'
        }]
      }
    }
  };
  $('#survey-form').form(formData);

  $('#survey-form').submit(function(e) {
    e.preventDefault();
    if (!$('#survey-form').form('is valid')) {
      $('.error.message').text('Please complete the form.');
    } else {
      var zoom = $("textarea[name=zoom]").val();
      var gender = $("input[type=radio][name=gender]:checked").val();
      var ageGroup = $("input[type=radio][name=ageGroup]:checked").val();
      var ethnicity = $("input[type=checkbox][name=ethnicity]:checked").val();
      var education = $("input[type=radio][name=education]:checked").val();
      var feedback = $("textarea[name=feedback]").val();
      var extraAnswers = [];
      $(".extra-answer").each(function() {
        extraAnswers.push($(this).val());
      });
  
      var data = {
        workerID,
        dataset,
        zoom,
        gender,
        ageGroup,
        ethnicity,
        education,
        feedback,
        extraAnswers
      };
  
      $.ajax({
        type: "POST",
        url: "/survey",
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (res) {
          if (res.success) {
            location.reload(true);
          } else {
            $('.error.message').text('Something went wrong. Try again.');
          }
        },
        error: function (err) {
          $('.error.message').text('Something went wrong. Try again.');
        }
      });
    }
    return false;
  })

  $("input:checkbox[name=ethnicity]").change(function () {
    var unspecified = $("#ethnicUnspecified").is(":checked");
    if (unspecified) {
      $("input:checkbox[name=ethnicity]").not("#ethnicUnspecified")
        .prop("checked", false);
      $(".ethnicityOption").addClass("disabled");
    } else {
      $(".ethnicityOption").removeClass("disabled");
    }
  });
}
