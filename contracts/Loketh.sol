// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

/// @title The main contract of Loketh Event Ticketing System.
/// @author Roni Yusuf (https://rymanalu.github.io/)
contract Loketh is Context, Ownable {
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

        // Type of currency for payment.
        string currency;
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

    /// @dev The name of native currency in Loketh: Ether.
    string constant public nativeCurrency = "ETH";

    /// @dev An array of supported token names.
    ///  This is related with `supportedTokens`.
    string[] public supportedTokenNames;

    /// @dev A mapping of token name and the address,
    ///  that supported for payment.
    mapping(string => address) public supportedTokens;

    /// @dev A mapping of event ID to total money collected from buyer.
    ///  Loketh changes the event balance when someone buy a ticket or
    ///  organizer withdraws the money.
    mapping(uint => uint) private _moneyJar;

    /// @dev Validate given event ID. Used when getting an event.
    /// @param _eventId The event id.
    modifier validEventId(uint _eventId) {
        require(_eventId > 0, "Loketh: event ID must be at least one.");
        require(
            _eventId < _events.length,
            "Loketh: event ID must be lower than `_events` length."
        );
        _;
    }

    /// @dev Emitted when new event created.
    event EventCreated(uint indexed newEventId, address indexed organizer);

    /// @dev Emitted when someone buy a ticket.
    event TicketIssued(uint indexed eventId, address indexed participant);

    /// @dev Emitted when organizer withdrawn money from the money jar.
    event MoneyWithdrawn(uint indexed eventId, address indexed recipient, uint amount);

    /// @dev Emitted when new token added.
    event TokenAdded(
        string indexed tokenName,
        address indexed tokenAddress,
        address indexed addedBy
    );

    /// @dev Emitted when token allowance for payment approved.
    event TokenApproved(
        uint indexed eventId,
        address indexed owner,
        string tokenName,
        uint amount
    );

    /// @dev Initializes contract and create the event zero to its address.
    constructor() {
        _createEvent(
            "Genesis",
            address(this),
            block.timestamp,
            block.timestamp,
            1 wei,
            0,
            nativeCurrency
        );
    }

    /// @notice Add a new supported token for payment.
    /// @param _tokenName The token name.
    /// @param _tokenAddress The token address where it is deployed.
    function addNewToken(string memory _tokenName, address _tokenAddress)
        external
        onlyOwner
    {
        require(
            _tokenAddress != address(0),
            "Loketh: Given address is not a valid address."
        );
        require(
            supportedTokens[_tokenName] == address(0),
            "Loketh: Token is already registered."
        );

        supportedTokens[_tokenName] = _tokenAddress;
        supportedTokenNames.push(_tokenName);

        emit TokenAdded(_tokenName, _tokenAddress, _msgSender());
    }

    /// @notice Allows Loketh to withdraw from your account for payment.
    /// @param _eventId The event ID.
    function approveToken(uint _eventId) external validEventId(_eventId) {
        Event memory e = _events[_eventId];

        require(
            _usingToken(e.currency),
            "Loketh: Only payment by ERC-20 token for approving."
        );

        IERC20 token = IERC20(supportedTokens[e.currency]);

        bool success = token.approve(address(this), e.price);

        require(success, "Loketh: Failed to approve token.");

        emit TokenApproved(_eventId, _msgSender(), e.currency, e.price);
    }

    /// @notice Let's buy a ticket!
    /// @param _eventId The event ID.
    function buyTicket(uint _eventId) external payable validEventId(_eventId) {
        Event memory e = _events[_eventId];
        address participant = _msgSender();
        bool payWithToken = _usingToken(e.currency);

        IERC20 token;
        if (payWithToken) {
            token = IERC20(supportedTokens[e.currency]);
        }

        require(
            participant != e.organizer,
            "Loketh: Organizer can not buy their own event."
        );

        if (payWithToken) {
            uint balance = token.balanceOf(participant);

            require(
                balance >= e.price,
                "Loketh: Not enough balance to pay."
            );
        } else {
            require(
                msg.value == e.price,
                "Loketh: Must pay exactly same with the price."
            );
        }

        require(
            _eventParticipants[_eventId].contains(participant) == false,
            "Loketh: Participant already bought the ticket."
        );
        require(
            _eventParticipants[_eventId].length() < e.quota,
            "Loketh: No quota left."
        );
        require(
            block.timestamp < e.endTime,
            "Loketh: Can not buy ticket from an event that already ended."
        );

        if (payWithToken) {
            bool transferSucceed = token.transferFrom(
                participant, address(this), e.price
            );

            require(transferSucceed, "Loketh: Transfer token failed.");
        }

        _moneyJar[_eventId] = _moneyJar[_eventId].add(e.price);

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
        uint _quota,
        string calldata _currency
    )
        external
        returns (uint)
    {
        require(_quota > 0, "Loketh: `_quota` must be at least one.");
        require(
            _startTime > block.timestamp,
            "Loketh: `_startTime` must be greater than `block.timestamp`."
        );
        require(
            _endTime > _startTime,
            "Loketh: `_endTime` must be greater than `_startTime`."
        );
        require(
            (
                _usingEther(_currency) ||
                supportedTokens[_currency] != address(0)
            ),
            "Loketh: `_currency` is invalid."
        );

        uint newEventId = _createEvent(
            _name,
            _msgSender(),
            _startTime,
            _endTime,
            _price,
            _quota,
            _currency
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
            uint,
            string memory
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
            moneyCollected,
            e.currency
        );
    }

    /// @dev Checking if given organizer owns the given ticket.
    /// @param _organizer The address to check.
    /// @param _eventId The event ID to check.
    function organizerOwnsEvent(address _organizer, uint _eventId)
        external
        view
        validEventId(_eventId)
        returns (bool)
    {
        return _organizerToEventIdsOwned[_organizer].contains(_eventId);
    }

    /// @dev Checking if given participant is already has given ticket.
    /// @param _participant The address to check.
    /// @param _eventId The ticket ID to check.
    function participantHasTicket(address _participant, uint _eventId)
        external
        view
        validEventId(_eventId)
        returns (bool)
    {
        return _participantToEventIdsOwned[_participant].contains(_eventId);
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

    /// @notice Let's withdraw the money from event ticket sale!
    /// @param _eventId The event ID we are going to withdraw from.
    function withdrawMoney(uint _eventId) external validEventId(_eventId) {
        address payable sender = _msgSender();

        Event memory e = _events[_eventId];

        require(
            sender == e.organizer,
            "Loketh: Sender is not the event owner."
        );
        require(
            block.timestamp > e.endTime,
            "Loketh: Money only can be withdrawn after the event ends."
        );

        uint amount = _moneyJar[_eventId];

        _moneyJar[_eventId] = 0;

        if (_usingEther(e.currency)) {
            sender.transfer(amount);
        } else {
            IERC20 token = IERC20(supportedTokens[e.currency]);

            token.transfer(sender, amount);
        }

        emit MoneyWithdrawn(_eventId, sender, amount);
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

    /// @return The total number of supported tokens in Loketh.
    function totalSupportedTokens() public view returns (uint) {
        return supportedTokenNames.length;
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
        uint _quota,
        string memory _currency
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
            quota: _quota,
            currency: _currency
        });

        _events.push(_event);

        uint newEventId = _events.length - 1;

        _organizerToEventIdsOwned[_organizer].add(newEventId);

        emit EventCreated(newEventId, _organizer);

        return newEventId;
    }

    /// @dev Determine whether given currency is Ether.
    /// @param _currency The currency name.
    /// @return Returns if currency is Ether.
    function _usingEther(string memory _currency) private pure returns (bool) {
        return (
            keccak256(abi.encodePacked((nativeCurrency))) == keccak256(abi.encodePacked((_currency)))
        );
    }

    /// @dev Determine whether given currency is ERC-20 token.
    /// @param _currency The currency name.
    /// @return Returns if currency is an ERC-20 token.
    function _usingToken(string memory _currency) private pure returns (bool) {
        return !_usingEther(_currency);
    }
}
