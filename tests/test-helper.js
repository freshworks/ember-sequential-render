import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import setupCustomAssertions from 'ember-qunit-custom-assertions/test-support';

setApplication(Application.create(config.APP));

start();

setupCustomAssertions(config.modulePrefix);