import surveyHTML from './demographic-survey.html';
import './demographic-survey.scss';

import $ from 'jquery';

import { formPOST } from '../utils';

const surveyConfig = [
  {
    heading: 'How did you use zoom to explore the images? What image regions did you find you zoomed into?',
    name: 'zoom',
    type: 'textarea',
    rows: 2,
    placeholder: '',
  },
  //
  {
    heading: 'Gender',
    name: 'gender',
    type: 'radio',
    options: {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      unspecified: 'Prefer not to say',
    },
  },
  {
    heading: 'Age',
    name: 'ageGroup',
    type: 'radio',
    options: {
      ageGroup18: '18 to 24',
      ageGroup25: '25 to 34',
      ageGroup35: '35 to 44',
      ageGroup45: '45 to 54',
      ageGroup55: '55 to 64',
      ageGroup65: '65 and over',
      unspecified: 'Prefer not to say',
    },
  },
  {
    heading: 'Ethnicity',
    name: 'ethnicity',
    type: 'checkbox',
    options: {
      Asian: 'Asian',
      Latino_Hispanic: 'Latino / Hispanic',
      Pacific_Islander: 'Pacific Islander',
      Black_African: 'Black / African Descent',
      Middle_Eastern: 'Middle Eastern',
      White_Caucasian: 'White / Caucasian',
      East_Indian: 'East Indian',
      Native_American: 'Native American',
      Other: 'Other',
      unspecified: 'Prefer not to say',
    },
  },
  {
    heading: 'Educational Background',
    name: 'education',
    type: 'radio',
    options: {
      lessThanHighSchool: 'Less Than High School',
      highSchool: 'High School / GED',
      someCollege: 'Some College',
      twoYearDegree: 'Two-Year Degree',
      fourYearDegree: 'Four-Year Degree',
      mastersDegree: "Master's Degree",
      doctoralDegree: 'Doctoral Degree',
      professionalDegree: 'Professional Degree',
      unspecified: 'Prefer not to say',
    },
  },
  {
    heading: 'Feedback',
    name: 'feedback',
    type: 'textarea',
    rows: 2,
    placeholder: 'If you have any feedback, comments, or suggestions, please describe them here.',
  },
];

class DemoSurvey {
  constructor($container, data) {
    this.data = data;
    this.$survey = $(surveyHTML);
    $container.append(this.$survey);
    this.loadSurvey(data);
  }

  /**
   * Initialize the survey
   */
  loadSurvey() {
    const $form = this.$survey.find('.demo-survey-form');
    this.data.extraQuestions.forEach((question, i) => {
      const extraQuestionConfig = {
        heading: question,
        name: 'eq' + i,
        type: 'textarea',
        rows: 2,
        placeholder: '',
      };
      surveyConfig.splice(i + 1, 0, extraQuestionConfig);
    });

    surveyConfig.forEach(({ name, type, options, heading, rows, placeholder }) => {
      const $formField = $('<div></div>');
      $formField.append($(`<h4>${heading}</h4>`));
      if (options) {
        Object.entries(options).forEach(([value, label]) => {
          const $option = $('<label></label>');
          $option.append($(`<input type="${type}" name="${name}" value="${value}" required>`));
          $option.append($(`<span>${label}</span>`));
          $formField.append($option);
        });
      } else if (type === 'textarea') {
        $formField.append($(`<textarea name="${name}" rows=${rows} placeholder="${placeholder}"></textarea>`));
      }
      $form.append($formField);
    });

    const $submitButton = $('<button type="submit">Submit</button>');
    $form.append($submitButton);
    $submitButton.click((e) => {
      e.preventDefault();
      this.submit();
    });
    this.unspecifiedCheckboxes();
  }

  /**
   * TODO: generalize
   */
  unspecifiedCheckboxes() {
    this.$survey.find('input:checkbox[name=ethnicity]').change(() => {
      const unspecified = this.$survey
        .find('input[type=checkbox][name=ethnicity][value=unspecified]')
        .is(':checked');
      if (unspecified) {
        this.$survey
          .find('input:checkbox[name=ethnicity]')
          .not('[value=unspecified]')
          .prop('checked', false)
          .addClass('disabled');
      } else {
        this.$survey
          .find('input:checkbox[name=ethnicity]')
          .removeClass('disabled');
      }
    });
  }

  /**
   * Return the survey data
   */
  collectData() {
    const zoomUse = this.$survey
      .find('textarea[name=zoom]')
      .val();
    const gender = this.$survey
      .find('input[type=radio][name=gender]:checked')
      .val();
    const ageGroup = this.$survey
      .find('input[type=radio][name=ageGroup]:checked')
      .val();
    const ethnicity = [];
    this.$survey
      .find('input[type=checkbox][name=ethnicity]:checked')
      .each(function() {
        ethnicity.push($(this).val());
      });
    const education = this.$survey
      .find('input[type=radio][name=education]:checked')
      .val();
    const feedback = this.$survey
      .find('textarea[name=feedback]')
      .val();

    const extraAnswers = [];
    for (let i = 0; i < this.data.extraQuestions.length; i += 1) {
      const extraAnswer = this.$survey
        .find(`textarea[name=eq${i}]`)
        .val();
      extraAnswers.push(extraAnswer);
    }

    const data = {
      gender,
      ageGroup,
      ethnicity,
      education,
      feedback,
      zoomUse,
      extraAnswers
    };

    return data;
  }

  /**
   * Check if the survey has been completed. Falsey means yes.
   * @return { false | { errorMessage: string } }
   */
  validateTask() {
    const data = this.collectData();
    const {
      gender,
      ageGroup,
      ethnicity,
      education,
      zoomUse,
      extraAnswers,
    } = data;
    const isValid = (
      gender
      && ageGroup
      && ethnicity.length > 0
      && education
      && zoomUse
      && extraAnswers.filter(a => a.length === 0).length === 0
    );
    // falsey value indicates no error...
    if (!isValid) {
      return { errorMessage: 'Please complete the survey.' };
    }
    return false;
  }

  submit() {
    const invalid = this.validateTask();
    if (invalid) {
      alert(invalid.errorMessage);
    } else {
      const data = this.collectData();
      // send survey data to server
      $.post({
        url: "/api/survey" + window.location.search,
        data: JSON.stringify(data),
        contentType: "application/json"
      }).then(({ id }) => {
        // submit to MTurk
        const urlParams = new URLSearchParams(window.location.search);
        let submitDomain = urlParams.get('turkSubmitTo');
        const assignmentId = urlParams.get('assignmentId');
        if (submitDomain && assignmentId) {
          if (!submitDomain.endsWith('/')) { submitDomain += '/'; }
          const submitURL = `${submitDomain}mturk/externalSubmit`;
          formPOST(submitURL, { userId: id, assignmentId });
        } else {
          alert('Done! (You are not on AMT)');
        }
      });
    }
  }
}

export default function survey($container, data) {
  new DemoSurvey($container, data);
}
