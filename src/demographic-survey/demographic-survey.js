import surveyHTML from './demographic-survey.html';

import { $ } from '../legacy-imports';

import { formPOST } from '../utils';
import formFromJSON from '../form/form';

const genders = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  unspecified: 'Prefer not to say',
}

const ages = {
  ageGroup18: '18 to 24',
  ageGroup25: '25 to 34',
  ageGroup35: '35 to 44',
  ageGroup45: '45 to 54',
  ageGroup55: '55 to 64',
  ageGroup65: '65 and over',
  unspecified: 'Prefer not to say',
};

const ethnicities = {
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
};

const educations = {
  lessThanHighSchool: 'Less Than High School',
  highSchool: 'High School / GED',
  someCollege: 'Some College',
  twoYearDegree: 'Two-Year Degree',
  fourYearDegree: 'Four-Year Degree',
  mastersDegree: "Master's Degree",
  doctoralDegree: 'Doctoral Degree',
  professionalDegree: 'Professional Degree',
  unspecified: 'Prefer not to say',
};

/**
 * @see https://github.com/jsonform/jsonform
 */
const schemaform = {
  schema: {
    zoomUse: {
      type: "string",
      title: "How did you use zoom to explore the images? What image regions did you find you zoomed into?",
      required: true,
      minLength: 50
    },
    gender: {
      type: "string",
      title: "Gender",
      enum: Object.keys(genders),
      required: true
    },
    ageGroup: {
      type: "string",
      title: "Age",
      enum: Object.keys(ages),
      required: true
    },
    ethnicity: {
      type: "array",
      title: "Ethnicity",
      items: {
        type: "string",
        title: "Ethnicity Option",
        enum: Object.keys(ethnicities), 
      },
      minItems: 1
    },
    education: {
      type: "string",
      title: "Educational Background",
      enum: Object.keys(educations),
      required: true
    },
    feedback: {
      type: "string",
      title: "If you have any feedback, comments, or suggestions, please describe them here."
    }
  },
  form: [
    {
      key: "zoomUse",
      type: "textarea"
    },
    {
      key: "gender",
      type: "radios",
      titleMap: genders
    },
    {
      key: "ageGroup",
      type: "radios",
      titleMap: ages
    },
    {
      key: "ethnicity",
      type: "checkboxes",
      titleMap: ethnicities
    },
    {
      key: "education",
      type: "radios",
      titleMap: educations
    },
    {
      key: "feedback",
      type: "textarea"
    }
  ]
};

export default function survey($container, data) {
  const $survey = $(surveyHTML);
  $container.append($survey);
  const $form = $survey.find('.demo-survey-form');
  Object.assign(schemaform.schema, data.extraQuestionsEnd.schema);
  const extraQuestionsForm = data.extraQuestionsEnd.form
    || Object.keys(data.extraQuestionsEnd.schema).map(key => ({ key }));
  schemaform.form.splice(1, 0, ...extraQuestionsForm);
  formFromJSON($form, schemaform, (values) => {
    $.post({
      url: "/api/survey" + window.location.search,
      data: JSON.stringify(values),
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
  });
}
