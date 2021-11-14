import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
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
      getDataThrowsError: () => { throw new Error ('myError')}
    });
  });
  hooks.afterEach(function() {
    setupOnerror();
  });

  test('Check order of execution when no async task is present', async function(assert) {
    await render(hbs `
      {{#sequential-render
        renderPriority=1
        taskName="first"
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
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.render-content>
          <h1>Render Second</h1>
        </seq.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
  });

  test('Check order of execution when an getData parameter which is a promise is present', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.render-content>
          <h1>Render Second</h1>
        </seq.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
  });

  test('Check order of execution when an getData returns non-promise', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.render-content>
          <h1>Render Second</h1>
        </seq.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getDataNoPromise}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      `)
      assert.verifySteps(['first', 'third', 'second']);
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
      <seq1.render-content>
        <h1>Render Second</h1>
      </seq1.render-content>
      </SequentialRender>
      `)
  });

  test('Check order of renders when renderImmediately is used', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
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
        @getData={{this.getData}}
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
      await settled();
      this.set('renderImmediately', true);
      await settled();
      assert.verifySteps(['first', 'third', 'second', 'third']);
  });

  test('Check order of renders when triggerOutOfOrder is used', async function(assert) {
    await render(hbs `
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
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
        @getData={{this.getData}}
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
        @getData={{this.getData}}
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
      await settled();
      this.set('triggerOutOfOrder', true);
      await settled();
      assert.verifySteps(['first', 'third', 'second', 'third']);
  });
});
