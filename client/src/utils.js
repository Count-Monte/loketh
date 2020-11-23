import { unix as epoch } from 'moment';

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

export function getShortAddress(address) {
  return `${address.substr(0, 6)}...${address.substr(-4)}`;
}

export function strLimit(str, limit = 20) {
  if (str.length > limit) {
    return `${str.substr(0, limit)}...`;
  }

  return str;
}
