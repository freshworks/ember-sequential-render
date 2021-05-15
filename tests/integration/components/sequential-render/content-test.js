import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | sequential-render/content', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await render(hbs`<SequentialRender::Content />`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs`
      <SequentialRender::Content @isFullFilled=true>
        <div data-test-id="yielded-content"> template block text </div>
      </SequentialRender::Content>
    `);

    assert.dom('[data-test-id="yielded-content"]').exists('template block text exists');
  });

  test('it does not render if unfullfilled', async function(assert) {
    await render(hbs`
      <SequentialRender::Content>
        <div data-test-id="yielded-content"> template block text </div>
      </SequentialRender::Content>
    `);
    assert.dom('[data-test-id="yielded-content"]').doesNotExist('template block text empty');
  });

  module('Test loaderClass behaviour', function() {
    let loaderClass = 'loading-content';

    test('Check loaderClass behaviour when fullfilled + fadedState', async function(assert) {
      await render(hbs`
        <SequentialRender::Content @loaderClass='loading-content' @isFullFilled=true @showFadedState=true>
          <div data-test-id="yielded-content"> template block text </div>
        </SequentialRender::Content>
      `);
      assert.dom(`.${loaderClass}`).exists('LoaderClass in dom');
      assert.dom('[data-test-id="yielded-content"]').exists('Check yielded content');
    });

    test('Check loaderClass behaviour without fadedState', async function(assert) {
      await render(hbs`
        <SequentialRender::Content @loaderClass='loading-content' @isFullFilled=true>
          <div data-test-id="yielded-content"> template block text </div>
        </SequentialRender::Content>
      `);

      assert.dom(`.${loaderClass}`).doesNotExist('LoaderClass in dom');
      assert.dom('[data-test-id="yielded-content"]').exists('Check yielded content');
    });

    test('Check loaderClass behaviour whithout isFullFilled', async function(assert) {
      await render(hbs`
        <SequentialRender::Content @loaderClass='loading-content'>
          <div data-test-id="yielded-content"> template block text </div>
        </SequentialRender::Content>
      `);

      assert.dom(`.${loaderClass}`).doesNotExist('LoaderClass in dom');
      assert.dom('[data-test-id="yielded-content"]').doesNotExist('Check yielded content empty');
    });
  });
});
