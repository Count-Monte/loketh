const faker = require('faker');
const {
  balance,
  BN,
  expectEvent,
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');

const Loketh = artifacts.require('Loketh');
const TestToken = artifacts.require('TestToken');

const NATIVE_CURRENCY = 'ETH';

contract('Loketh', accounts => {
  let loketh;
  let latestTime;
  let testToken;
  let testTokenName;

  const [firstAccount, secondAccount, otherAccount] = accounts;

  beforeEach(async () => {
    loketh = await Loketh.new({ from: firstAccount });
    latestTime = (await time.latest()).toNumber();
    testToken = await TestToken.new(1000000, 0, { from: firstAccount });
    testTokenName = await testToken.symbol({ from: firstAccount })
  });

  describe('nativeCurrency', () => {
    it(`returns "${NATIVE_CURRENCY}" as native currency in Loketh`, async () => {
      const currency = await loketh.nativeCurrency();

      assert.equal(currency, NATIVE_CURRENCY);
    });
  });

  describe('supportedTokenNames', () => {
    it('returns the token name by correct index', async () => {
      await loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount });

      const token = await loketh.supportedTokenNames(0);

      assert.equal(token, testTokenName);
    });
  });

  describe('supportedTokens', () => {
    it('returns a zero address if token has not registered', async () => {
      const token = await loketh.supportedTokens(testTokenName);

      assert.equal(token, '0x0000000000000000000000000000000000000000');
    });

    it('returns the token address by given token name', async () => {
      await loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount });

      const token = await loketh.supportedTokens(testTokenName);

      assert.equal(token, testToken.address);
    });
  });

  describe('addNewToken', () => {
    it('reverts when the actor is not the admin', async () => {
      await expectRevert(
        loketh.addNewToken(testTokenName, testToken.address, { from: otherAccount }),
        'Ownable: caller is not the owner'
      );
    });

    it('reverts when the token name is the native currency name', async () => {
      await expectRevert(
        loketh.addNewToken(
          NATIVE_CURRENCY,
          testToken.address,
          { from: firstAccount }
        ),
        'Loketh: Can not register native currency name.'
      );
    });

    it('reverts when given address is invalid', async () => {
      await expectRevert(
        loketh.addNewToken(
          testTokenName,
          '0x0000000000000000000000000000000000000000',
          { from: firstAccount }
        ),
        'Loketh: Given address is not a valid address.'
      );
    });

    it('reverts when token is already registered', async () => {
      await loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount });

      await expectRevert(
        loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount }),
        'Loketh: Token is already registered.'
      );
    });

    it('adds a new supported token and emits `TokenAdded` event', async () => {
      let token = await loketh.supportedTokens(testTokenName);

      assert.equal(token, '0x0000000000000000000000000000000000000000');

      const receipt = await loketh.addNewToken(
        testTokenName, testToken.address, { from: firstAccount }
      );

      await expectEvent(receipt, 'TokenAdded', {
        tokenName: web3.utils.sha3(testTokenName),
        tokenAddress: testToken.address,
        addedBy: firstAccount
      });

      token = await loketh.supportedTokens(testTokenName);

      assert.equal(token, testToken.address);
    });

    it('increments supported tokens', async () => {
      let totalSupportedTokens = await loketh.totalSupportedTokens();
      assert.equal(totalSupportedTokens, 0);

      await loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount });

      totalSupportedTokens = await loketh.totalSupportedTokens();
      assert.equal(totalSupportedTokens, 1);
    });
  });

  describe('buyTicket', () => {
    let price, quota, endTime, eventNativeId, eventTokenId;

    beforeEach(async () => {
      await loketh.addNewToken(testTokenName, testToken.address, { from: firstAccount });

      price = faker.random.number();
      quota = faker.random.number();

      const startTime = latestTime + faker.random.number();
      endTime = startTime + faker.random.number();

      let receipt = await loketh.createEvent(
        faker.lorem.words(),
        startTime,
        endTime,
        price,
        quota,
        NATIVE_CURRENCY,
        { from: firstAccount }
      );

      eventNativeId = receipt.logs[0].args.newEventId;

      receipt = await loketh.createEvent(
        faker.lorem.words(),
        startTime,
        endTime,
        price,
        quota,
        testTokenName,
        { from: firstAccount }
      );

      eventTokenId = receipt.logs[0].args.newEventId;
    });

    it('reverts when given event ID is less than one', async () => {
      await expectRevert(
        loketh.buyTicket(0, { from: secondAccount }),
        'Loketh: event ID must be at least one.'
      );
    });

    it('reverts when given event ID is greater than events length', async () => {
      await expectRevert(
        loketh.buyTicket(eventNativeId + 1, { from: secondAccount }),
        'Loketh: event ID must be lower than `_events` length.'
      );
    });

    it('reverts when the organizer buy their own event', async () => {
      await expectRevert(
        loketh.buyTicket(eventNativeId, { from: firstAccount }),
        'Loketh: Organizer can not buy their own event.'
      );
    });

    it('reverts when participant buys a ticket from an event that already ended', async () => {
      await time.increaseTo(endTime + faker.random.number());

      await expectRevert(
        loketh.buyTicket(eventNativeId, { from: secondAccount }),
        'Loketh: Can not buy ticket from an event that already ended.'
      );
    });

    describe('pay with token', () => {
      it('reverts when allowance is insufficient', async () => {
        await expectRevert(
          loketh.buyTicket(eventTokenId, { from: secondAccount }),
          'Loketh: Allowance is insufficient.'
        );
      });

      it('reverts when user\'s balance is insufficient', async () => {
        await testToken.approve(loketh.address, price, { from: secondAccount });

        await expectRevert(
          loketh.buyTicket(eventTokenId, { from: secondAccount }),
          'Loketh: Balance is insufficient.'
        );
      });

      it('adds the money from participants to its money jar', async () => {
        let event = await loketh.getEvent(eventTokenId);

        const prevMoneyCollected = event['7'];

        assert.equal(prevMoneyCollected, 0);

        await testToken.transfer(secondAccount, price, { from: firstAccount });
        await testToken.approve(loketh.address, price, { from: secondAccount });

        await loketh.buyTicket(eventTokenId, { from: secondAccount });

        event = await loketh.getEvent(eventTokenId);

        assert.equal(event['7'], price);
        assert.notEqual(event['7'], prevMoneyCollected);
      });

      it('adds the money from participants to contract\'s balance', async () => {
        const prevBalance = await testToken.balanceOf(loketh.address);

        assert.isTrue(prevBalance.eq(new BN(0)));

        await testToken.transfer(secondAccount, price, { from: firstAccount });
        await testToken.approve(loketh.address, price, { from: secondAccount });

        await loketh.buyTicket(eventTokenId, { from: secondAccount });

        const newBalance = await testToken.balanceOf(loketh.address);

        assert.isNotTrue(newBalance.eq(new BN(0)));
        assert.isTrue(newBalance.gt(prevBalance));
        assert.isTrue(newBalance.eq(new BN(price)));
      });

      it('increments the sold counter when participant buy a ticket', async () => {
        let event = await loketh.getEvent(eventTokenId);

        const prevSoldCounter = event['6'];

        assert.equal(prevSoldCounter, 0);

        await testToken.transfer(secondAccount, price, { from: firstAccount });
        await testToken.approve(loketh.address, price, { from: secondAccount });

        await loketh.buyTicket(eventTokenId, { from: secondAccount });

        event = await loketh.getEvent(eventTokenId);

        assert.equal(event['6'], 1);
        assert.notEqual(event['6'], prevSoldCounter);
      });

      it('adds issued ticket to the list of tickets owned by participant', async () => {
        let ticketsOwned = await loketh.ticketsOf(secondAccount);

        assert.equal(ticketsOwned, 0);

        await testToken.transfer(secondAccount, price, { from: firstAccount });
        await testToken.approve(loketh.address, price, { from: secondAccount });

        await loketh.buyTicket(eventTokenId, { from: secondAccount });

        ticketsOwned = await loketh.ticketsOf(secondAccount);

        assert.equal(ticketsOwned, 1);
        assert.notEqual(ticketsOwned, 0);
      });

      it('successfully issued a ticket for the participant', async () => {
        await testToken.transfer(secondAccount, price, { from: firstAccount });
        await testToken.approve(loketh.address, price, { from: secondAccount });

        const receipt = await loketh.buyTicket(
          eventTokenId, { from: secondAccount }
        );

        await expectEvent(receipt, 'TicketIssued', {
          eventId: new BN(eventTokenId),
          participant: secondAccount
        });
      });
    });

    describe('pay with native currency', () => {
      it('reverts when participant pay with different amount of money', async () => {
        await expectRevert(
          loketh.buyTicket(eventNativeId, { from: secondAccount, value: price + 1 }),
          'Loketh: Must pay exactly same with the price.'
        );

        await expectRevert(
          loketh.buyTicket(eventNativeId, { from: secondAccount, value: price - 1 }),
          'Loketh: Must pay exactly same with the price.'
        );
      });

      it('adds the money from participants to its money jar', async () => {
        let event = await loketh.getEvent(eventNativeId);

        const prevMoneyCollected = event['7'];

        assert.equal(prevMoneyCollected, 0);

        await loketh.buyTicket(
          eventNativeId, { from: secondAccount, value: price }
        );

        event = await loketh.getEvent(eventNativeId);

        assert.equal(event['7'], price);
        assert.notEqual(event['7'], prevMoneyCollected);
      });

      it('adds the money from participants to contract\'s balance', async () => {
        const prevBalance = await balance.current(loketh.address);

        assert.isTrue(prevBalance.eq(new BN(0)));

        await loketh.buyTicket(
          eventNativeId, { from: secondAccount, value: price }
        );

        const newBalance = await balance.current(loketh.address);

        assert.isNotTrue(newBalance.eq(new BN(0)));
        assert.isTrue(newBalance.gt(prevBalance));
        assert.isTrue(newBalance.eq(new BN(price)));
      });

      it('increments the sold counter when participant buy a ticket', async () => {
        let event = await loketh.getEvent(eventNativeId);

        const prevSoldCounter = event['6'];

        assert.equal(prevSoldCounter, 0);

        await loketh.buyTicket(
          eventNativeId, { from: secondAccount, value: price }
        );

        event = await loketh.getEvent(eventNativeId);

        assert.equal(event['6'], 1);
        assert.notEqual(event['6'], prevSoldCounter);
      });

      it('adds issued ticket to the list of tickets owned by participant', async () => {
        let ticketsOwned = await loketh.ticketsOf(secondAccount);

        assert.equal(ticketsOwned, 0);

        await loketh.buyTicket(
          eventNativeId, { from: secondAccount, value: price }
        );

        ticketsOwned = await loketh.ticketsOf(secondAccount);

        assert.equal(ticketsOwned, 1);
        assert.notEqual(ticketsOwned, 0);
      });

      it('successfully issued a ticket for the participant', async () => {
        const receipt = await loketh.buyTicket(
          eventNativeId, { from: secondAccount, value: price }
        );

        await expectEvent(receipt, 'TicketIssued', {
          eventId: new BN(eventNativeId),
          participant: secondAccount
        });
      });
    });

    it('reverts when no quota left', async () => {
      const startTime = latestTime + faker.random.number();

      // Create a new event with only one quota...
      // Event ID: 2
      const receipt = await loketh.createEvent(
        faker.lorem.words(),
        startTime,
        startTime + faker.random.number(),
        price,
        1,
        NATIVE_CURRENCY,
        { from: firstAccount }
      );

      const eventId = receipt.logs[0].args.newEventId;

      // The only one quota booked by `secondAccount`...
      await loketh.buyTicket(eventId, { from: secondAccount, value: price });

      // `otherAccount` will try to buy but it fails...
      await expectRevert(
        loketh.buyTicket(eventId, { from: otherAccount, value: price }),
        'Loketh: No quota left.'
      );
    });

    it('reverts when participant already bought the ticket', async () => {
      await loketh.buyTicket(eventNativeId, { from: secondAccount, value: price });

      await expectRevert(
        loketh.buyTicket(eventNativeId, { from: secondAccount, value: price }),
        'Loketh: Participant already bought the ticket.'
      );
    });
  });

  describe('createEvent', () => {
    let futureStartTime;

    beforeEach(() => {
      futureStartTime = latestTime + faker.random.number();
    });

    it('reverts when `_quota` less than one', async () => {
      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          futureStartTime,
          futureStartTime + faker.random.number(),
          0,
          0,
          NATIVE_CURRENCY,
          { from: firstAccount }
        ),
        'Loketh: `_quota` must be at least one.'
      );
    });

    it('reverts when `_startTime` less than `block.timestamp`', async () => {
      const startTime = latestTime - faker.random.number();

      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          0,
          faker.random.number(),
          NATIVE_CURRENCY,
          { from: firstAccount }
        ),
        'Loketh: `_startTime` must be greater than `block.timestamp`.'
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
          NATIVE_CURRENCY,
          { from: firstAccount }
        ),
        'Loketh: `_endTime` must be greater than `_startTime`.'
      );
    });

    it('reverts when `_currency` is invalid', async () => {
      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          futureStartTime,
          futureStartTime + faker.random.number(),
          0,
          faker.random.number(),
          faker.random.word(),
          { from: firstAccount }
        ),
        'Loketh: `_currency` is invalid.'
      );

      await expectRevert(
        loketh.createEvent(
          faker.lorem.words(),
          futureStartTime,
          futureStartTime + faker.random.number(),
          0,
          faker.random.number(),
          testTokenName,
          { from: firstAccount }
        ),
        'Loketh: `_currency` is invalid.'
      );
    });

    it('adds new event to the events array', async () => {
      let totalEvents = await loketh.totalEvents();

      assert.equal(totalEvents, 0);

      await loketh.createEvent(
        faker.lorem.words(),
        futureStartTime,
        futureStartTime + faker.random.number(),
        0,
        faker.random.number(),
        NATIVE_CURRENCY,
        { from: firstAccount }
      );

      totalEvents = await loketh.totalEvents();

      assert.equal(totalEvents, 1);
      assert.notEqual(totalEvents, 0);
    });

    it('adds new event to the list of events owned by organizer', async () => {
      let eventsOwned = await loketh.eventsOf(firstAccount);

      assert.equal(eventsOwned, 0);

      await loketh.createEvent(
        faker.lorem.words(),
        futureStartTime,
        futureStartTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        NATIVE_CURRENCY,
        { from: firstAccount }
      );

      eventsOwned = await loketh.eventsOf(firstAccount);

      assert.equal(eventsOwned, 1);
      assert.notEqual(eventsOwned, 0);
    });

    it('creates a new event and emits `EventCreated` event', async () => {
      let receipt = await loketh.createEvent(
        faker.lorem.words(),
        futureStartTime,
        futureStartTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        NATIVE_CURRENCY,
        { from: firstAccount }
      );

      expectEvent(receipt, 'EventCreated', {
        newEventId: new BN(1),
        organizer: firstAccount
      });

      await loketh.addNewToken(
        testTokenName, testToken.address, { from: firstAccount }
      );

      receipt = await loketh.createEvent(
        faker.lorem.words(),
        futureStartTime,
        futureStartTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        testTokenName,
        { from: firstAccount }
      );

      expectEvent(receipt, 'EventCreated', {
        newEventId: new BN(2),
        organizer: firstAccount
      });
    });
  });

  describe('eventsOfOwner', () => {
    it('returns an empty array if given address has zero events', async () => {
      assert.deepEqual(await loketh.eventsOfOwner(otherAccount), []);
    });

    it('returns a list of event IDs owned by given address', async () => {
      // Add one, only to make sure zero never assigned.
      const numberOfEvents = faker.random.number(4) + 1;
      const eventIds = [];

      for (let i = 0; i < numberOfEvents; i++) {
        const assignToSecondAccount = faker.random.boolean();
        const from = assignToSecondAccount ? secondAccount : firstAccount;
        const startTime = latestTime + faker.random.number();

        await loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          faker.random.number(),
          faker.random.number(),
          NATIVE_CURRENCY,
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
        loketh.getEvent(0),
        'Loketh: event ID must be at least one.'
      );
    });

    it('reverts when given event ID is greater than events length', async () => {
      // Add one, only to make sure zero never assigned.
      const numberOfEvents = faker.random.number(4) + 1;

      for (let i = 0; i < numberOfEvents; i++) {
        const startTime = latestTime + faker.random.number();

        await loketh.createEvent(
          faker.lorem.words(),
          startTime,
          startTime + faker.random.number(),
          faker.random.number(),
          faker.random.number(),
          NATIVE_CURRENCY,
          { from: otherAccount }
        );
      }

      await expectRevert(
        loketh.getEvent(numberOfEvents + 1),
        'Loketh: event ID must be lower than `_events` length.'
      );
    });

    it('returns event information by given id', async () => {
      const startTime = latestTime + faker.random.number();

      // First event...
      const firstEventName = faker.lorem.words();
      await loketh.createEvent(
        firstEventName,
        startTime,
        startTime + faker.random.number(),
        faker.random.number(),
        faker.random.number(),
        NATIVE_CURRENCY,
        { from: otherAccount }
      );

      // Second event...
      await loketh.addNewToken(
        testTokenName, testToken.address, { from: firstAccount }
      );

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
        testTokenName,
        { from: otherAccount }
      );

      const secondEvent = await loketh.getEvent(2);

      assert.notEqual(secondEvent['0'], firstEventName);
      assert.equal(secondEvent['0'], secondEventName);
      assert.equal(secondEvent['1'], otherAccount);
      assert.equal(secondEvent['2'], startTime);
      assert.equal(secondEvent['3'], endTime);
      assert.equal(secondEvent['4'], price);
      assert.equal(secondEvent['5'], quota);
      assert.equal(secondEvent['6'], 0);
      assert.equal(secondEvent['7'], 0);
      assert.equal(secondEvent['8'], testTokenName);
      assert.notEqual(secondEvent['8'], NATIVE_CURRENCY);
    });
  });

  // describe('organizerOwnsEvent', () => {
  //   // Event ID created by `firstAccount`.
  //   const eventId = 1;

  //   beforeEach(async () => {
  //     const startTime = latestTime + faker.random.number();

  //     await loketh.createEvent(
  //       faker.lorem.words(),
  //       startTime,
  //       startTime + faker.random.number(),
  //       faker.random.number(),
  //       faker.random.number(),
  //       { from: firstAccount }
  //     );
  //   });

  //   it('reverts when given event ID is less than one', async () => {
  //     await expectRevert(
  //       loketh.organizerOwnsEvent(firstAccount, 0, { from: firstAccount }),
  //       'Loketh: event ID must be at least one.'
  //     );
  //   });

  //   it('reverts when given event ID is greater than events length', async () => {
  //     await expectRevert(
  //       loketh.organizerOwnsEvent(
  //         firstAccount, eventId + 1, { from: firstAccount }
  //       ),
  //       'Loketh: event ID must be lower than `_events` length.'
  //     );
  //   });

  //   it('returns `false` if owner did not have the event', async () => {
  //     const result = await loketh.organizerOwnsEvent(
  //       secondAccount, eventId, { from: firstAccount }
  //     );

  //     assert.isNotTrue(result);
  //   });

  //   it('returns `true` if owner did have the event', async () => {
  //     const result = await loketh.organizerOwnsEvent(
  //       firstAccount, eventId, { from: firstAccount }
  //     );

  //     assert.isTrue(result);
  //   });
  // });

  // describe('participantHasTicket', () => {
  //   // Event ID created by `firstAccount`.
  //   const eventId = 1;

  //   let price;

  //   beforeEach(async () => {
  //     price = faker.random.number();

  //     const startTime = latestTime + faker.random.number();

  //     await loketh.createEvent(
  //       faker.lorem.words(),
  //       startTime,
  //       startTime + faker.random.number(),
  //       price,
  //       faker.random.number(),
  //       { from: firstAccount }
  //     );
  //   });

  //   it('reverts when given event ID is less than one', async () => {
  //     await expectRevert(
  //       loketh.participantHasTicket(secondAccount, 0, { from: secondAccount }),
  //       'Loketh: event ID must be at least one.'
  //     );
  //   });

  //   it('reverts when given event ID is greater than events length', async () => {
  //     await expectRevert(
  //       loketh.participantHasTicket(
  //         secondAccount, eventId + 1, { from: secondAccount }
  //       ),
  //       'Loketh: event ID must be lower than `_events` length.'
  //     );
  //   });

  //   it('returns `false` if participant did not have the ticket', async () => {
  //     const result = await loketh.participantHasTicket(
  //       secondAccount, eventId, { from: secondAccount }
  //     );

  //     assert.isNotTrue(result);
  //   });

  //   it('returns `true` if participant did have the ticket', async () => {
  //     await loketh.buyTicket(eventId, { from: secondAccount, value: price });

  //     const result = await loketh.participantHasTicket(
  //       secondAccount, eventId, { from: secondAccount }
  //     );

  //     assert.isTrue(result);
  //   });
  // });

  // describe('ticketsOfOwner', () => {
  //   it('returns an empty array if given address has zero tickets', async () => {
  //     assert.deepEqual(await loketh.ticketsOfOwner(otherAccount), []);
  //   });

  //   it('returns a list of ticket (event) IDs owned by given address', async () => {
  //     // Add one, only to make sure zero never assigned.
  //     const numberOfTickets = faker.random.number(4) + 1;
  //     const eventIds = [];

  //     for (let i = 1; i <= numberOfTickets; i++) {
  //       const assignToSecondAccount = faker.random.boolean();
  //       const startTime = latestTime + faker.random.number();
  //       const price = faker.random.number();

  //       await loketh.createEvent(
  //         faker.lorem.words(),
  //         startTime,
  //         startTime + faker.random.number(),
  //         price,
  //         faker.random.number(),
  //         { from: firstAccount }
  //       );

  //       if (assignToSecondAccount) {
  //         const totalEvents = await loketh.totalEvents();

  //         await loketh.buyTicket(
  //           totalEvents, { from: secondAccount, value: price }
  //         );

  //         eventIds.push(totalEvents);
  //       }
  //     }

  //     const secondAccountEventIds = await loketh.ticketsOfOwner(secondAccount);

  //     assert.deepEqual(secondAccountEventIds, eventIds);
  //   });
  // });

  // describe('totalEvents', () => {
  //   it('starts at zero', async () => {
  //     const totalEvents = await loketh.totalEvents();

  //     assert.equal(totalEvents, 0);
  //   });

  //   it('increments when a new event created', async () => {
  //     const startTime = latestTime + faker.random.number();

  //     assert.equal(await loketh.totalEvents(), 0);

  //     await loketh.createEvent(
  //       faker.lorem.words(),
  //       startTime,
  //       startTime + faker.random.number(),
  //       faker.random.number(),
  //       faker.random.number()
  //     );

  //     assert.equal(await loketh.totalEvents(), 1);
  //   });
  // });

  // describe('withdrawMoney', () => {
  //   // Event ID created by `firstAccount`.
  //   const eventId = 1;

  //   let price, endTime;

  //   beforeEach(async () => {
  //     price = web3.utils.toWei('1', 'ether');

  //     const startTime = latestTime + faker.random.number();
  //     endTime = startTime + faker.random.number();

  //     await loketh.createEvent(
  //       faker.lorem.words(),
  //       startTime,
  //       endTime,
  //       price,
  //       faker.random.number(),
  //       { from: firstAccount }
  //     );
  //   });

  //   it('reverts when given event ID is less than one', async () => {
  //     await expectRevert(
  //       loketh.withdrawMoney(0, { from: firstAccount }),
  //       'Loketh: event ID must be at least one.'
  //     );
  //   });

  //   it('reverts when given event ID is greater than events length', async () => {
  //     await expectRevert(
  //       loketh.withdrawMoney(eventId + 1, { from: firstAccount }),
  //       'Loketh: event ID must be lower than `_events` length.'
  //     );
  //   });

  //   it('reverts when sender is not the event owner', async () => {
  //     await expectRevert(
  //       loketh.withdrawMoney(eventId, { from: secondAccount }),
  //       'Loketh: Sender is not the event owner.'
  //     );
  //   });

  //   it('reverts when sender withdraw money before the event ends', async () => {
  //     await expectRevert(
  //       loketh.withdrawMoney(eventId, { from: firstAccount }),
  //       'Loketh: Money only can be withdrawn after the event ends.'
  //     );
  //   });

  //   it('reverts when there are no money left in the jar', async () => {
  //     await time.increaseTo(endTime + faker.random.number());

  //     await expectRevert(
  //       loketh.withdrawMoney(eventId, { from: firstAccount }),
  //       'Loketh: There are no money left to be transferred.'
  //     );
  //   });

  //   it('resets the money jar when withdrawing', async () => {
  //     await loketh.buyTicket(eventId, { from: secondAccount, value: price });
  //     await loketh.buyTicket(eventId, { from: otherAccount, value: price });

  //     let event = await loketh.getEvent(eventId);

  //     const prevMoneyCollected = event['7'];

  //     assert.equal(prevMoneyCollected, (price * 2));

  //     await time.increaseTo(endTime + faker.random.number());

  //     await loketh.withdrawMoney(eventId, { from: firstAccount });

  //     event = await loketh.getEvent(eventId);

  //     assert.equal(event['7'], 0);
  //     assert.notEqual(event['7'], prevMoneyCollected);
  //   });

  //   it('transfers money to the event owner', async () => {
  //     const prevBalance = await balance.current(firstAccount);

  //     await loketh.buyTicket(eventId, { from: secondAccount, value: price });
  //     await loketh.buyTicket(eventId, { from: otherAccount, value: price });

  //     await time.increaseTo(endTime + faker.random.number());

  //     await loketh.withdrawMoney(eventId, { from: firstAccount });

  //     const currentBalance = await balance.current(firstAccount);

  //     assert.isTrue(currentBalance.gt(prevBalance));
  //     assert.isNotTrue(currentBalance.eq(prevBalance));
  //   });

  //   it('subtracts the money from contract\'s balance to event owner', async () => {
  //     await loketh.buyTicket(eventId, { from: secondAccount, value: price });
  //     await loketh.buyTicket(eventId, { from: otherAccount, value: price });

  //     const prevBalance = await balance.current(loketh.address);

  //     assert.isTrue(prevBalance.eq(new BN(web3.utils.toWei('2', 'ether'))));

  //     await time.increaseTo(endTime + faker.random.number());

  //     await loketh.withdrawMoney(eventId, { from: firstAccount });

  //     const newBalance = await balance.current(loketh.address);

  //     assert.isNotTrue(newBalance.eq(new BN(web3.utils.toWei('2', 'ether'))));
  //     assert.isTrue(newBalance.lt(prevBalance));
  //     assert.isTrue(newBalance.eq(new BN(0)));
  //   });

  //   it('emits `MoneyWithdrawn` after successfully withdrawn', async () => {
  //     await loketh.buyTicket(eventId, { from: secondAccount, value: price });
  //     await loketh.buyTicket(eventId, { from: otherAccount, value: price });

  //     await time.increaseTo(endTime + faker.random.number());

  //     const receipt = await loketh.withdrawMoney(eventId, { from: firstAccount });

  //     await expectEvent(receipt, 'MoneyWithdrawn', {
  //       eventId: new BN(eventId),
  //       recipient: firstAccount,
  //       amount: (new BN(price)).mul(new BN(2))
  //     });
  //   });
  // });

  // describe('eventsOf', () => {
  //   it('returns total number of events owned by given address', async () => {
  //     // Add one, only to make sure zero never assigned.
  //     const numberOfEvents = faker.random.number(4) + 1;

  //     for (let i = 0; i < numberOfEvents; i++) {
  //       const startTime = latestTime + faker.random.number();

  //       await loketh.createEvent(
  //         faker.lorem.words(),
  //         startTime,
  //         startTime + faker.random.number(),
  //         faker.random.number(),
  //         faker.random.number(),
  //         { from: secondAccount }
  //       );
  //     }

  //     assert.equal(await loketh.eventsOf(firstAccount), 0);
  //     assert.equal(await loketh.eventsOf(secondAccount), numberOfEvents);
  //   });
  // });

  // describe('ticketsOf', () => {
  //   it('returns total number of tickets owned by given address', async () => {
  //     // Add one, only to make sure zero never assigned.
  //     const numberOfTickets = faker.random.number(4) + 1;

  //     for (let i = 1; i <= numberOfTickets; i++) {
  //       const startTime = latestTime + faker.random.number();
  //       const price = faker.random.number();

  //       await loketh.createEvent(
  //         faker.lorem.words(),
  //         startTime,
  //         startTime + faker.random.number(),
  //         price,
  //         faker.random.number(),
  //         { from: firstAccount }
  //       );

  //       await loketh.buyTicket(i, { from: secondAccount, value: price });
  //     }

  //     assert.equal(await loketh.ticketsOf(firstAccount), 0);
  //     assert.equal(await loketh.ticketsOf(secondAccount), numberOfTickets);
  //   });
  // });

  // describe('totalSupportedTokens', () => {
  //   it('returns the total number of supported tokens', async () => {
  //     let totalSupportedTokens = await loketh.totalSupportedTokens();
  //     assert.equal(totalSupportedTokens, 0);

  //     const startTime = latestTime + faker.random.number();

  //     await loketh.createEvent(
  //       faker.lorem.words(),
  //       startTime,
  //       startTime + faker.random.number(),
  //       faker.random.number(),
  //       faker.random.number(),
  //       { from: otherAccount }
  //     );

  //     await loketh.addNewToken(testTokenName, testToken.address, { from: otherAccount });

  //     totalSupportedTokens = await loketh.totalSupportedTokens();
  //     assert.equal(totalSupportedTokens, 1);
  //   });
  // });
});
