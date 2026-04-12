import "@testing-library/jest-dom";
import { server } from "./msw/server";

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.scrollTo) {
  window.scrollTo = () => {};
}

if (!window.open) {
  window.open = () => null;
}

window.alert = () => {};

if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => "blob:mock";
}

if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
