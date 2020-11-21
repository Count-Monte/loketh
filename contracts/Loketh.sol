// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

/// @title The main contract of Loketh Event Ticketing Service.
/// @author Roni Yusuf (https://rymanalu.github.io/)
contract Loketh is Context {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeMath for uint;

    /// @dev The main Event struct. Every event in Loketh is
    ///  represented by a copy of this structure.
    struct Event {
        // Event name.
        string name;

        // Address of event owner.
        address organizer;

        // Timestamp as seconds since unix epoch.
        uint startTime;

        // Timestamp as seconds since unix epoch.
        // Should be bigger than `startTime`.
        uint endTime;

        // Event price in wei.
        uint price;

        // Number of maximum participants.
        uint quota;
    }

    /// @dev An array containing all events in Loketh.
    ///  The ID of each event is actually the index of the event in this array.
    ///  ID 0 (zero) is reserved for Genesis event, and should not be
    ///  accessible to end-user.
    Event[] private _events;

    /// @dev A mapping of organizer to a set of event IDs that they owned.
    mapping(address => EnumerableSet.UintSet) private _organizerToEventIdsOwned;

    /// @dev A mapping of event ID to its participants.
    mapping(uint => EnumerableSet.AddressSet) private _eventParticipants;

    /// @dev A mapping of event ticket holders to a set of event IDs
    ///  that they owned the ticket.
    mapping(address => EnumerableSet.UintSet) private _participantToEventIdsOwned;

    /// @dev A mapping of event ID to total money collected from buyer.
    ///  Loketh changes the event balance when someone buy a ticket or
    ///  organizer withdraws the money.
    mapping(uint => uint) private _moneyJar;

    /// @dev Validate given event ID. Used when getting an event.
    /// @param _eventId The event id.
    modifier validEventId(uint _eventId) {
        require(_eventId > 0, "Loketh: event ID must be at least 1");
        require(
            _eventId < _events.length,
            "Loketh: event ID must be lower than `_events` length"
        );
        _;
    }

    /// @dev Emitted when new event created.
    event EventCreated(uint indexed newEventId, address indexed organizer);

    /// @dev Emitted when someone buy a ticket.
    event TicketIssued(uint indexed eventId, address indexed participant);

    /// @dev Initializes contract and create the event zero to its address.
    constructor() public {
        _createEvent(
            "Genesis",
            address(this),
            block.timestamp,
            block.timestamp,
            1 wei,
            0
        );
    }

    /// @notice Let's buy a ticket!
    /// @param _eventId The event ID.
    function buyTicket(uint _eventId) external payable validEventId(_eventId) {
        Event memory e = _events[_eventId];
        address participant = _msgSender();

        require(
            participant != e.organizer,
            "Loketh: Organizer can not buy their own event."
        );
        require(
            msg.value == e.price,
            "Loketh: Must pay exactly same with the price."
        );
        require(
            _eventParticipants[_eventId].contains(participant) == false,
            "Loketh: Participant already bought the ticket."
        );
        require(
            _eventParticipants[_eventId].length() < e.quota,
            "Loketh: No quota left."
        );

        _moneyJar[_eventId] = _moneyJar[_eventId].add(msg.value);

        _buyTicket(_eventId, participant);
    }

    /// @notice Let's create a new event!
    /// @param _name The event name.
    /// @param _startTime The time when the event started.
    /// @param _endTime The time when the event ended.
    /// @param _price The ticket price in wei.
    /// @param _quota The maximum number of event participants.
    /// @return The new event ID.
    function createEvent(
        string calldata _name,
        uint _startTime,
        uint _endTime,
        uint _price,
        uint _quota
    )
        external
        returns (uint)
    {
        require(_quota > 0, "Loketh: `_quota` must be at least one");
        require(
            _startTime > block.timestamp,
            "Loketh: `_startTime` must be greater than `block.timestamp`"
        );
        require(
            _endTime > _startTime,
            "Loketh: `_endTime` must be greater than `_startTime`"
        );

        uint newEventId = _createEvent(
            _name,
            _msgSender(),
            _startTime,
            _endTime,
            _price,
            _quota
        );

        return newEventId;
    }

    /// @notice Returns a list of all event IDs assigned to an address.
    /// @param _address The event owner address.
    /// @return The event IDs.
    function eventsOfOwner(address _address)
        external
        view
        returns (uint[] memory)
    {
        uint eventsCount = eventsOf(_address);

        uint[] memory eventIds = new uint[](eventsCount);

        for (uint i = 0; i < eventsCount; i++) {
            eventIds[i] = _organizerToEventIdsOwned[_address].at(i);
        }

        return eventIds;
    }

    /// @notice Returns all relevant information about a spesific event.
    /// @dev Prevent users to access event ID 0 (zero).
    /// @param _id The event ID we are interested in.
    /// @return Members of `Event` struct.
    function getEvent(uint _id)
        external
        view
        validEventId(_id)
        returns (
            string memory,
            address,
            uint,
            uint,
            uint,
            uint,
            uint,
            uint
        )
    {
        Event memory e = _events[_id];
        uint soldCounter = _eventParticipants[_id].length();
        uint moneyCollected = _moneyJar[_id];

        return (
            e.name,
            e.organizer,
            e.startTime,
            e.endTime,
            e.price,
            e.quota,
            soldCounter,
            moneyCollected
        );
    }

    /// @notice Returns a list of all ticket (event) IDs assigned to an address.
    /// @param _address The ticket owner address.
    /// @return The ticket (event) IDs.
    function ticketsOfOwner(address _address)
        external
        view
        returns (uint[] memory)
    {
        uint ticketsCount = ticketsOf(_address);

        uint[] memory eventIds = new uint[](ticketsCount);

        for (uint i = 0; i < ticketsCount; i++) {
            eventIds[i] = _participantToEventIdsOwned[_address].at(i);
        }

        return eventIds;
    }

    /// @notice Returns the total number of events.
    /// @return Returns the total number of events, without the Genesis.
    function totalEvents() external view returns (uint) {
        return _events.length - 1;
    }

    /// @notice Returns total number of events owned by given address.
    /// @param _address The address to check.
    /// @return The total number of events.
    function eventsOf(address _address) public view returns (uint) {
        return _organizerToEventIdsOwned[_address].length();
    }

    /// @notice Returns total number of tickets owned by given address.
    /// @param _address The address to check.
    /// @return The total number of tickets.
    function ticketsOf(address _address) public view returns (uint) {
        return _participantToEventIdsOwned[_address].length();
    }

    /// @dev A private method that increments the counter, adds participants,
    ///  add the event ID to the participant, and emit the TicketIssued event.
    ///  This method doesn't do any checking and should only be called
    ///  when the input data is known to be valid.
    /// @param _eventId The event ID.
    /// @param _participant The event participant.
    function _buyTicket(uint _eventId, address _participant) private {
        _eventParticipants[_eventId].add(_participant);

        _participantToEventIdsOwned[_participant].add(_eventId);

        emit TicketIssued(_eventId, _participant);
    }

    /// @dev A private method that creates a new event and stores it.
    ///  This method doesn't do any checking and should only be called
    ///  when the input data is known to be valid.
    /// @param _name The event name.
    /// @param _organizer The event owner.
    /// @param _startTime The time when the event started.
    /// @param _endTime The time when the event ended.
    /// @param _price The ticket price in wei.
    /// @param _quota The maximum number of event participants.
    /// @return The new event ID.
    function _createEvent(
        string memory _name,
        address _organizer,
        uint _startTime,
        uint _endTime,
        uint _price,
        uint _quota
    )
        private
        returns (uint)
    {
        Event memory _event = Event({
            name: _name,
            organizer: _organizer,
            startTime: _startTime,
            endTime: _endTime,
            price: _price,
            quota: _quota
        });

        _events.push(_event);

        uint newEventId = _events.length - 1;

        _organizerToEventIdsOwned[_organizer].add(newEventId);

        emit EventCreated(newEventId, _organizer);

        return newEventId;
    }
}
