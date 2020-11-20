import { unix as epoch } from 'moment';

export function epochToEventDate(seconds) {
  return epoch(seconds).format('MMM D, YYYY');
}

export function getShortAddress(address) {
  return `${address.substr(0, 6)}...${address.substr(-4)}`;
}

export function strLimit(str, limit = 20) {
  if (str.length > limit) {
    return `${str.substr(0, limit)}...`;
  }

  return str;
}
