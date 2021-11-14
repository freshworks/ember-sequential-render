import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | sequential-render/loader-state', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await render(hbs`<SequentialRender::LoaderState />`);

    assert.dom(this.element).hasText('');

    await render(hbs`
      <SequentialRender::LoaderState>
        <div data-test-id="loader-content"> Loading.. </div>
      </SequentialRender::LoaderState>
    `);
    assert.dom('[data-test-id="loader-content"]').exists('Loading content exists');
  });

  test('it does not render', async function(assert) {
    await render(hbs`
      <SequentialRender::LoaderState @isFullFilled=true>
        <div data-test-id="loader-content"> Loading.. </div>
      </SequentialRender::LoaderState>
    `);
    assert.dom('[data-test-id="loader-content"]').doesNotExist('Loading content empty');
  });
});
