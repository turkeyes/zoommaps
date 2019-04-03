import './form.scss';

import { _ } from '../legacy-imports';


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

  $form.jsonForm({
    ...schemaform,
    onSubmit: (errors, values) => {
      if (errors) return;
      onSubmit(values);
    }
  });
}
