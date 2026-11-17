# Frontend Phase 6 / product TODOs

- Home `postalAddressPart`: distinguish an intentionally absent street/building
  from a user accidentally forgetting to enter it. Keep the field optional because
  some valid addresses have no street/building. Consider an explicit
  "no street/building" confirmation. This is a future UX decision; Phase 5H does
  not implement it.
- Review `HomeMainService.checkHomeName()` and
  `HomeMainService.checkPossibilityToBlockHome()`. Phase 5H found no callers or
  tests, but retained both methods because the shared Home service interface
  declares them and shared table/detail components consume that interface.
  Decide their contract status before removing frontend declarations or methods;
  backend endpoints are outside this cleanup.
