const key = "collab-dealer-token";

export function dealerToken() {
  return sessionStorage.getItem(key) ?? "";
}

export function setDealerToken(token: string) {
  sessionStorage.setItem(key, token);
}

export function clearDealerToken() {
  sessionStorage.removeItem(key);
  window.dispatchEvent(new Event("dealer-logout"));
}
