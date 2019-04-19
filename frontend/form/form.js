import './form.scss';

import { $, _ } from '../legacy-imports';


export default function formFromJSON(
  $form,
  schemaform,
  onSubmit,
  noTrivial=true
) {
  if (_.isEmpty(schemaform.schema)) {
    if (noTrivial) return onSubmit({})
    schemaform.schema = {};
  }

  if (_.isEmpty(schemaform.form)) {
    schemaform.form = Object.keys(schemaform.schema)
      .map(({key}) => ({ key }));
  }

  schemaform.form.push(({
    type: 'submit',
    title: 'Submit'
  }));

  const formObject = {
    ...schemaform,
    onSubmit: (errors, values) => {
      if (errors) return;
      onSubmit(values);
    },
    displayErrors: (errors, formElt) => {
      // override default error messages to something more human-friendly
      errors.forEach((error) => {
        switch (error.message) {
          case 'The number of items is less then the required minimum':
            error.message = 'Please select at least one option';
            break;
          case 'String is less then the required minimum length':
            error.message = 'Please write a bit more';
        }
      });
      $(formElt).jsonFormErrors(errors, formObject);
    }
  };
  $form.jsonForm(formObject);
}
