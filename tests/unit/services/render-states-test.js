import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import { setProperties } from '@ember/object';

module('Unit | Service | render-states', function (hooks) {
  setupTest(hooks);

  hooks.afterEach(function () {
    let service = this.owner.lookup('service:render-states');
    service.resetRenderState();
  });

  test('it exists', function (assert) {
    let service = this.owner.lookup('service:render-states');
    assert.ok(service);
  });

  test('updateMaxRenderPriority: Test that the greater priority gets updated', function (assert) {
    let service = this.owner.lookup('service:render-states');
    service.maxRenderPriority = 1;
    service.updateMaxRenderPriority(2);
    assert.equal(
      service.maxRenderPriority,
      2,
      'Test that the new max priority is updated for the first time'
    );
    service.updateMaxRenderPriority(1);
    assert.equal(
      service.maxRenderPriority,
      2,
      'Test that max priority remains the same for low priority input'
    );
    service.updateMaxRenderPriority(3);
    assert.equal(
      service.maxRenderPriority,
      3,
      'Test that the new max priority is updated'
    );
  });

  test('resetRenderState: Test that resetRenderState calls _resetProperties', function (assert) {
    let service = this.owner.lookup('service:render-states');
    const resetPropertiesSpy = sinon.spy(service, '_resetProperties');
    setProperties(service, {
      maxRenderPriority: 5,
      scheduledCalls: {
        task1: function testFn1() {},
        task2: function testFn2() {},
      },
    });
    service.resetRenderState();
    sinon.assert.callCount(resetPropertiesSpy, 1);
    resetPropertiesSpy.restore();
    assert.ok(true);
  });

  test('resetRenderState: Test that all the states / queues are reset', function (assert) {
    let service = this.owner.lookup('service:render-states');

    setProperties(service, {
      maxRenderPriority: 5,
      renderState: 2,
      availablePriorities: [0, 2, 5],
      renderQueue: { 0: [], 2: ['uniqueP2Task1'], 5: ['uniqueP5Task1'] },
      scheduledCalls: {
        task1: function testFn1() {},
        task2: function testFn2() {},
      },
    });

    service.resetRenderState();
    assert.empty(service.renderQueue, 'Test that render queue is empty');
    assert.equal(
      service.maxRenderPriority,
      1,
      'Test that maxRenderPriority is reset'
    );
    assert.empty(
      service.availablePriorities,
      'Test that availablePriorities is empty'
    );
    assert.equal(service.renderState, 0, 'Test that renderState is reset');
    assert.empty(
      service.scheduledCalls,
      'Test that scheduledCalls array is reset'
    );
  });

  test('isAssignableTask: Check the assignability of tasks', function (assert) {
    let service = this.owner.lookup('service:render-states');
    assert.true(
      service.isAssignableTask(2, 'uniqueP2Task1'),
      'Test that a unique task is assignable for the first time'
    );
    service.addToQueue(2, 'uniqueP2Task1');
    assert.false(
      service.isAssignableTask(2, 'uniqueP2Task1'),
      'Test that a repeat task is not assignable'
    );
    assert.false(
      service.isAssignableTask(2),
      'Test that without taskName, its not assignable'
    );
  });

  test('addToQueue: Test adding tasks to queues', function (assert) {
    let service = this.owner.lookup('service:render-states');
    service.addToQueue(0, 'uniqueP0Task1');
    assert.includes(
      service.renderQueue[0],
      'uniqueP0Task1',
      'Test P0 task addition'
    );
    service.addToQueue(2, 'uniqueP2Task1');
    assert.includes(
      service.renderQueue[2],
      'uniqueP2Task1',
      'Check P2 task addition'
    );
    service.addToQueue(2, 'uniqueP2Task1');
    assert.length(service.renderQueue[2], 1, 'Test duplicate task addition');
    service.addToQueue(2, 'uniqueP2Task2');
    assert.deepIncludes(
      service.renderQueue[2],
      ['uniqueP2Task1', 'uniqueP2Task2'],
      'Test second P2 task addition'
    );
  });

  test('removeFromQueue: Test removing tasks from queues', function (assert) {
    let service = this.owner.lookup('service:render-states');
    service.addToQueue(0, 'uniqueP0Task1');
    service.addToQueue(0, 'uniqueP0Task2');
    assert.notOk(
      service.removeFromQueue(0, 'uniqueP0Task2'),
      'Test returns false when queue is not empty'
    );
    assert.notIncludes(
      service.renderQueue[0],
      'uniqueP0Task2',
      'Test P0 task removal'
    );
    assert.ok(
      service.removeFromQueue(0, 'uniqueP0Task1'),
      'Test returns true when queue is empty'
    );
    assert.empty(service.renderQueue[0], 'Test all tasks are removed');
  });

  test('addScheduledCall: Test adding function calls to scheduleCalls', function (assert) {
    let service = this.owner.lookup('service:render-states');
    service.addScheduledCall('task1', function testFn1() {});
    assert.includes(
      Object.keys(service.scheduledCalls)[0],
      'task1',
      'Test task1 added to scheduledCall'
    );
    service.addScheduledCall('task2', function testFn2() {});
    assert.includes(
      Object.keys(service.scheduledCalls)[1],
      'task2',
      'Test task2 added to scheduledCall'
    );
    service.addScheduledCall('task3', function testFn3() {});
    assert.includes(
      Object.keys(service.scheduledCalls)[2],
      'task3',
      'Test task3 added to scheduledCall'
    );
  });

  test('removeScheduledCall: Test removing function calls to scheduleCalls', function (assert) {
    let service = this.owner.lookup('service:render-states');
    service.resetRenderState();
    service.addScheduledCall('task1', function testFn1() {});
    service.addScheduledCall('task2', function testFn2() {});
    service.removeScheduledCall('task1');
    assert.notOk(Object.keys(service.scheduledCalls)[0].includes('task1'));
  });

  module(
    'Test render state changes when items are removed from the queue',
    function () {
      test('removeFromQueueAndModifyRender: Test removing tasks from queues and render state change', function (assert) {
        let service = this.owner.lookup('service:render-states');
        service.availablePriorities = [0, 1];
        service.addToQueue(0, 'uniqueP0Task1');
        service.addToQueue(0, 'uniqueP0Task2');
        service.addToQueue(1, 'uniqueP1Task1');

        service.removeFromQueueAndModifyRender(0, 'uniqueP0Task2');
        assert.notIncludes(
          service.renderQueue[0],
          'uniqueP0Task2',
          'Test P0 task removal'
        );

        service.removeFromQueueAndModifyRender(0, 'uniqueP0Task1');
        assert.empty(service.renderQueue[0], 'Test all tasks are removed');

        assert.equal(
          service.renderState,
          1,
          'Test that renderState is Modified'
        );
      });

      test('removeFromQueueAndModifyRender: Test priority skip feature', function (assert) {
        let service = this.owner.lookup('service:render-states');
        service.availablePriorities = [0, 2];
        service.addToQueue(0, 'uniqueP0Task1');
        service.addToQueue(2, 'uniqueP2Task2');

        service.removeFromQueueAndModifyRender(0, 'uniqueP0Task1');

        assert.equal(
          service.renderState,
          2,
          'Test that renderState is modified'
        );
      });
    }
  );

  module('Test post render calback flows', function () {
    test('removeFromQueueAndModifyRender + postrenderCallback: Test the removal + rendercallback flow', function (assert) {
      let service = this.owner.lookup('service:render-states');
      service.availablePriorities = [0, 2];
      let callbackSpy = sinon.spy();
      service.renderLater = false;
      service.registerPostRenderCallback(callbackSpy);
      service.addToQueue(0, 'uniqueP0Task1');
      service.addToQueue(2, 'uniqueP2Task2');

      service.removeFromQueueAndModifyRender(0, 'uniqueP0Task1');
      assert.equal(service.renderState, 2, 'Test that renderState is modified');

      service.removeFromQueueAndModifyRender(2, 'uniqueP2Task2');
      assert.ok(
        callbackSpy.calledOnce,
        'Check that the registered callback is called'
      );
    });

    test('registerPostRenderCallback - Test that the callback is added', function (assert) {
      let service = this.owner.lookup('service:render-states');
      let callbackSpy = sinon.spy();
      service.renderLater = false;
      service.registerPostRenderCallback(callbackSpy);
      assert.equal(
        service.postRenderCallback,
        callbackSpy,
        'Test callback registration'
      );
      assert.notOk(
        callbackSpy.calledOnce,
        'Test callback is not immediately invoked if falback timeout is not given'
      );
    });

    test('registerPostRenderCallback - Test that the callback is added with fallback', function (assert) {
      assert.expect(3);
      let service = this.owner.lookup('service:render-states');
      let timeout = 100;
      let callbackSpy = sinon.spy();
      service.renderLater = false;
      service.registerPostRenderCallback(callbackSpy, timeout);
      assert.equal(
        service.postRenderCallback,
        callbackSpy,
        'Test callback registration'
      );

      let done = assert.async();
      setTimeout(function () {
        assert.ok(
          callbackSpy.calledOnce,
          'Check that the registered callback is called after the given timeout'
        );
        assert.true(service.renderLater, 'Check that renderLater flag is set');
        done();
      }, timeout);
    });

    test('performOncePostRender - Test that the callback is not called if renderLater is true', function (assert) {
      let service = this.owner.lookup('service:render-states');
      let callbackSpy = sinon.spy();
      service.renderLater = true;
      service.registerPostRenderCallback(callbackSpy);

      assert.equal(
        service.postRenderCallback,
        callbackSpy,
        'Test callback registration'
      );

      service.performOncePostRender();

      assert.notOk(
        callbackSpy.calledOnce,
        'Check that the registered callback is not called'
      );
    });

    test('performOncePostRender - Test that the callback is not called if postRenderCallback is empty', function (assert) {
      let service = this.owner.lookup('service:render-states');
      let callbackSpy = sinon.spy();
      service.renderLater = false;

      service.performOncePostRender();

      assert.notOk(
        callbackSpy.calledOnce,
        'Check that the registered callback is not called'
      );
    });
  });
});
