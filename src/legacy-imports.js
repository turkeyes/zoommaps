import jQuery from 'jquery';
import underscore from 'underscore';
import jsonform from './jsonform/jsonform';
jsonform(window, jQuery, underscore);

export const $ = jQuery;
export const _ = underscore;