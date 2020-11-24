import { unix as epoch } from 'moment';
import Web3 from 'web3';

class Event {
  constructor(event, id) {
    this.event = event;
    this.id = id;
  }

  get name() {
    return this.event['0'];
  }

  get shortName() {
    return strLimit(this.name, 30);
  }

  get organizer() {
    return this.event['1'];
  }

  get shortOrganizer() {
    return getShortAddress(this.organizer);
  }

  get startTime() {
    return this.event['2'];
  }

  get startTimeDisplay() {
    const startTime = epoch(this.startTime);

    return startTime.format('D MMM YYYY H:m:s');
  }

  get endTime() {
    return this.event['3'];
  }

  get endTimeDisplay() {
    const endTime = epoch(this.endTime);

    return endTime.format('DD MMM YYYY HH:mm:ss');
  }

  get onlyOneDay() {
    return epoch(this.startTime).isSame(epoch(this.endTime), 'day');
  }

  get displayDate() {
    return this.onlyOneDay
      ? epochToEventDate(this.startTime)
      : [this.startTime, this.endTime].map(epochToEventDate).join(' - ');
  }

  get price() {
    return this.event['4'];
  }

  get priceInEth() {
    return fromWei(this.price);
  }

  get quota() {
    return this.event['5'];
  }

  get soldCounter() {
    return this.event['6'];
  }

  get moneyCollected() {
    return this.event['7'];
  }
}

export function arrayChunk(array, chunk = 10) {
  let i, j;
  const result = [];

  for (i = 0, j = array.length; i < j; i += chunk) {
    result.push(array.slice(i, i + chunk));
  }

  return result;
}

export function epochToEventDate(seconds) {
  return epoch(seconds).format('MMM D, YYYY');
}

export function fromWei(number, unit = 'ether', digits = 4) {
  return parseFloat(Web3.utils.fromWei(number, unit)).toFixed(digits);
}

export function getShortAddress(address) {
  return `${address.substr(0, 6)}...${address.substr(-4)}`;
}

export function toEvent(event, id = 0) {
  return new Event(event, id);
}

export function strLimit(str, limit = 20) {
  if (str.length > limit) {
    return `${str.substr(0, limit)}...`;
  }

  return str;
}
