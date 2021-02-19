import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import {timeout} from 'ember-concurrency';
import { setupOnerror } from '@ember/test-helpers';

module('Integration | Component | sequential-render | ComponentTest', async function(hooks) {
  setupRenderingTest(hooks);
  hooks.beforeEach(async function(assert) {
    this.setProperties({
      'triggerOutOfOrder': false,
      'renderImmediately': false,

      'afterTask1': () => assert.step('first'),
      'afterTask2': () => assert.step('second'),
      'afterTask3': () => assert.step('third'),
      getData: () => new Promise(resolve =>  {
         setTimeout(resolve(), 2000)
        }),
      getDataNoPromise: () => 'test',
      getDataNotFunction: 'test',
      getDataThrowsError: () => { throw new Error ('myError')},
      fetchDataTask: {
        perform() {
          return function*() {
            yield timeout(200);
            return "test";
          }
        }
      }
    });
  });
  hooks.afterEach(function() {
    setupOnerror();
  });

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<SequentialRender />`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs`
      <SequentialRender>
        template block text
      </SequentialRender>
    `);

    assert.equal(this.element.textContent.trim(), 'template block text');
  });

  test('Check order of execution when no async task is present', async function(assert) {
    await render(hbs `
      {{#sequential-render
        renderPriority=1
        taskName="first"
        asyncRender=false
        renderCallback=afterTask1
        as |firstComponent|
      }}
        {{#firstComponent.render-content}}
          <h1>First</h1>
        {{/firstComponent.render-content}}
        {{#firstComponent.loader-state}}
          <h1>Loading...</h1>
        {{/firstComponent.loader-state}}
      {{/sequential-render}}
      {{#sequential-render
        renderPriority=0
        taskName="second"
        asyncRender=false
        renderCallback=afterTask2
        as |secondComponent|
      }}
        {{#secondComponent.render-content}}
          <h1>Second</h1>
        {{/secondComponent.render-content}}
        {{#secondComponent.loader-state}}
          <h1>Loading...</h1>
        {{/secondComponent.loader-state}}
      {{/sequential-render}}
      `)
      assert.verifySteps(['second', 'first']);
  });
  test('Check order of execution when an async task is present', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.RenderContent>
          <h1>Render Second</h1>
        </seq.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @fetchDataTask={{this.fetchDataTask}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
  });

  test('Check order of execution when an getData parameter which is a promise is present', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.RenderContent>
          <h1>Render Second</h1>
        </seq.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
  });

  test('Check order of execution when an getData returns non-promise', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.RenderContent>
          <h1>Render Second</h1>
        </seq.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getDataNoPromise}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
  });

  test('Check error is throw when getData is not a function', async function(assert) {
    setupOnerror(function(err) {
      assert.equal(err.message, 'Error occured when executing fetchData: TypeError: Ember.get(...) is not a function');
    });
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="task1"
        @getData={{this.getDataNotFunction}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      `)
  });

  test('Check error caught when getData throws some error', async function(assert) {
    setupOnerror(function(err) {
      assert.equal(err.message, 'Error occured when executing fetchData: Error: myError');
    });
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="task1"
        @getData={{this.getDataThrowsError}}
        as |seq1|
      >
      <seq1.RenderContent>
        <h1>Render Second</h1>
      </seq1.RenderContent>
      </SequentialRender>
      `)
  });

  test('Check order of renders when renderImmediately is used', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @asyncRender={{false}}
        @renderCallback={{this.afterTask1}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render First</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task2"
        @fetchDataTask={{this.fetchDataTask}}
        @renderCallback={{this.afterTask2}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render Third</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task3"
        @renderImmediately={{renderImmediately}}
        @asyncRender={{false}}
        @renderCallback={{this.afterTask3}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render Second</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      `)
      this.set('renderImmediately', true);
      await settled();
      assert.verifySteps(['first', 'third', 'second', 'third']);
  });

  test('Check order of renders when triggerOutOfOrder is used', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @fetchDataTask={{this.fetchDataTask}}
        @renderCallback={{this.afterTask1}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render First</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task2"
        @fetchDataTask={{this.fetchDataTask}}
        @renderCallback={{this.afterTask2}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render Third</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task3"
        @triggerOutOfOrder={{triggerOutOfOrder}}
        @fetchDataTask={{this.fetchDataTask}}
        @renderCallback={{this.afterTask3}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.render-content>
          <h1>Render First</h1>
        </SequentialRenderItem.render-content>
        <SequentialRenderItem.loader-state>
          Loading...
        </SequentialRenderItem.loader-state>
      </SequentialRender>
      `)
      this.set('triggerOutOfOrder', true);
      await settled();
      assert.verifySteps(['first', 'third', 'second', 'third']);
  });
});
