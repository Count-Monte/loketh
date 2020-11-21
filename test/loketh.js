const faker = require('faker');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const Loketh = artifacts.require('Loketh');

contract('Loketh', accounts => {
  let loketh;
  let firstAccount, secondAccount, otherAccount;

  before(() => {
    [firstAccount, secondAccount, otherAccount] = accounts;
  });

  beforeEach(async () => {
    loketh = await Loketh.new({ from: firstAccount });
  });

  describe('createEvent', () => {
    let futureStartTime;

    beforeEach(() => {
      futureStartTime = dateToUnixEpochTimeInSeconds(faker.date.future());
    });

    it('reverts when `_quota` less than one', async () => {
      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          futureStartTime,
          futureStartTime + faker.random.number(),
          0,
          0,
          { from: firstAccount }
        ),
        'Loketh: `_quota` must be at least one'
      );
    });

    it('reverts when `_startTime` less than `block.timestamp`', async () => {
      const startTime = dateToUnixEpochTimeInSeconds(faker.date.past());

      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          0,
          faker.random.number(),
          { from: firstAccount }
        ),
        'Loketh: `_startTime` must be greater than `block.timestamp`'
      );
    });

    it('reverts when `_endTime` less than `_startTime`', async () => {
      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          futureStartTime,
          futureStartTime - faker.random.number(),
          0,
          faker.random.number(),
          { from: firstAccount }
        ),
        'Loketh: `_endTime` must be greater than `_startTime`'
      );
    });

    it('creates a new event and emits the `EventCreated` event', async () => {
      const receipt = await loketh.createEvent(
        faker.lorem.words(),
        futureStartTime,
        futureStartTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        { from: firstAccount }
      );

      expectEvent(receipt, 'EventCreated', {
        newEventId: new BN(1),
        organizer: firstAccount
      });
    });
  });

  describe('eventsOfOwner', () => {
    it('returns a list of event IDs owned by given address', async () => {
      // Add one, only to make sure zero never assigned.
      const numberOfEvents = faker.random.number(4) + 1;
      const eventIds = [];

      for (let i = 0; i < numberOfEvents; i++) {
        const assignToSecondAccount = faker.random.boolean();
        const from = assignToSecondAccount ? secondAccount : firstAccount;
        const startTime = dateToUnixEpochTimeInSeconds(faker.date.future());

        await loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          faker.random.number(),
          faker.random.number(),
          { from }
        );

        if (assignToSecondAccount) {
          eventIds.push(await loketh.totalEvents());
        }
      }

      const secondAccountEventIds = await loketh.eventsOfOwner(secondAccount);

      assert.deepEqual(secondAccountEventIds, eventIds);
    });
  });

  describe('getEvent', () => {
    it('reverts when given event ID is less than one', async () => {
      await expectRevert(
        loketh.getEvent(0, { from: firstAccount }),
        'Loketh: event ID must be at least 1'
      );
    });

    it('reverts when given event ID is greater than events length', async () => {
      // Add one, only to make sure zero never assigned.
      const numberOfEvents = faker.random.number(4) + 1;

      for (let i = 0; i < numberOfEvents; i++) {
        const startTime = dateToUnixEpochTimeInSeconds(faker.date.future());

        await loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          faker.random.number(),
          faker.random.number(),
          { from: otherAccount }
        );
      }

      await expectRevert(
        loketh.getEvent(numberOfEvents + 1, { from: firstAccount }),
        'Loketh: event ID must be lower than `_events` length'
      );
    });

    it('returns event information by given id', async () => {
      const startTime = dateToUnixEpochTimeInSeconds(faker.date.future());

      // First event...
      const firstEventName = faker.lorem.words();
      await loketh.createEvent(
        firstEventName,
        startTime,
        startTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        { from: otherAccount }
      );

      // Second event...
      const secondEventName = faker.lorem.words();
      const endTime = startTime + faker.random.number();
      const price = faker.random.number();
      const quota = faker.random.number();
      await loketh.createEvent(
        secondEventName,
        startTime,
        endTime,
        price,
        quota,
        { from: otherAccount }
      );

      const secondEvent = await loketh.getEvent(2, { from: firstAccount });

      assert.notEqual(secondEvent['0'], firstEventName);
      assert.equal(secondEvent['0'], secondEventName);
      assert.equal(secondEvent['1'], otherAccount);
      assert.equal(secondEvent['2'], startTime);
      assert.equal(secondEvent['3'], endTime);
      assert.equal(secondEvent['4'], price);
      assert.equal(secondEvent['5'], quota);
      assert.equal(secondEvent['6'], 0);
    });
  });

  describe('eventsOf', () => {
    it('returns total number of events owned by given address', async () => {
      // Add one, only to make sure zero never assigned.
      const numberOfEvents = faker.random.number(4) + 1;

      for (let i = 0; i < numberOfEvents; i++) {
        const startTime = dateToUnixEpochTimeInSeconds(faker.date.future());

        await loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          faker.random.number(),
          faker.random.number(),
          { from: secondAccount }
        );
      }

      assert.equal(await loketh.eventsOf(firstAccount), 0);
      assert.equal(await loketh.eventsOf(secondAccount), numberOfEvents);
    });
  });

  describe('totalEvents', () => {
    it('starts at zero', async () => {
      const totalEvents = await loketh.totalEvents({ from: firstAccount });

      assert.equal(totalEvents, 0);
    });

    it('increments when a new event created', async () => {
      const startTime = dateToUnixEpochTimeInSeconds(faker.date.future());

      assert.equal(await loketh.totalEvents({ from: firstAccount }), 0);

      await loketh.createEvent(
        faker.lorem.words(),
        startTime,
        startTime + faker.random.number(),
        faker.random.number(),
        faker.random.number()
      );

      assert.equal(await loketh.totalEvents({ from: firstAccount }), 1);
    });
  });
});

/// Test Utils ///

function dateToUnixEpochTimeInSeconds(date) {
  return parseInt(date.getTime() / 1000);
}
