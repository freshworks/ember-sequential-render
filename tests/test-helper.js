import Application from 'dummy/app';
import config from 'dummy/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import setupCustomAssertions from 'ember-qunit-custom-assertions/test-support';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

start();

setupCustomAssertions(config.modulePrefix);